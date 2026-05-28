import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

const PORT = 3000;

// Initialize GoogleGenAI SDK safely
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

if (API_KEY) {
  ai = new GoogleGenAI({
    apiKey: API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// REST endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasApiKey: !!API_KEY });
});

app.post("/api/gemini/analyze", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Missing GEMINI_API_KEY environment variable. Please configure it in Settings > Secrets."
      });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing 'image' base64 payload in request body" });
    }

    // Extract bare base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      You are Lumi, a professional AI studio portrait selfie lighting expert and atmosphere photographer.
      Analyze the attached camera viewfinder selfie frame of the user. Perform a highly detailed and intelligent scene/lighting evaluation.
      Do not be overly generic. Look closely at variables like skin temperature, lighting angle, shadows, and darkness hotspots.
      
      Determine:
      1. Portrait features: skin tone warmth, shadow levels (especially under-eye circles or nose bridge lines), brightness level.
      2. Scene characteristics: background lighting, yellow/white tints, day/night setting, indoor/outdoor cue.
      3. Selfie issues: backlighting, face under-exposure, extreme yellow casting, low contrast.
      
      Suggest the ideal correction:
      1. Choose one matching preset ID from:
         'cream' (Cream Skin / 奶油肌) - soft warm glow, neutralizing skin dullness/redness.
         'love' (First Love / 初恋粉) - fresh pinky glow, adding healthy warmth.
         'cold' (Ice White / 冷白皮) - clear cool white light, excellent to offset yellow lights.
         'sunset' (Sunset Glow / 日落橘) - cinematic retro evening warm look.
         'moonlight' (Moonlight / 月光蓝) - deep blue nighttime mystery atmosphere.
         'velvet_purple' (Velvet Purple / 丝绒紫) - fancy twilight violet.
         'rosy_wine' (Rosy Wine / 微醺红) - romantic wine-warm.
         'aurora_cyan' (Aurora Cyan / 极光青) - calming light icy teal.
         'deep_peach' (Deep Peach / 蜜桃暖) - energetic summer orange.
         'sunset_rose' (Sunset Rose / 晚霞粉) - pastel pink purple mix.
         'studio_white' (Studio White / 冷白光) - professional pure white bright keylight.
         'warm_vanilla' (Warm Vanilla / 香草米白) - soft luxury vanilla linen.
         'pearl_glow' (Pearl Glow / 珍珠光) - refined glossy pearlescent glow.
         'soft_beige' (Soft Beige / 卡其暖) - minimalist designer neutral cozy warmth.
         'light_honey' (Light Honey / 蜜金光) - sweet glowing luxury honey amber.
      2. Select intensityLevel: 'soft' (soft light), 'normal' (standard diffusor), 'rich' (dense saturation), or 'studio' (continuous bright fill).
      3. Choose specific brightness (0.15 to 1.0) and smoothness/softness (0.0 to 1.0).
      4. Write elegant, helpful, professional natural reasoning summaries in both Chinese and English to explain to the user what you detected and why you auto-tuned the lights this way. Keep the tone warm, comforting, and highly professional like a celebrity photographer or cosmetic consultant, assuring the user that you've got them beautifully lit.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skinTone: { type: Type.STRING },
            brightness: { type: Type.STRING },
            shadows: { type: Type.STRING },
            sceneCharacteristics: { type: Type.STRING },
            problems: { type: Type.STRING },
            recommendedPresetId: { type: Type.STRING },
            recommendedIntensity: { type: Type.STRING },
            targetBrightness: { type: Type.NUMBER },
            targetSoftness: { type: Type.NUMBER },
            reasoningZh: { type: Type.STRING },
            reasoningEn: { type: Type.STRING },
          },
          required: [
            "skinTone",
            "brightness",
            "shadows",
            "sceneCharacteristics",
            "problems",
            "recommendedPresetId",
            "recommendedIntensity",
            "targetBrightness",
            "targetSoftness",
            "reasoningZh",
            "reasoningEn"
          ]
        }
      }
    });

    const resultText = response.text;
    res.json(JSON.parse(resultText || "{}"));
  } catch (error: any) {
    console.error("Gemini Vision API analysis error:", error);
    res.status(500).json({ error: error?.message || "Internal server error analyzing selfie frame" });
  }
});

// Setup Vite Dev Server / Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumi Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
