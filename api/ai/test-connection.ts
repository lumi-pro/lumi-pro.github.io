import type { VercelRequest, VercelResponse } from "@vercel/node";

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

  try {
    const { provider, apiKey, baseUrl, model } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "API Key is required." });
    }

    const cleanBaseUrl = (baseUrl || "").trim();
    const cleanModel = (model || "").trim();
    const prov = (provider || "gemini").toLowerCase();

    let testSuccess = false;
    let errorMessage = "";
    let systemMatchedName = "";

    if (prov === "gemini") {
      systemMatchedName = "Gemini";
      let targetUrl = cleanBaseUrl || "https://generativelanguage.googleapis.com";
      if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
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
        errorMessage = `Gemini failed (${response.status}): ${errText}`;
      }

    } else if (prov === "claude") {
      systemMatchedName = "Claude";
      let targetUrl = cleanBaseUrl || "https://api.anthropic.com";
      if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
      targetUrl = targetUrl.replace(/\/+$/, "") + "/v1/messages";

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
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
        errorMessage = `Claude failed (${response.status}): ${errText}`;
      }

    } else {
      const providerMapping: Record<string, string> = {
        openai: "OpenAI", doubao: "Doubao", deepseek: "DeepSeek",
        openrouter: "OpenRouter", siliconflow: "SiliconFlow", custom: "Custom"
      };
      systemMatchedName = providerMapping[prov] || "AI Provider";

      let defaultUrl = "https://api.openai.com/v1";
      if (prov === "doubao") defaultUrl = "https://ark.cn-beijing.volces.com/api/v3";
      if (prov === "deepseek") defaultUrl = "https://api.deepseek.com/v1";
      if (prov === "openrouter") defaultUrl = "https://openrouter.ai/api/v1";
      if (prov === "siliconflow") defaultUrl = "https://api.siliconflow.cn/v1";

      let targetUrl = cleanBaseUrl || defaultUrl;
      if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;
      targetUrl = targetUrl.replace(/\/+$/, "") + "/chat/completions";

      const defaultModel = prov === "openai" ? "gpt-4o-mini" :
                           prov === "deepseek" ? "deepseek-chat" :
                           prov === "doubao" ? "ep-xxxxxxxxxxxx" :
                           prov === "openrouter" ? "google/gemini-2.5-flash" :
                           prov === "siliconflow" ? "deepseek-ai/DeepSeek-V3" : "gpt-4o-mini";

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: cleanModel || defaultModel,
          messages: [{ role: "user", content: "Say OK in 1 word." }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        testSuccess = true;
      } else {
        const errText = await response.text();
        errorMessage = `${systemMatchedName} failed (${response.status}): ${errText}`;
      }
    }

    if (testSuccess) {
      return res.json({ success: true, message: `已连接到 ${systemMatchedName}`, provider: prov });
    } else {
      return res.json({ success: false, message: "测试连接失败", error: errorMessage });
    }

  } catch (err: any) {
    return res.json({
      success: false,
      message: "通信异常",
      error: err?.message || "Unknown error"
    });
  }
}
