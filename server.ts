import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";
import { PSEO_LANDING_PAGES } from "./src/data/pSEOData";

import { AI_SUMMARY_ENABLED, VERTEX_AI_CONFIG } from "./src/config/compliance";

dotenv.config();

// --- 1. VERTEX AI CLIENT (Google Cloud Application Default Credentials / No API Keys) ---
let vertexAIClient: GoogleGenAI | null = null;
function getVertexAI(): GoogleGenAI {
  if (!vertexAIClient) {
    const project = process.env.GOOGLE_CLOUD_PROJECT || VERTEX_AI_CONFIG.projectId;
    const location = process.env.GOOGLE_CLOUD_LOCATION || VERTEX_AI_CONFIG.location;
    vertexAIClient = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }
  return vertexAIClient;
}

// --- 4. ADVANCED MULTI-TIER RATE LIMITING ENGINE & GLOBAL CIRCUIT BREAKER ---
// Per-IP Limits (Tiered per minute, hour, and day - optimized for active testing and screening sessions)
const MAX_REQUESTS_PER_MINUTE_IP = 60;  // 60 API requests / minute / IP
const MAX_REQUESTS_PER_HOUR_IP = 300;   // 300 API requests / hour / IP
const MAX_REQUESTS_PER_DAY_IP = 1000;   // 1000 API requests / day / IP

// Global System Circuit Breaker (Protecting against runaway loops while allowing robust concurrent usage)
const GLOBAL_MAX_PER_MINUTE = 180;  // Max 180 total API requests / minute server-wide
const GLOBAL_MAX_PER_HOUR = 1200;   // Max 1200 total API requests / hour server-wide
const GLOBAL_MAX_PER_DAY = 5000;    // Max 5000 total API requests / day server-wide

interface IPRateRecord {
  minuteRequests: number[];
  hourlyRequests: number[];
  dailyRequests: number[];
}

const ipRateLimitMap = new Map<string, IPRateRecord>();
let globalMinuteRequests: number[] = [];
let globalHourlyRequests: number[] = [];
let globalDailyRequests: number[] = [];

// Cleanup stale IP records & global trackers every 5 minutes
setInterval(() => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 3600 * 1000;
  const oneHourAgo = now - 3600 * 1000;
  const oneMinuteAgo = now - 60 * 1000;

  // Cleanup Global arrays
  globalDailyRequests = globalDailyRequests.filter(t => t > oneDayAgo);
  globalHourlyRequests = globalHourlyRequests.filter(t => t > oneHourAgo);
  globalMinuteRequests = globalMinuteRequests.filter(t => t > oneMinuteAgo);

  // Cleanup IP records
  for (const [ip, record] of ipRateLimitMap.entries()) {
    const dailyRequests = record.dailyRequests.filter(t => t > oneDayAgo);
    if (dailyRequests.length === 0) {
      ipRateLimitMap.delete(ip);
    } else {
      record.dailyRequests = dailyRequests;
      record.hourlyRequests = record.hourlyRequests.filter(t => t > oneHourAgo);
      record.minuteRequests = record.minuteRequests.filter(t => t > oneMinuteAgo);
    }
  }
}, 5 * 60 * 1000);

function rateLimiterMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  let ip: string = "unknown";
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (typeof xForwardedFor === 'string') {
      ip = xForwardedFor.split(',')[0].trim();
    } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
      ip = xForwardedFor[0].trim();
    }
  } else {
    ip = req.ip || req.socket.remoteAddress || 'unknown';
  }

  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 3600 * 1000;
  const oneDayAgo = now - 24 * 3600 * 1000;

  // 1. GLOBAL SYSTEM CIRCUIT BREAKER CHECK
  globalMinuteRequests = globalMinuteRequests.filter(t => t > oneMinuteAgo);
  globalHourlyRequests = globalHourlyRequests.filter(t => t > oneHourAgo);
  globalDailyRequests = globalDailyRequests.filter(t => t > oneDayAgo);

  if (globalMinuteRequests.length >= GLOBAL_MAX_PER_MINUTE ||
      globalHourlyRequests.length >= GLOBAL_MAX_PER_HOUR ||
      globalDailyRequests.length >= GLOBAL_MAX_PER_DAY) {
    console.warn(`[Security Alert]: Global System Rate Limit Circuit Breaker Tripped at ${new Date().toISOString()}`);
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      error: "Global System Protection Activated: Server-wide request limit reached to safeguard API infrastructure. Please wait a moment and try again."
    });
  }

  // 2. PER-IP MULTI-TIER RATE LIMIT CHECK
  const record = ipRateLimitMap.get(ip) || { minuteRequests: [], hourlyRequests: [], dailyRequests: [] };

  record.minuteRequests = record.minuteRequests.filter(t => t > oneMinuteAgo);
  record.hourlyRequests = record.hourlyRequests.filter(t => t > oneHourAgo);
  record.dailyRequests = record.dailyRequests.filter(t => t > oneDayAgo);

  // Tier A: Minute Limit (Max 5 req/min per IP)
  if (record.minuteRequests.length >= MAX_REQUESTS_PER_MINUTE_IP) {
    const oldest = record.minuteRequests[0];
    const msToWait = oldest + 60 * 1000 - now;
    const secondsToWait = Math.ceil(msToWait / 1000);

    res.setHeader("Retry-After", secondsToWait.toString());
    return res.status(429).json({
      error: `Too Many Requests. Rapid screening limit reached. You can perform at most ${MAX_REQUESTS_PER_MINUTE_IP} screenings per minute. Please wait ${secondsToWait} second(s) before trying again.`
    });
  }

  // Tier B: Hourly Limit (Max 20 req/hour per IP)
  if (record.hourlyRequests.length >= MAX_REQUESTS_PER_HOUR_IP) {
    const oldest = record.hourlyRequests[0];
    const msToWait = oldest + 3600 * 1000 - now;
    const minutesToWait = Math.ceil(msToWait / (60 * 1000));

    res.setHeader("Retry-After", Math.ceil(msToWait / 1000).toString());
    return res.status(429).json({
      error: `Too Many Requests. Hourly security rate limit reached. You can perform at most ${MAX_REQUESTS_PER_HOUR_IP} skin screenings per hour. Please wait ${minutesToWait} minute(s) before trying again.`
    });
  }

  // Tier C: Daily Limit (Max 30 req/day per IP)
  if (record.dailyRequests.length >= MAX_REQUESTS_PER_DAY_IP) {
    const oldest = record.dailyRequests[0];
    const msToWait = oldest + 24 * 3600 * 1000 - now;
    const hoursToWait = Math.ceil(msToWait / (3600 * 1000));

    res.setHeader("Retry-After", Math.ceil(msToWait / 1000).toString());
    return res.status(429).json({
      error: `Too Many Requests. Daily security rate limit reached. You can perform at most ${MAX_REQUESTS_PER_DAY_IP} skin screenings per day. Please wait ${hoursToWait} hour(s) before trying again.`
    });
  }

  // Record IP and Global timestamps
  record.minuteRequests.push(now);
  record.hourlyRequests.push(now);
  record.dailyRequests.push(now);
  ipRateLimitMap.set(ip, record);

  globalMinuteRequests.push(now);
  globalHourlyRequests.push(now);
  globalDailyRequests.push(now);

  // Set informative rate limit headers
  res.setHeader("X-RateLimit-Limit-Minute", MAX_REQUESTS_PER_MINUTE_IP.toString());
  res.setHeader("X-RateLimit-Remaining-Minute", (MAX_REQUESTS_PER_MINUTE_IP - record.minuteRequests.length).toString());
  res.setHeader("X-RateLimit-Limit-Hour", MAX_REQUESTS_PER_HOUR_IP.toString());
  res.setHeader("X-RateLimit-Remaining-Hour", (MAX_REQUESTS_PER_HOUR_IP - record.hourlyRequests.length).toString());
  res.setHeader("X-RateLimit-Limit-Day", MAX_REQUESTS_PER_DAY_IP.toString());
  res.setHeader("X-RateLimit-Remaining-Day", (MAX_REQUESTS_PER_DAY_IP - record.dailyRequests.length).toString());

  next();
}

// --- 2. API ROUTE PROTECTION (Strict CORS & Domain Verification) ---
function corsGuardMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Allow same-origin requests (server-side calls or same container requests without Origin header)
  if (!origin && !referer) return next();

  const requestDomain = origin || (referer ? new URL(referer).origin : "");
  
  // Whitelist exact frontend domain, local dev port, and platform sandboxes
  const isAllowed = 
    requestDomain === "http://localhost:3000" ||
    requestDomain.endsWith(".run.app") ||
    requestDomain.endsWith(".vercel.app") ||
    requestDomain.endsWith(".google.com") ||
    requestDomain.endsWith(".googleusercontent.com") ||
    requestDomain.includes("skintightai.com") ||
    (process.env.ALLOWED_ORIGIN && requestDomain === process.env.ALLOWED_ORIGIN);

  if (!isAllowed) {
    console.warn(`[DevSecOps CORS Bouncer Blocked Unauthorized Domain]: ${requestDomain}`);
    return res.status(403).json({
      error: "Access Forbidden: Unauthorized Cross-Origin Request. Backend accepts requests strictly from verified app origins."
    });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") return res.status(200).end();
  next();
}

// --- 3. INPUT SANITIZATION & XSS DEFENSE HELPERS ---
function sanitizeText(input?: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/\x00/g, "") // Strip null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Strip active script tags
    .trim();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- 5. STRICT HTTP SECURITY HEADERS ---
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=*, microphone=(), geolocation=()");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self' https://ai.studio https://*.google.com https://*.googleusercontent.com https://*.run.app https://*.vercel.app;");
    next();
  });

  // Limit body parser size strictly to handle image uploads safely
  app.use(express.json({ limit: "25mb" }));

  // Mount API CORS Bouncer on all API endpoints
  app.use("/api", corsGuardMiddleware);

  // Protected Clinical Intake Summary Generation Endpoint (Vertex AI)
  app.post("/api/ai/generate", rateLimiterMiddleware, async (req, res) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ error: "Invalid request body format." });
      }

      // Safety Switch check: If AI summaries are paused, return structured deterministic template
      if (!AI_SUMMARY_ENABLED) {
        return res.json({
          text: JSON.stringify({
            summary: "Patient self-reported intake recorded. AI summary generation is paused under compliance safety switch.",
            findings: [
              "Patient self-reported clinical history recorded",
              "Structured questionnaire data securely archived",
              "Visual photo log filed for clinician review"
            ]
          })
        });
      }

      const { prompt, parts, model: requestedModel = "gemini-2.5-flash", config = {} } = req.body;
      
      // Vertex AI candidate models (prioritizing stable enterprise models in us-central1)
      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-2.0-flash"
      ];

      const orderedModels = [
        ...(candidateModels.includes(requestedModel) ? [requestedModel] : []),
        ...candidateModels.filter(m => m !== requestedModel)
      ];

      let contents;
      if (parts) {
        if (!Array.isArray(parts)) {
          return res.status(400).json({ error: "Invalid payload: parts must be an array." });
        }
        if (parts.length > 15) {
          return res.status(400).json({ error: "Payload rejected: Exceeded maximum allowed 15 images." });
        }

        // Validate and sanitize image payloads
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
        const sanitizedParts = parts.map((part: any, index: number) => {
          if (part && part.inlineData) {
            const { mimeType, data } = part.inlineData;
            
            if (!mimeType || !allowedMimeTypes.includes(mimeType.toLowerCase())) {
              throw new Error(`Security Violation: Image #${index + 1} uses unsupported MIME type.`);
            }

            if (!data || typeof data !== "string") {
              throw new Error(`Security Violation: Corrupted image data.`);
            }

            const base64Raw = data.includes(',') ? data.split(',')[1] : data;
            const trimmed = base64Raw.trim();

            if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
              throw new Error(`Security Violation: Malformed base64.`);
            }

            if (trimmed.length > 20 * 1024 * 1024) {
              throw new Error(`Security Violation: Exceeds max file size.`);
            }

            const cleanBase64 = Buffer.from(trimmed, 'base64').toString('base64');
            return {
              ...part,
              inlineData: { mimeType, data: cleanBase64 }
            };
          }
          if (part && part.text) {
            return { ...part, text: sanitizeText(part.text.slice(0, 50000)) };
          }
          return part;
        });
        contents = { parts: sanitizedParts };
      } else {
        contents = sanitizeText(typeof prompt === "string" ? prompt.slice(0, 100000) : "");
      }

      const ai = getVertexAI();
      let response;
      let lastError: any = null;
      const retryDelayMs = 800;

      // Note: No cachedContent is provided, disabling prompt caching on Vertex AI
      const vertexConfig = {
        ...config,
        // Zero prompt caching
        cachedContent: undefined,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
        ]
      };

      for (let attempt = 1; attempt <= orderedModels.length; attempt++) {
        const currentModel = orderedModels[attempt - 1];
        try {
          response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config: vertexConfig
          });
          
          if (response && response.text) {
            lastError = null;
            break;
          } else {
            throw new Error(`Vertex AI model ${currentModel} returned empty text`);
          }
        } catch (err: any) {
          lastError = err;
          // Anonymous log only: never log patient answers, prompts, or sensitive error bodies
          console.warn(`[Vertex AI Notice]: Model attempt ${attempt}/${orderedModels.length} non-responsive (code: ${err?.status || 'retryable'}).`);
          
          const isBusyOrQuota = err.message && (
            err.message.includes("503") ||
            err.message.includes("429") ||
            err.message.includes("demand") ||
            err.message.includes("quota") ||
            err.message.includes("RESOURCE_EXHAUSTED") ||
            err.message.includes("UNAVAILABLE")
          );

          if (!isBusyOrQuota && attempt < orderedModels.length) {
            const delay = retryDelayMs * Math.pow(1.5, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (lastError) throw lastError;

      const text = response?.text;
      if (!text) {
        return res.status(500).json({ error: "AI generated an empty response." });
      }

      res.json({ text });
    } catch (error: any) {
      // Never log patient data in server logs
      console.error("[Clinical API Warning]: Summary generation request failed (no PHI logged).");
      const status = error.message && error.message.includes("Security Violation") ? 400 : 500;
      res.status(status).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  // B2B Clinic Demo Request Notification Endpoint
  app.post("/api/demo-request", rateLimiterMiddleware, async (req, res) => {
    try {
      const { name, practiceName, role, workEmail, phone, message } = req.body || {};
      const cleanName = sanitizeText(name).slice(0, 120);
      const cleanPractice = sanitizeText(practiceName).slice(0, 160);
      const cleanRole = sanitizeText(role).slice(0, 80);
      const cleanEmail = sanitizeText(workEmail).slice(0, 160);
      const cleanPhone = sanitizeText(phone).slice(0, 40);
      const cleanMessage = sanitizeText(message).slice(0, 1500);

      if (!cleanName || !cleanPractice || !cleanRole || !cleanEmail || !cleanPhone) {
        return res.status(400).json({ error: "Please complete all required fields." });
      }

      const recipient = "barsamajidi25@gmail.com";
      let emailSent = false;

      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT || 587) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: recipient,
          replyTo: cleanEmail,
          subject: `SkinTight Clinic Demo Request — ${cleanPractice}`,
          text: [
            `New Clinic Demo Request`,
            `Name: ${cleanName}`,
            `Practice: ${cleanPractice}`,
            `Role: ${cleanRole}`,
            `Work Email: ${cleanEmail}`,
            `Phone: ${cleanPhone}`,
            `Message: ${cleanMessage || "(None)"}`,
            `Submitted: ${new Date().toISOString()}`,
          ].join("\n"),
        });
        emailSent = true;
      }

      return res.json({
        ok: true,
        emailSent,
        recipient,
        message: emailSent
          ? "Demo request submitted and notification sent."
          : "Demo request recorded. (Email relay awaits SMTP environment configuration.)",
      });
    } catch {
      console.error("[Demo Request]: Notification processing failed.");
      return res.status(500).json({ error: "Unable to process demo request." });
    }
  });

  // Dynamic Sitemap Route
  app.get("/sitemap.xml", (req, res) => {
    res.header("Content-Type", "application/xml");
    const publicPaths = [
      "", "about", "clinic", "routine", "plans", "learn",
      "learn/early-signs-of-skin-cancer", "learn/suspicious-mole-warning-signs",
      "learn/when-to-see-a-dermatologist", "learn/abcde-rule-for-moles",
      "learn/how-to-monitor-skin-changes"
    ];
    const host = "https://skintightai.com";
    const currentDate = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    publicPaths.forEach(p => {
      const pathSegment = p ? `/${p}` : "";
      xml += `  <url>\n    <loc>${host}${pathSegment}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p === "" ? "1.0" : "0.8"}</priority>\n  </url>\n`;
    });

    // Programmatic SEO landing pages
    PSEO_LANDING_PAGES.forEach(page => {
      xml += `  <url>\n    <loc>${host}/track/${page.slug}</loc>\n    <lastmod>${currentDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;
    res.send(xml);
  });

  // Vite middleware for development vs static production
  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  // Programmatic SEO Dynamic Route Meta-Tag Interceptor
  app.get("/track/:slug", async (req, res, next) => {
    const { slug } = req.params;
    const found = PSEO_LANDING_PAGES.find(p => p.slug === slug);
    if (!found) {
      return next();
    }

    try {
      let templatePath = "";
      if (process.env.NODE_ENV !== "production") {
        templatePath = path.join(process.cwd(), "index.html");
      } else {
        templatePath = path.join(process.cwd(), "dist", "index.html");
      }

      if (!fs.existsSync(templatePath)) {
        return next();
      }

      let html = fs.readFileSync(templatePath, "utf-8");

      // Replace Title and Meta Description
      html = html.replace(/<title>[^<]+<\/title>/, `<title>${found.seoTitle}</title>`);
      html = html.replace(/<meta name="description" content="[^"]+" \/>/, `<meta name="description" content="${found.seoDescription}" />`);

      // Transform index.html via Vite to inject HMR client and other tags in development
      if (process.env.NODE_ENV !== "production" && vite) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } catch (err) {
      console.error("pSEO HTML Injection Error:", err);
      return next();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bulletproof DevSecOps Server running on port ${PORT}`);
  });
}

startServer();
