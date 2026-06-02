import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { prompt, parts, model: modelName = "gemini-3.5-flash", config = {} } = req.body;
      
      let mappedModel = modelName;
      if (modelName === "gemini-3-flash-preview" || !modelName) {
        mappedModel = "gemini-3.5-flash";
      }

      let contents;
      if (parts) {
        // Sanitize inlineData data base64 strings if present to avoid "The string did not match the expected pattern."
        const sanitizedParts = parts.map((part: any) => {
          if (part && part.inlineData && typeof part.inlineData.data === 'string') {
            // Strip data URL prefixes if they accidentally got passed to the server
            const base64Raw = part.inlineData.data.includes(',')
              ? part.inlineData.data.split(',')[1]
              : part.inlineData.data;

            // Use Node's built-in Buffer to automatically heal any incomplete/invalid base64
            const cleanBase64 = Buffer.from(base64Raw.trim(), 'base64').toString('base64');
            
            return {
              ...part,
              inlineData: {
                ...part.inlineData,
                data: cleanBase64
              }
            };
          }
          return part;
        });
        contents = { parts: sanitizedParts };
      } else {
        contents = prompt;
      }

      let response;
      let lastError: any = null;
      const maxRetries = 4;
      const retryDelayMs = 1200;

      // Ensure safety settings are configured to prevent false-positives
      const enhancedConfig = {
        ...config,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
        ]
      };

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Robust rotation sequence across highly capable model families to bypass localized timeouts/API limits
          let currentModel = mappedModel;
          if (attempt === 2) {
            currentModel = "gemini-2.5-flash";
            console.log(`[Backup Failover 1]: Rotating to stable candidate "${currentModel}" on attempt 2`);
          } else if (attempt === 3) {
            currentModel = "gemini-flash-latest";
            console.log(`[Backup Failover 2]: Rotating to production candidate "${currentModel}" on attempt 3`);
          } else if (attempt === 4) {
            currentModel = "gemini-3.1-flash-lite";
            console.log(`[Backup Failover 3]: Rotating to lightweight candidate "${currentModel}" on attempt 4`);
          }

          response = await genAI.models.generateContent({
            model: currentModel,
            contents,
            config: enhancedConfig
          });
          
          if (response && response.text) {
            lastError = null;
            break;
          } else {
            throw new Error("AI returned empty text");
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Server AI Attempt ${attempt}/${maxRetries} Failed on model]:`, err.message || err);
          if (attempt < maxRetries) {
            const delay = retryDelayMs * Math.pow(1.5, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      const text = response.text;

      if (!text) {
        console.error("AI response has no text content");
        return res.status(500).json({ error: "AI generated an empty response." });
      }

      res.json({ text });
    } catch (error) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  // Dynamic Sitemap.xml Route for Search Engine Crawler Updates
  app.get("/sitemap.xml", (req, res) => {
    res.header("Content-Type", "application/xml");
    
    const publicPaths = [
      "",
      "about",
      "clinic",
      "routine",
      "plans",
      "learn",
      "learn/early-signs-of-skin-cancer",
      "learn/suspicious-mole-warning-signs",
      "learn/when-to-see-a-dermatologist",
      "learn/abcde-rule-for-moles",
      "learn/how-to-monitor-skin-changes"
    ];
    
    const host = "https://skintightai.com";
    const currentDate = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    publicPaths.forEach(p => {
      const pathSegment = p ? `/${p}` : "";
      xml += `  <url>\n`;
      xml += `    <loc>${host}${pathSegment}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${p === "" ? "1.0" : "0.8"}</priority>\n`;
      xml += `  </url>\n`;
    });
    
    xml += `</urlset>`;
    res.send(xml);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
