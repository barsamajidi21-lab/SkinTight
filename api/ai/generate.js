import { GoogleGenAI } from "@google/genai";

let genAIClient = null;

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add your GEMINI_API_KEY in your Vercel project environment variables.");
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAIClient;
}

export default async function handler(req, res) {
  // Setup CORS Headers for safe routing
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { prompt, parts, model = "gemini-3.5-flash", config = {} } = req.body;
    
    let mappedModel = model;
    if (model === "gemini-3-flash-preview" || !model) {
      mappedModel = "gemini-3.5-flash";
    }

    let contents;
    if (parts) {
      // Clean up base64 payload characters to prevent DOMException / WebKit pattern mismatch
      const sanitizedParts = parts.map((part) => {
        if (part && part.inlineData && typeof part.inlineData.data === 'string') {
          // Remove potential data URL headers ("data:image/jpeg;base64,") if present
          const base64Raw = part.inlineData.data.includes(',')
            ? part.inlineData.data.split(',')[1]
            : part.inlineData.data;

          // Leverage Node's native Buffer engine to heal padding or incorrect lengths safely
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

    const aiClient = getGenAIClient();
    const response = await aiClient.models.generateContent({
      model: mappedModel,
      contents,
      config
    });

    const text = response.text;

    if (!text) {
      console.error("AI response has no text content");
      return res.status(500).json({ error: "AI generated an empty response." });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Gemini API error in Vercel function:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
  }
}
