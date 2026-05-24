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
            let data = part.inlineData.data.trim().replace(/[^a-zA-Z0-9+/=]/g, '');
            const mod = data.length % 4;
            if (mod === 2) {
              data += "==";
            } else if (mod === 3) {
              data += "=";
            } else if (mod === 1) {
              data = data.slice(0, -1);
            }
            return {
              ...part,
              inlineData: {
                ...part.inlineData,
                data
              }
            };
          }
          return part;
        });
        contents = { parts: sanitizedParts };
      } else {
        contents = prompt;
      }

      const response = await genAI.models.generateContent({
        model: mappedModel,
        contents,
        config
      });

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
