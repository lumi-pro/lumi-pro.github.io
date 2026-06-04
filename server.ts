import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

const PORT = 3000;

// Helper to determine if a selected provider/model supports vision
function supportsVision(provider: string, model: string): boolean {
  const p = (provider || "").toLowerCase();
  const m = (model || "").toLowerCase();
  if (p === "deepseek") return false;
  if (m.includes("deepseek-chat") || m.includes("deepseek-r1") || m.includes("deepseek-v3") || m.includes("reasoner")) {
    return false;
  }
  return true;
}

// REST endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasOpenaiKey: !!process.env.OPENAI_API_KEY,
  });
});

// 🔌 TEST CONNECTION API FOR MULTIPLE PROVIDERS
app.post("/api/ai/test-connection", async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, model } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API Key is required to test connection." });
    }

    const cleanBaseUrl = (baseUrl || "").trim();
    const cleanModel = (model || "").trim();
    const provRaw = (provider || "gemini").toLowerCase();

    let prov = provRaw;
    if (cleanBaseUrl) {
      const urlLower = cleanBaseUrl.toLowerCase();
      if (urlLower.includes("deepseek.com")) {
        prov = "deepseek";
      } else if (urlLower.includes("siliconflow.cn")) {
        prov = "siliconflow";
      } else if (urlLower.includes("volces.com") || urlLower.includes("volcengine")) {
        prov = "doubao";
      } else if (urlLower.includes("openrouter.ai")) {
        prov = "openrouter";
      } else if (urlLower.includes("api.openai.com")) {
        prov = "openai";
      } else if (urlLower.includes("anthropic.com")) {
        prov = "claude";
      } else if (provRaw === "gemini") {
        const isGeminiNative = urlLower.includes("googleapis.com") || urlLower.includes("generativelanguage") || urlLower.includes("google");
        if (!isGeminiNative) {
          prov = "custom";
        }
      }
    }

    let testSuccess = false;
    let errorMessage = "";
    let systemMatchedName = "";

    if (prov === "gemini") {
      systemMatchedName = "Gemini";
      let targetUrl = cleanBaseUrl || "https://generativelanguage.googleapis.com";
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/+$/, "");

      if (!targetUrl.includes(":generateContent")) {
        if (!targetUrl.includes("/v1beta") && !targetUrl.includes("/v1")) {
          targetUrl = targetUrl + "/v1beta/models/" + (cleanModel || "gemini-2.5-flash") + ":generateContent";
        } else {
          targetUrl = targetUrl + "/models/" + (cleanModel || "gemini-2.5-flash") + ":generateContent";
        }
      }

      if (!targetUrl.includes("key=")) {
        targetUrl += (targetUrl.includes("?") ? "&" : "?") + "key=" + apiKey;
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say OK in 1 word." }] }]
        })
      });

      if (response.ok) {
        testSuccess = true;
      } else {
        const errText = await response.text();
        errorMessage = `Gemini connection failed (${response.status}): ${errText}`;
      }

    } else if (prov === "claude") {
      systemMatchedName = "Claude";
      let targetUrl = cleanBaseUrl || "https://api.anthropic.com";
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/+$/, "") + "/v1/messages";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      };

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cleanModel || "claude-3-5-sonnet",
          max_tokens: 10,
          messages: [{ role: "user", content: "Say OK in 1 word." }]
        })
      });

      if (response.ok) {
        testSuccess = true;
      } else {
        const errText = await response.text();
        errorMessage = `Claude connection failed (${response.status}): ${errText}`;
      }

    } else {
      // OpenAI Compatible models (OpenAI, Doubao, DeepSeek, OpenRouter, SiliconFlow, Custom)
      const providerMapping: Record<string, string> = {
        openai: "OpenAI",
        doubao: "Doubao",
        deepseek: "DeepSeek",
        openrouter: "OpenRouter",
        siliconflow: "SiliconFlow",
        custom: "Custom OpenAI Compatible API"
      };
      systemMatchedName = providerMapping[prov] || "AI Provider";

      let defaultUrl = "https://api.openai.com/v1";
      if (prov === "doubao") defaultUrl = "https://ark.cn-beijing.volces.com/api/v3";
      if (prov === "deepseek") defaultUrl = "https://api.deepseek.com/v1";
      if (prov === "openrouter") defaultUrl = "https://openrouter.ai/api/v1";
      if (prov === "siliconflow") defaultUrl = "https://api.siliconflow.cn/v1";

      let targetUrl = cleanBaseUrl || defaultUrl;
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/+$/, "") + "/chat/completions";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };

      const isWattApi = cleanBaseUrl.toLowerCase().includes("rivtower.xyz") || cleanBaseUrl.toLowerCase().includes("watt-api");
      const defaultModel = isWattApi ? "qwen3.6-27b" :
                           prov === "openai" ? "gpt-4o-mini" : 
                           prov === "deepseek" ? "deepseek-chat" : 
                           prov === "doubao" ? "ep-xxxxxxxxxxxx" :
                           prov === "openrouter" ? "google/gemini-2.5-flash" :
                           prov === "siliconflow" ? "deepseek-ai/DeepSeek-V3" : "gpt-4o-mini";

      let activeModel = cleanModel;
      if (activeModel === "gemini-2.5-flash" && prov !== "gemini" && prov !== "openrouter") {
        activeModel = ""; // Realignment override
      }

      const testBody: any = {
        model: activeModel || defaultModel,
        messages: [{ role: "user", content: "Say OK in 1 word." }],
        max_tokens: 10
      };

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(testBody)
      });

      if (response.ok) {
        testSuccess = true;
      } else {
        const errText = await response.text();
        errorMessage = `${systemMatchedName} connection failed (${response.status}): ${errText}`;
      }
    }

    if (testSuccess) {
      return res.json({
        success: true,
        message: `已连接到 ${systemMatchedName}`,
        provider: prov
      });
    } else {
      return res.json({
        success: false,
        message: "测试连接失败",
        error: errorMessage
      });
    }

  } catch (err: any) {
    console.error("Test connection crash:", err);
    res.json({
      success: false,
      message: "通信抛出异常",
      error: err?.message || "Unknown communication error connected to server."
    });
  }
});

// 🎨 ADAPTIVE CHAT COMPLETION FOR PHOTO EVALUATIONS (MULTI-PROVIDER ENDPOINT)
app.post("/api/gemini/analyze", async (req, res) => {
  const { 
    image, 
    ambientStats, 
    preferences, 
    simulatedScenario, 
    apiEndpoint, 
    apiKey,
    provider,
    model
  } = req.body;

  // Safe Fallback Setup
  let fallbackPreset = preferences?.favoritePresetId || "cream";
  if (ambientStats) {
    const isDark = (ambientStats.brightness || 100) < 60;
    const isWarm = (ambientStats.warmth || 1.0) > 1.15;
    if (isWarm) {
      fallbackPreset = "cold";
    } else if (isDark) {
      fallbackPreset = "moonlight";
    }
  }

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

  const localFallbackReport = {
    skinTone: "已通过设备多维传感器现场估测分析面部光影",
    brightness: "已自适应调节完美补光环境占比",
    shadows: "已自动减弱面角细滑阴影，柔和填充眼眶泪沟",
    sceneCharacteristics: `Lumi 智能光控系统：自适应环境 (${simulatedScenario || '默认室内'})`,
    problems: "💡 传感器智控：由于您的 AI 接口尚未配置 API Key，已自动切入设备本地多维传感器自控补光。您可随时前往右上角设置配置接口密令，解锁 Lumi Pro AI 极速测光诊断！",
    recommendedPresetId: fallbackPreset,
    recommendedIntensity: "normal",
    targetBrightness: preferences?.averageBrightness || 0.80,
    targetSoftness: preferences?.averageSoftness || 0.70,
    reasoningZh: "✨ [Lumi 本地智选] 已自动读取手机传感器姿态与周围采光指标，自适应为您配对经典契合方案。推荐点击右上角「设置」配置 AI 服务商，感受云端 AI 摄影师级别的精雕细琢！",
    reasoningEn: "✨ [Lumi Local Synced] Automatically tuned lighting parameters from active sensors. Tap Settings to plug in your AI Provider for full fashion photographer diagnostic recommendations!"
  };

  // If no credentials are provided in either request body or server ENV, return clean sensor fallback right away, without failing "busy"
  const activeKey = apiKey || (provider === "gemini" || !provider ? process.env.GEMINI_API_KEY : "");
  
  const isPlaceholderValue = (val: any) => {
    if (!val || typeof val !== 'string') return true;
    const v = val.trim().toLowerCase();
    return (
      v === "" ||
      v.includes("placeholder") ||
      v.includes("your_api_key") ||
      v.includes("your_key") ||
      v === "sk-xxxx" ||
      v === "ep-xxxxxxxxxxxx" ||
      v.includes("xxxxxx")
    );
  };

  if (!activeKey || isPlaceholderValue(activeKey)) {
    return res.json(localFallbackReport);
  }

  const activeModel = model || "";
  if ((provider === "doubao" || (apiEndpoint || "").toLowerCase().includes("volces.com") || (apiEndpoint || "").toLowerCase().includes("volcengine")) && isPlaceholderValue(activeModel)) {
    const doubaoFallback = {
      ...localFallbackReport,
      problems: "💡 提示：您已选择火山引擎「豆包」模型，但尚未配置有效的目标接入点 Endpoint ID (例如 ep-2026xxxxxxxx-xxxxx)。目前使用设备本地多维传感器自控补光。",
      reasoningZh: "✨ [Lumi 本地智选 - 豆包配置提示] 已检测到火山引擎关联配置，由于 Endpoint ID 为默认占位符，已开启传感器精细补光方案。请进入右上角「设置」填入专属 Endpoint ID 后重试！",
      reasoningEn: "✨ [Lumi Doubao Setup Tip] Volcengine selected. Since Endpoint ID is the default placeholder, local sensor fallback has been activated. Please enter your valid Doubao Endpoint ID under Settings."
    };
    return res.json(doubaoFallback);
  }

  try {
    if (!image) {
      return res.status(400).json({ error: "Missing 'image' base64 payload in request body" });
    }

    // Extract bare base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // Structure metadata context for deep reasoning
    let metadataPrompt = "";
    if (ambientStats || preferences || simulatedScenario) {
      metadataPrompt = `
      [USER ENVIRONMENT SENSOR & PREFERENCE DECK]:
      - User Preferred Aesthetic Style (makeup mode preference / 自拍美颜偏好): ${preferences?.styleMode || 'natural'}
      - User Favorite Preset (from historical usages): ${preferences?.favoritePresetId || 'none'}
      - Active App Simulated Scenario ID: ${simulatedScenario || 'none'}
      - Live Multi-sensor Stats: ${JSON.stringify(ambientStats || {})}
      `;
    }

    const schemaKeys = [
      "skinTone", "brightness", "shadows", "sceneCharacteristics", "problems",
      "recommendedPresetId", "recommendedIntensity", "targetBrightness", "targetSoftness",
      "reasoningZh", "reasoningEn"
    ];

    const promptText = `
      You are Lumi, a highly sophisticated celebrity studio portrait photographer, cosmetics advisor, and AI selfie lighting guru.
      Analyze the provided camera viewfinder selfie frame from the user, combining it with any environmental and preferences context provided.
      Perform a highly intelligent, premium, multi-layered aesthetic and lighting evaluation.
      
      DO NOT be overly generic. Implement the following 4 core analytical layers strictly:

      1. PORTRAIT ANALYSIS (人物分析):
         - Closely analyze: skin tone warmth/coolness, transparency, facial shadows (facial lines, nasolabial folds/法令纹), dark circles (under-eye shadows), facial dimensionality/3D structure, makeup style, lip and eye brightness.
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
         - Incorporate the user's favorite preset or preferences when feasible. If the suggested lighting overlaps beautifully with their history, mention it warmly in your explanation to make them feel understood.

      LANGUAGE & TONE EXPECTATIONS:
      - STRICTLY AVOID any raw technical numbers, geeky specs, or sensor indexes in your explanations (e.g., do NOT mention '5600K', 'CRI 95', 'exposure index 72%').
      - Speak in a warm, encouraging, supportive, and extremely professional tone—like a reassuring celebrity makeup artist or high-fashion photographer.
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

      CRITICAL SYSTEM DIRECTIVE: Output a valid stringified JSON object strictly containing the keys: ${schemaKeys.join(", ")}. Ensure there are no surrounding markdown code tags in your raw REST output unless instructed, and keep JSON parseable.
    `;

    const provRaw = (provider || "gemini").toLowerCase();
    const cleanBaseUrl = (apiEndpoint || "").trim();
    const cleanModel = (model || "").trim();

    let prov = provRaw;
    if (cleanBaseUrl) {
      const urlLower = cleanBaseUrl.toLowerCase();
      if (urlLower.includes("deepseek.com")) {
        prov = "deepseek";
      } else if (urlLower.includes("siliconflow.cn")) {
        prov = "siliconflow";
      } else if (urlLower.includes("volces.com") || urlLower.includes("volcengine")) {
        prov = "doubao";
      } else if (urlLower.includes("openrouter.ai")) {
        prov = "openrouter";
      } else if (urlLower.includes("api.openai.com")) {
        prov = "openai";
      } else if (urlLower.includes("anthropic.com")) {
        prov = "claude";
      } else if (provRaw === "gemini") {
        const isGeminiNative = urlLower.includes("googleapis.com") || urlLower.includes("generativelanguage") || urlLower.includes("google");
        if (!isGeminiNative) {
          prov = "custom";
        }
      }
    }
    const isVision = true;

    let resultText = "";

    if (prov === "gemini") {
      let targetUrl = cleanBaseUrl || "https://generativelanguage.googleapis.com";
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/+$/, "");

      const gemModel = cleanModel || "gemini-2.5-flash";

      if (!targetUrl.includes(":generateContent")) {
        if (!targetUrl.includes("/v1beta") && !targetUrl.includes("/v1")) {
          targetUrl = targetUrl + "/v1beta/models/" + gemModel + ":generateContent";
        } else {
          targetUrl = targetUrl + "/models/" + gemModel + ":generateContent";
        }
      }

      if (!targetUrl.includes("key=")) {
        targetUrl += (targetUrl.includes("?") ? "&" : "?") + "key=" + activeKey;
      }

      const uploadParts: any[] = [];
      if (isVision) {
        uploadParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }
      uploadParts.push({ text: promptText });

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: uploadParts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                skinTone: { type: "STRING" },
                brightness: { type: "STRING" },
                shadows: { type: "STRING" },
                sceneCharacteristics: { type: "STRING" },
                problems: { type: "STRING" },
                recommendedPresetId: { type: "STRING" },
                recommendedIntensity: { type: "STRING" },
                targetBrightness: { type: "NUMBER" },
                targetSoftness: { type: "NUMBER" },
                reasoningZh: { type: "STRING" },
                reasoningEn: { type: "STRING" }
              },
              required: schemaKeys
            }
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini analyze failed (${response.status}): ${errText}`);
      }

      const resData = await response.json() as any;
      resultText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    } else if (prov === "claude") {
      let targetUrl = cleanBaseUrl || "https://api.anthropic.com";
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/+$/, "") + "/v1/messages";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": activeKey,
        "anthropic-version": "2023-06-01"
      };

      const contentArray: any[] = [];
      if (isVision) {
        contentArray.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: base64Data
          }
        });
      }
      contentArray.push({
        type: "text",
        text: promptText
      });

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cleanModel || "claude-3-5-sonnet",
          max_tokens: 1200,
          messages: [{ role: "user", content: contentArray }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude analyze failed (${response.status}): ${errText}`);
      }

      const resData = await response.json() as any;
      resultText = resData?.content?.[0]?.text || "{}";

    } else {
      // OpenAI Compatible models (OpenAI, Doubao, DeepSeek, OpenRouter, SiliconFlow, Custom)
      let defaultUrl = "https://api.openai.com/v1";
      if (prov === "doubao") defaultUrl = "https://ark.cn-beijing.volces.com/api/v3";
      if (prov === "deepseek") defaultUrl = "https://api.deepseek.com/v1";
      if (prov === "openrouter") defaultUrl = "https://openrouter.ai/api/v1";
      if (prov === "siliconflow") defaultUrl = "https://api.siliconflow.cn/v1";

      let targetUrl = cleanBaseUrl || defaultUrl;
      if (!targetUrl.startsWith("http")) {
        targetUrl = "https://" + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/+$/, "") + "/chat/completions";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeKey}`
      };

      const isWattApi = cleanBaseUrl.toLowerCase().includes("rivtower.xyz") || cleanBaseUrl.toLowerCase().includes("watt-api");
      const defaultModel = isWattApi ? "qwen3.6-27b" :
                           prov === "openai" ? "gpt-4o-mini" : 
                           prov === "deepseek" ? "deepseek-chat" : 
                           prov === "doubao" ? "ep-xxxxxxxxxxxx" :
                           prov === "openrouter" ? "google/gemini-2.5-flash" :
                           prov === "siliconflow" ? "deepseek-ai/DeepSeek-V3" : "gpt-4o-mini";

      const contentArray: any[] = [];
      if (isVision) {
        contentArray.push({
          type: "text",
          text: promptText
        });
        contentArray.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Data}`
          }
        });
      } else {
        // Text-only fallback for non-vision compatible models (like search or standard text models)
        contentArray.push({
          type: "text",
          text: promptText + "\n(NOTE: Since the selected model does not support image analysis, you are analyzing based purely on sensor values and ambient preference states from the context prompt.)"
        });
      }

      let activeModel = cleanModel;
      if (activeModel === "gemini-2.5-flash" && prov !== "gemini" && prov !== "openrouter") {
        activeModel = ""; // Realignment override
      }

      const bodyData: any = {
        model: activeModel || defaultModel,
        messages: [{ role: "user", content: contentArray }]
      };

      // Add json object support if supported
      if (prov !== "openrouter") {
        bodyData.response_format = { type: "json_object" };
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI-compatible analyze failed (${response.status}): ${errText}`);
      }

      const resData = await response.json() as any;
      resultText = resData?.choices?.[0]?.message?.content || "{}";
    }

    // Dynamic robust parsing of JSON strings
    let parsedData: any = {};
    let cleaned = resultText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }
    parsedData = JSON.parse(cleaned);

    // Sanity conversions on targetBrightness & targetSoftness to guarantee floats
    if (typeof parsedData.targetBrightness === "string") {
      parsedData.targetBrightness = parseFloat(parsedData.targetBrightness) || 0.80;
    }
    if (typeof parsedData.targetSoftness === "string") {
      parsedData.targetSoftness = parseFloat(parsedData.targetSoftness) || 0.70;
    }

    res.json(parsedData);

  } catch (apiError: any) {
    console.log("[Lumi Diagnostics - Handled Fallback Option] API offline or invalid creds:", apiError?.message || apiError);

    // Provide a helpful system explanation indicating the error and provider state instead of just saying "cloud is busy"
    const displayMessageZh = `✨ [Lumi AI 异常自检] 无法调用您配置的 ${provider || 'AI'} 接口。错误提示: "${apiError?.message || 'Unauthorized Key or network timeout'}"。请点击右上角「设置」检查您的 API Key 或是 Base URL 端点配置后重试。目前已为您启动本地重力防抖补偿补光：`;
    const displayMessageEn = `✨ [Lumi AI Diagnostic] Unable to trace connection to your ${provider || 'AI'} provider. Message: "${apiError?.message || 'Access Denied'}" Please double check keys in top-right Settings. Active local responsive tuning running:`;

    const errSummaryZh = `由于 AI 服务链接中断（原因：${apiError?.message || '网络连接失效或无效 Key'}），Lumi 已为您顺畅切入本地微晶体传感器微调保护系统`;

    const errorFallback = {
      skinTone: "已通过多维传感器自习惯分析人像补光",
      brightness: "已自动调节至护眼黄金自研照度",
      shadows: "已自动减弱多角度细屑阴影，均匀填补泪沟",
      sceneCharacteristics: `Lumi 智能光控系统：自适应环境 (${simulatedScenario || '默认室内'})`,
      problems: errSummaryZh,
      recommendedPresetId: fallbackPreset,
      recommendedIntensity: "normal",
      targetBrightness: preferences?.averageBrightness || 0.80,
      targetSoftness: preferences?.averageSoftness || 0.70,
      reasoningZh: displayMessageZh,
      reasoningEn: displayMessageEn
    };

    res.json(errorFallback);
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
