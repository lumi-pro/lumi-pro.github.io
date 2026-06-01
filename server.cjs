var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "15mb" }));
app.use(import_express.default.urlencoded({ limit: "15mb", extended: true }));
var PORT = 3e3;
var ai = null;
var API_KEY = process.env.GEMINI_API_KEY;
if (API_KEY) {
  ai = new import_genai.GoogleGenAI({
    apiKey: API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
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
         'cream' (Cream Skin / \u5976\u6CB9\u808C) - soft warm glow, neutralizing skin dullness/redness.
         'love' (First Love / \u521D\u604B\u7C89) - fresh pinky glow, adding healthy warmth.
         'cold' (Ice White / \u51B7\u767D\u76AE) - clear cool white light, excellent to offset yellow lights.
         'sunset' (Sunset Glow / \u65E5\u843D\u6A58) - cinematic retro evening warm look.
         'moonlight' (Moonlight / \u6708\u5149\u84DD) - deep blue nighttime mystery atmosphere.
         'velvet_purple' (Velvet Purple / \u4E1D\u7ED2\u7D2B) - fancy twilight violet.
         'rosy_wine' (Rosy Wine / \u5FAE\u91BA\u7EA2) - romantic wine-warm.
         'aurora_cyan' (Aurora Cyan / \u6781\u5149\u9752) - calming light icy teal.
         'deep_peach' (Deep Peach / \u871C\u6843\u6696) - energetic summer orange.
         'sunset_rose' (Sunset Rose / \u665A\u971E\u7C89) - pastel pink purple mix.
         'studio_white' (Studio White / \u51B7\u767D\u5149) - professional pure white bright keylight.
         'warm_vanilla' (Warm Vanilla / \u9999\u8349\u7C73\u767D) - soft luxury vanilla linen.
         'pearl_glow' (Pearl Glow / \u73CD\u73E0\u5149) - refined glossy pearlescent glow.
         'soft_beige' (Soft Beige / \u5361\u5176\u6696) - minimalist designer neutral cozy warmth.
         'light_honey' (Light Honey / \u871C\u91D1\u5149) - sweet glowing luxury honey amber.
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
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            skinTone: { type: import_genai.Type.STRING },
            brightness: { type: import_genai.Type.STRING },
            shadows: { type: import_genai.Type.STRING },
            sceneCharacteristics: { type: import_genai.Type.STRING },
            problems: { type: import_genai.Type.STRING },
            recommendedPresetId: { type: import_genai.Type.STRING },
            recommendedIntensity: { type: import_genai.Type.STRING },
            targetBrightness: { type: import_genai.Type.NUMBER },
            targetSoftness: { type: import_genai.Type.NUMBER },
            reasoningZh: { type: import_genai.Type.STRING },
            reasoningEn: { type: import_genai.Type.STRING }
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
  } catch (error) {
    console.error("Gemini Vision API analysis error:", error);
    res.status(500).json({ error: error?.message || "Internal server error analyzing selfie frame" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumi Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
