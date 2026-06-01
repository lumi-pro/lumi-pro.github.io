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

    const { image, ambientStats, preferences, simulatedScenario } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing 'image' base64 payload in request body" });
    }

    // Extract bare base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // Structure metadata context for Gemini's deep reasoning
    let metadataPrompt = "";
    if (ambientStats || preferences || simulatedScenario) {
      metadataPrompt = `
      [USER CUSTOM CONTEXT & PREFERENCES ENVIRONMENT]:
      - User Preferred Aesthetic Style (makeup mode): ${preferences?.styleMode || 'natural'}
      - User Favorite Preset (from historical usages): ${preferences?.favoritePresetId || 'none'}
      - Active App Simulated Scenario ID: ${simulatedScenario || 'none'}
      - Live Multi-sensor Stats: ${JSON.stringify(ambientStats || {})}
      `;
    }

    const prompt = `
      You are Lumi, a highly sophisticated celebrity studio portrait photographer, cosmetics advisor, and AI selfie lighting guru.
      Analyze the attached camera viewfinder selfie frame from the user, combining it with any environmental and preferences context provided.
      Perform a highly intelligent, premium, multi-layered aesthetic and lighting evaluation.
      
      DO NOT be overly generic. Implement the following 4 core analytical layers strictly:

      1. PORTRAIT ANALYSIS (人物分析):
         - Closely analyze: skin tone warmth/coolness, transparency, facial shadows (facial lines, nasolabial folds/法令纹), dark circles (under-eye shadows), facial dimensionality/3D structure, makeup style (prominent/glamorous peach vs fresh natural nude), lip and eye brightness.
         - RULE: If you detect a yellowish skin tone (面色偏黄) and fatigued under-eye circles (眼下暗沉/黑眼圈), recommend a cool, clear corrective fill such as 'special_cold_white' (Porcelain Cool / 清透冷白) or 'cold' (Ice White / 冷白皮) to counteract the dullness and yellow-cast, NEVER recommend warm-cast yellow lights like 'cream' (Cream Skin / 奶油肌).

      2. BACKGROUND SCENARIO ANALYSIS (背景分析):
         - Identify the context (Office, home, cafe/restaurant, inside car, hotel lounge, shopping mall, or night scene/夜景).
         - Scan for elements like white walls, wooden textures, warm/cool/dark background glows.
         - SMART DE-DUPLICATION RULE: If the background is already yellow or warm (背景偏黄), AVOID recommending warm orange fill lights like 'sunset' (Sunset Glow / 日落橘) or 'special_sunset_glow' (余晖晚照) to prevent an excessive and flat yellow/orange skin cast. Balance the environment with neutralizing cool, neutral, or clear white tones.

      3. SELFIE INTENTION INFERENCE (自拍目的推测 & 场景归化):
         - Infer the selfie's creative intent based on the environment and style selections:
           - Professional/Daily Commute (日常通勤): If the setup is an office, white wall, or no-makeup style. Recommend clean skin-correcting lights like 'cream' (奶油肌), 'special_anti_dullness' (极光净肤), or 'studio_white' (冷白光).
           - Social Sharing/Glamorous (自拍社交分享): If in a cafe, hotel, restaurant with glamorous makeup. Recommend warm rosy/dewy glows like 'special_soft_sweet' (蜜桃粉黛), 'love' (初恋粉), 'pearl_glow' (珍珠光), or 'special_korean_dewy' (莹亮水光) to add a healthy flush.
           - Artistic Ambient/Atmospheric (氛围感大片): If at night, inside a car, in a dark space, or with high-contrast shadows. Recommend dramatic cool or purple tones like 'special_ambient_mood' (迷醺氛围), 'moonlight' (月光蓝), or 'velvet_purple' (丝绒紫) to paint an interactive evening mood.

      4. USER HABITS & MEMORY INTEGRATION (习惯记忆融合):
         - Incorporate the user's favorite preset or preferences when feasible. If the suggested lighting overlaps beautifully with their history (e.g. they love 'cold' or 'love'), mention it warmly in your explanation to make them feel understood.

      LANGUAGE & TONE EXPECTATIONS:
      - STRICTLY AVOID any raw technical numbers, geeky specs, or sensor indexes in your explanations (e.g., do NOT mention '5600K', 'CRI 95', 'exposure index 72%').
      - Speak in a warm, encouraging, supportive, and extremely professional tone—like a reassuring celebrity makeup artist or high-fashion photographer who has got their lighting beautifully covered.
      - Write elegant natural summaries in both Chinese (reasoningZh) and English (reasoningEn).
      - Address the user directly. Explain what you discovered across the 4 layers, why you chose the selected preset, and how it sculpts their face, background, and intent beautifully.

      AVAILABLE PRESET SELECTIONS (ID mapping):
      - 'cream' (Cream Skin / 奶油肌) - Soft warm glow, plumps and neutralizes minor skin dullness.
      - 'love' (First Love / 初恋粉) - Fresh pinky glow, adds romantic healthy warmth.
      - 'cold' (Ice White / 冷白皮) - Smooth, clean cool white light, excellent to offset yellow environments.
      - 'sunset' (Sunset Glow / 日落橘) - Golden evening warm retro light.
      - 'moonlight' (Moonlight / 月光蓝) - Serene blue nighttime cosmic atmosphere.
      - 'velvet_purple' (Velvet Purple / 丝绒紫) - Fancy twilight velvet.
      - 'rosy_wine' (Rosy Wine / 微醺红) - Romantic blush wine-warm.
      - 'aurora_cyan' (Aurora Cyan / 极光青) - Low-saturation calming icy teal.
      - 'deep_peach' (Deep Peach / 蜜桃暖) - Energetic cozy orange.
      - 'studio_white' (Studio White / 冷白光) - Pro high-exposure pure white accent keylight.
      - 'pearl_glow' (Pearl Glow / 珍珠光) - Wet gloss pearlescent shimmer.
      - 'light_honey' (Light Honey / 蜜金光) - Sweet amber gold.
      
      特调系列 PRESETS (Special Series):
      - 'special_blood_boost' (盈润红颜 / Vitality Blush) - Rich healthy color, neutralizes paleness.
      - 'special_cold_white' (清透冷白 / Porcelain Cool) - Ultimate anti-yellowing icy blue-white, superb for dark under-eyes or face fatigue.
      - 'special_soft_sweet' (蜜桃粉黛 / Sweet Peach) - Exquisite sweet peach puff, plumps up lines.
      - 'special_korean_dewy' (莹亮水光 / Radiant Hydration) - Ultimate glossy, rich hydrated shimmer.
      - 'special_ambient_mood' (迷醺氛围 / Velvet Mood) - Artistic night neon magenta-violet aura.
      - 'special_anti_dullness' (极光净肤 / Luminous Reset) - Refreshing light teal-mint, erases facial dullness and gray spots.
      - 'special_natural_daylight' (原原生日光 / Pure Daylight) - 100% natural neutral-white keylight.
      - 'special_sunset_glow' (余晖晚照 / Sunset Horizon) - Nostalgic beach sunset gold.
      - 'special_acne_corrector' (修颜御红 / Calming Correction) - Corrective lavender-purple, conceals active redness and blemishes.

      ${metadataPrompt}
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
            skinTone: { type: Type.STRING, description: "Detailed description of portrait's skin warmth, cool tones, transparency, and health" },
            brightness: { type: Type.STRING, description: "Face exposure level description concisely" },
            shadows: { type: Type.STRING, description: "Description of facial shadows, dark circles, and nasolabial folds" },
            sceneCharacteristics: { type: Type.STRING, description: "Background description incorporating detected scenes, lighting elements and wall textures" },
            problems: { type: Type.STRING, description: "Complexion problems or background issues detected, with intent inference" },
            recommendedPresetId: { type: Type.STRING, description: "Must exactly match one of the available preset IDs" },
            recommendedIntensity: { type: Type.STRING, description: "Must be 'soft', 'normal', 'rich', or 'studio'" },
            targetBrightness: { type: Type.NUMBER, description: "Recommended preset brightness value from 0.15 to 1.0" },
            targetSoftness: { type: Type.NUMBER, description: "Recommended preset softness value from 0.0 to 1.0" },
            reasoningZh: { type: Type.STRING, description: "Warm, highly caring, natural reasoning, addressing person, background, intent, and memory in Chinese starting with ✨ and avoiding all numbers" },
            reasoningEn: { type: Type.STRING, description: "Elegant, encouraging, natural reasoning in English starting with ✨ and avoiding technical numbers" },
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
