import type { VercelRequest, VercelResponse } from "@vercel/node";

function supportsVision(provider: string, model: string): boolean {
  const p = (provider || "").toLowerCase();
  const m = (model || "").toLowerCase();
  if (p === "deepseek" || p === "custom" || p === "doubao") return false;
  if (m.includes("deepseek-chat") || m.includes("deepseek-r1") || m.includes("deepseek-v3") || m.includes("reasoner")) {
    return false;
  }
  if (m.includes("qwen") && !m.includes("vl") && !m.includes("vision")) return false;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const {
    image,
    ambientStats,
    preferences,
    simulatedScenario,
    apiEndpoint,
    apiKey,
    provider,
    model,
  } = req.body;

  let fallbackPreset = preferences?.favoritePresetId || "cream";
  if (ambientStats) {
    const isDark = (ambientStats.brightness || 100) < 60;
    const isWarm = (ambientStats.warmth || 1.0) > 1.15;
    if (isWarm) fallbackPreset = "cold";
    else if (isDark) fallbackPreset = "moonlight";
  }

  const availableIds = [
    'cream', 'love', 'cold', 'sunset', 'moonlight', 'velvet_purple',
    'rosy_wine', 'aurora_cyan', 'deep_peach', 'studio_white', 'pearl_glow', 'light_honey',
    'special_blood_boost', 'special_cold_white', 'special_soft_sweet', 'special_korean_dewy',
    'special_ambient_mood', 'special_anti_dullness', 'special_natural_daylight', 'special_sunset_glow',
    'special_acne_corrector'
  ];
  if (!availableIds.includes(fallbackPreset)) fallbackPreset = "cream";

  const activeKey = apiKey || (provider === "gemini" || !provider ? process.env.GEMINI_API_KEY : "");
  if (!activeKey) {
    return res.status(403).json({
      error: true,
      message: "API Key 未配置。请在设置中填写您的 API Key 后重试。"
    });
  }

  try {
    if (!image) {
      throw new Error("Missing 'image' base64 payload");
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    let metadataPrompt = "";
    if (ambientStats || preferences || simulatedScenario) {
      metadataPrompt = `
      [USER ENVIRONMENT SENSOR & PREFERENCE DECK]:
      - User Preferred Aesthetic Style: ${preferences?.styleMode || 'natural'}
      - User Favorite Preset: ${preferences?.favoritePresetId || 'none'}
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
      Analyze the provided camera viewfinder selfie frame from the user.
      Perform a highly intelligent, premium, multi-layered aesthetic and lighting evaluation.

      1. PORTRAIT ANALYSIS: skin tone warmth/coolness, transparency, facial shadows, dark circles, dimensionality, makeup style.
         - If yellowish skin and fatigued under-eye circles detected, recommend cool corrective fill like 'special_cold_white' or 'cold', NEVER warm-cast yellow lights.

      2. BACKGROUND SCENARIO ANALYSIS: Identify context (Office, home, cafe, night scene, etc.).
         - If background is already yellow/warm, AVOID recommending warm orange fill lights.

      3. SELFIE INTENTION INFERENCE:
         - Professional/Daily Commute → 'cream', 'special_anti_dullness', 'studio_white'
         - Social Sharing/Glamorous → 'special_soft_sweet', 'love', 'pearl_glow', 'special_korean_dewy'
         - Artistic Ambient/Atmospheric → 'special_ambient_mood', 'moonlight', 'velvet_purple'

      4. USER HABITS & MEMORY INTEGRATION: Incorporate user's favorite preset or preferences.

      LANGUAGE: Warm, encouraging, professional tone. Summaries in both Chinese (reasoningZh) and English (reasoningEn). AVOID technical numbers.

      AVAILABLE PRESETS: 'cream', 'love', 'cold', 'sunset', 'moonlight', 'velvet_purple', 'rosy_wine', 'aurora_cyan', 'deep_peach', 'studio_white', 'pearl_glow', 'light_honey', 'special_blood_boost', 'special_cold_white', 'special_soft_sweet', 'special_korean_dewy', 'special_ambient_mood', 'special_anti_dullness', 'special_natural_daylight', 'special_sunset_glow', 'special_acne_corrector'

      ${metadataPrompt}

      CRITICAL: Output a valid JSON object with keys: ${schemaKeys.join(", ")}.
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
      if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
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
        uploadParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
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
      if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
      if (!targetUrl.includes("/messages")) {
        if (!targetUrl.includes("/v1")) {
          targetUrl = targetUrl.replace(/\/+$/, "") + "/v1/messages";
        } else {
          targetUrl = targetUrl.replace(/\/+$/, "") + "/messages";
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": activeKey,
        "anthropic-version": "2023-06-01"
      };

      const contentArray: any[] = [];
      if (isVision) {
        contentArray.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } });
      }
      contentArray.push({ type: "text", text: promptText });

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
      let defaultUrl = "https://api.openai.com/v1";
      if (prov === "doubao") defaultUrl = "https://ark.cn-beijing.volces.com/api/v3";
      if (prov === "deepseek") defaultUrl = "https://api.deepseek.com/v1";
      if (prov === "openrouter") defaultUrl = "https://openrouter.ai/api/v1";
      if (prov === "siliconflow") defaultUrl = "https://api.siliconflow.cn/v1";

      let targetUrl = cleanBaseUrl || defaultUrl;
      if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
      targetUrl = targetUrl.replace(/\/+$/, "");
      if (!targetUrl.includes("/chat/completions")) {
        targetUrl = targetUrl + "/chat/completions";
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeKey}`
      };

      const isWattApi = cleanBaseUrl.toLowerCase().includes("rivtower.xyz") || cleanBaseUrl.toLowerCase().includes("watt-api");
      const defaultModel = isWattApi ? "qwen3.6-27b" :
                           prov === "openai" ? "gpt-4o-mini" :
                           prov === "deepseek" ? "deepseek-chat" :
                           prov === "doubao" ? "doubao-1.5-pro-32k" :
                           prov === "openrouter" ? "google/gemini-2.5-flash" :
                           prov === "siliconflow" ? "deepseek-ai/DeepSeek-V3" : "gpt-4o-mini";

      const contentArray: any[] = [];
      if (isVision) {
        contentArray.push({ type: "text", text: promptText });
        contentArray.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } });
      } else {
        contentArray.push({ type: "text", text: promptText + "\n(NOTE: Analyze based purely on sensor values since this model does not support images.)" });
      }

      let activeModel = cleanModel;
      if (activeModel === "gemini-2.5-flash" && prov !== "gemini" && prov !== "openrouter") {
        activeModel = ""; // Fallback to defaultModel for this specific provider
      }

      const bodyData: any = {
        model: activeModel || defaultModel,
        messages: [{ role: "user", content: contentArray }]
      };

      if (prov !== "openrouter" && prov !== "custom" && prov !== "doubao") {
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

    let parsedData: any = {};
    let cleaned = resultText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }
    parsedData = JSON.parse(cleaned);

    if (typeof parsedData.targetBrightness === "string") {
      parsedData.targetBrightness = parseFloat(parsedData.targetBrightness) || 0.80;
    }
    if (typeof parsedData.targetSoftness === "string") {
      parsedData.targetSoftness = parseFloat(parsedData.targetSoftness) || 0.70;
    }

    return res.status(200).json(parsedData);

  } catch (apiError: any) {
    console.warn("Lumi Vision API error:", apiError?.message);

    return res.status(502).json({
      error: true,
      message: apiError?.message || "Unknown API error",
      provider: provider || "unknown"
    });
  }
}
