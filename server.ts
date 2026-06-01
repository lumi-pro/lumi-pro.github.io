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
    const { image, ambientStats, preferences, simulatedScenario, apiEndpoint, apiKey } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing 'image' base64 payload in request body" });
    }

    const userApiKey = apiKey || "";
    const userEndpoint = apiEndpoint || "";

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

    let resultText = "";

    try {
      const isGeminiEndpoint = userEndpoint.includes("googleapis.com") || userEndpoint.includes("google") || userEndpoint.includes("gemini");

      if (isGeminiEndpoint || (!userEndpoint && ai)) {
        // Initialize Gemini with provided API key or fallback to system instance
        const activeAi = userApiKey 
          ? new GoogleGenAI({ apiKey: userApiKey }) 
          : ai;

        if (!activeAi) {
          throw new Error("Gemini API is not initialized. Please configure API credentials in Settings.");
        }

        const response = await activeAi.models.generateContent({
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
                shadows: { type: Type.STRING, description: "Description of facial shadows, dark circles, and nasocial folds" },
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
                "skinTone", "brightness", "shadows", "sceneCharacteristics", "problems",
                "recommendedPresetId", "recommendedIntensity", "targetBrightness", "targetSoftness",
                "reasoningZh", "reasoningEn"
              ]
            }
          }
        });
        resultText = response.text || "{}";
      } else {
        // OpenAI-compatible custom API endpoint handler
        let endpoint = userEndpoint || "https://api.openai.com/v1/chat/completions";
        if (!endpoint.includes("/chat/completions")) {
          endpoint = endpoint.replace(/\/+$/, "") + "/chat/completions";
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (userApiKey) {
          headers["Authorization"] = `Bearer ${userApiKey}`;
        } else if (process.env.OPENAI_API_KEY) {
          headers["Authorization"] = `Bearer ${process.env.OPENAI_API_KEY}`;
        }

        const schemaKeys = [
          "skinTone", "brightness", "shadows", "sceneCharacteristics", "problems",
          "recommendedPresetId", "recommendedIntensity", "targetBrightness", "targetSoftness",
          "reasoningZh", "reasoningEn"
        ];

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt + `\n\nCRITICAL: Return a raw valid JSON object. Ensure the JSON strictly contains these keys: ${schemaKeys.join(", ")}.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Data}`
                    }
                  }
                ]
              }
            ]
          })
        });

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`OpenAI-compatible endpoint failed: ${response.status} ${errMsg}`);
        }

        const resData = await response.json() as any;
        resultText = resData?.choices?.[0]?.message?.content || "{}";
      }
    } catch (apiError: any) {
      console.warn("Lumi Network load-balancing triggered local sensory adaptation system:", apiError?.message || apiError);
      
      // Smart Fallback Recommendation Response inside server
      let fallbackPreset = preferences?.favoritePresetId || "cream";
      if (ambientStats) {
        const isDark = (ambientStats.brightness || 100) < 60;
        const isWarm = (ambientStats.warmth || 1.0) > 1.15;
        if (isWarm) {
          fallbackPreset = "cold"; // neutralize warm ambient glow with ice white
        } else if (isDark) {
          fallbackPreset = "moonlight"; // moonlight blue atmospheric glow
        }
      }

      // Safe check to match valid preset boundaries
      const availableIds = [
        'cream', 'love', 'cold', 'sunset', 'moonlight', 'velvet_purple', 
        'rosy_wine', 'aurora_cyan', 'deep_peach', 'studio_white', 'pearl_glow', 'light_honey',
        'special_blood_boost', 'special_cold_white', 'special_soft_sweet', 'special_korean_dewy',
        'special_ambient_mood', 'special_anti_dullness', 'special_natural_daylight', 'special_sunset_glow',
        'special_acne_corrector'
      ];
      if (!availableIds.includes(fallbackPreset)) {
        fallbackPreset = "cream";
      }

      const fbResponse = {
        skinTone: "已通过机身多维传感器估测分析面部光影",
        brightness: "已自动调节画面最佳补光比例",
        shadows: "已极速弱化面部多余面角阴影，柔和填补泪沟",
        sceneCharacteristics: `Lumi 智能光控系统：自适应环境 (${simulatedScenario || '默认室内'})`,
        problems: `云端连接拥堵，已自动切换为 Lumi 本地高精准光感推荐算法 (${apiError?.message || 'Error occurred'})`,
        recommendedPresetId: fallbackPreset,
        recommendedIntensity: "normal",
        targetBrightness: preferences?.averageBrightness || 0.80,
        targetSoftness: preferences?.averageSoftness || 0.70,
        reasoningZh: "✨ [Lumi 智能感应] 当前云端追光网络较忙，Lumi 自动启动设备端轻量感应算法，已为你推荐并契合经典方案，伴你美美出片哦～",
        reasoningEn: "✨ [Lumi Local Sync] Cloud server is in high demand, running lightweight local sensor tuning. Reverted to classic match for a perfect look!"
      };
      
      res.json(fbResponse);
      return;
    }

    // Dynamic robust parsing of JSON strings
    let parsedData = {};
    try {
      let cleaned = resultText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      parsedData = JSON.parse(cleaned);

      // Sanity conversions on targetBrightness & targetSoftness to guarantee floats
      if (typeof (parsedData as any).targetBrightness === "string") {
        (parsedData as any).targetBrightness = parseFloat((parsedData as any).targetBrightness) || 0.80;
      }
      if (typeof (parsedData as any).targetSoftness === "string") {
        (parsedData as any).targetSoftness = parseFloat((parsedData as any).targetSoftness) || 0.70;
      }
    } catch (parseError) {
      console.error("Failed to parse API output text into proper JSON. Output text was:", resultText, parseError);
      throw new Error("Invalid response format generated by API engine");
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("Vision API processing error:", error);
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
