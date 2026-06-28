import { GoogleGenAI } from "@google/genai";

// --- 1. SECRET MANAGEMENT (Lazy Singleton) ---
let genAIClient = null;
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add your GEMINI_API_KEY in your server/Vercel environment variables.");
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build-devsecops' }
      }
    });
  }
  return genAIClient;
}

// --- 4. RATE LIMITING ENGINE (Serverless Sliding Window) ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests / min / IP
const serverlessIpMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = serverlessIpMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count++;
  }
  serverlessIpMap.set(ip, record);
  return {
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count),
    exceeded: record.count > MAX_REQUESTS_PER_WINDOW,
    retryAfter: Math.ceil((record.resetTime - now) / 1000)
  };
}

// --- 3. INPUT SANITIZATION HELPER ---
function sanitizeText(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/\x00/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();
}

export default async function handler(req, res) {
  // --- 5. STRICT HTTP SECURITY HEADERS ---
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=*, microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // --- 2. API ROUTE PROTECTION (Strict CORS & Domain Bouncer) ---
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const requestDomain = origin || (referer ? new URL(referer).origin : "");

  // Whitelist verified frontend domains
  const isAllowedDomain = 
    (!origin && !referer) || // same origin container call
    requestDomain === "http://localhost:3000" ||
    requestDomain.endsWith(".run.app") ||
    requestDomain.endsWith(".vercel.app") ||
    requestDomain.includes("skintightai.com") ||
    (process.env.ALLOWED_ORIGIN && requestDomain === process.env.ALLOWED_ORIGIN);

  if (!isAllowedDomain) {
    return res.status(403).json({
      error: "Access Forbidden: Unauthorized Cross-Origin Request. API rejects external scraper requests."
    });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Only POST accepted." });
  }

  // Enforce IP Rate Limiting
  const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "serverless-unknown";
  const rateStatus = checkRateLimit(clientIp);
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW.toString());
  res.setHeader("X-RateLimit-Remaining", rateStatus.remaining.toString());

  if (rateStatus.exceeded) {
    res.setHeader("Retry-After", rateStatus.retryAfter.toString());
    return res.status(429).json({
      error: "Too Many Requests. Rate limit exceeded. Please wait 60 seconds before submitting new scans."
    });
  }

  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid request payload." });
    }

    const { prompt, parts, model = "gemini-3.5-flash", config = {} } = req.body;
    
    let mappedModel = model;
    if (model === "gemini-3-flash-preview" || !model) {
      mappedModel = "gemini-3.5-flash";
    }

    let contents;
    if (parts) {
      if (!Array.isArray(parts)) {
        return res.status(400).json({ error: "Invalid payload format: parts must be array." });
      }
      if (parts.length > 15) {
        return res.status(400).json({ error: "Rejected: Exceeded max allowed 15 images." });
      }

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      const sanitizedParts = parts.map((part, idx) => {
        if (part && part.inlineData) {
          const { mimeType, data } = part.inlineData;
          if (!mimeType || !allowedMimeTypes.includes(mimeType.toLowerCase())) {
            throw new Error(`Security Violation: Image #${idx + 1} has forbidden MIME type "${mimeType}".`);
          }
          if (!data || typeof data !== "string") {
            throw new Error(`Security Violation: Image #${idx + 1} payload corrupted.`);
          }
          const base64Raw = data.includes(',') ? data.split(',')[1] : data;
          const trimmed = base64Raw.trim();
          if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) {
            throw new Error(`Security Violation: Image #${idx + 1} contains malformed base64.`);
          }
          if (trimmed.length > 20 * 1024 * 1024) {
            throw new Error(`Security Violation: Image #${idx + 1} exceeds file size limit.`);
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

    const aiClient = getGenAIClient();
    const response = await aiClient.models.generateContent({
      model: mappedModel,
      contents,
      config
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "AI generated an empty response." });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Protected Vercel Gemini API Error:", error);
    const status = error.message && error.message.includes("Security Violation") ? 400 : 500;
    return res.status(status).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
  }
}
