<div align="center">

# ✨ Lumi AI Ambient Selfie System

**AI 驱动的实时智能自拍补光系统**

Your phone screen becomes a smart lighting assistant — no extra hardware needed.

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)]()

</div>

---

## 🌟 Features

### AI Scene Recognition
- Real-time analysis of environment brightness, light temperature, face lighting, and background atmosphere
- Auto-detects ambient conditions and generates personalized lighting suggestions

### AI Smart Lighting Recommendations
- One-tap "Optimize Selfie Lighting" — AI analyzes your face + environment and recommends the best lighting preset
- Auto-adjusts brightness, softness, and color temperature
- 21 built-in fill-light presets including natural, cool white, soft pink, cinematic mood, moonlight, etc.

### Multi-Provider AI Support
Configure any AI provider in settings — no hardcoded dependencies:

| Provider | Default Model | Vision |
|---|---|---|
| **Google Gemini** | gemini-2.5-flash | Yes |
| **OpenAI** | gpt-4o-mini | Yes |
| **Claude (Anthropic)** | claude-3-5-sonnet | Yes |
| **DeepSeek** | deepseek-chat | Text-only |
| **Doubao (火山方舟)** | doubao-1.5-pro-32k | Text-only |
| **OpenRouter** | google/gemini-2.5-flash | Yes |
| **SiliconFlow (硅基流动)** | deepseek-ai/DeepSeek-V3 | Text-only |
| **Custom (OpenAI Compatible)** | User-defined | Text-only |

### Real-Time Immersive Lighting
- Phone screen as dynamic light source with full-screen lighting
- Adjust brightness, color temperature, softness, and ambient glow in real time
- Camera captures at native resolution (up to 1920×2560), download at full quality (JPEG quality 1.0)

### Scene Preference Memory
- Remembers your preferred lighting per scene (brightness + warmth + time + location)
- Auto-restores your favorite settings when similar conditions are detected

### 21 Fill-Light Presets
`cream` · `love` · `cold` · `sunset` · `moonlight` · `velvet_purple` · `rosy_wine` · `aurora_cyan` · `deep_peach` · `studio_white` · `pearl_glow` · `light_honey` · `special_blood_boost` · `special_cold_white` · `special_soft_sweet` · `special_korean_dewy` · `special_ambient_mood` · `special_anti_dullness` · `special_natural_daylight` · `special_sunset_glow` · `special_acne_corrector`

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         React + Vite + TailwindCSS v4            │
│    (CameraView · SettingsModal · App.tsx)        │
└──────────────┬──────────────────┬────────────────┘
               │                  │
        Backend Proxy      Frontend Direct
        (Express/Node)     Fallback (Browser)
               │                  │
┌──────────────┴──────────────────┴────────────────┐
│              AI Provider APIs                     │
│  Gemini · OpenAI · Claude · DeepSeek · Doubao    │
│  OpenRouter · SiliconFlow · Custom               │
└──────────────────────────────────────────────────┘
```

**Dual call path:**
- **Primary**: Express backend proxy (`server.ts`) — runs locally via `npm run dev` or as Vercel Serverless Functions (`api/`)
- **Fallback**: Frontend direct API call — automatically triggered when backend is unreachable (e.g. static hosting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18

### 1. Clone & Install

```bash
git clone https://github.com/yeboye2025-ai/lumi-pro.git
cd lumi-pro
npm install
```

### 2. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser (mobile recommended).

### 3. Configure AI Provider

Open the **Settings** gear icon in the app:

1. Select your **AI Provider** (e.g. Gemini, OpenAI, DeepSeek, etc.)
2. Enter your **API Key**
3. Click **Test Connection** to verify
4. Done! Tap "✨ Optimize Selfie Lighting" to start

> Model name is auto-filled per provider. Expand **Advanced (Model Override)** if you need a custom model.

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Vercel Serverless Functions in `api/` handle API proxying automatically.

---

## 📂 Project Structure

```
lumi-pro/
├── server.ts                    # Express backend (multi-provider API proxy)
├── api/
│   ├── gemini/analyze.ts        # Vercel Serverless — AI analysis endpoint
│   ├── ai/test-connection.ts    # Vercel Serverless — connection test
│   └── health.ts                # Vercel Serverless — health check
├── vercel.json                  # Vercel routing config
├── src/
│   ├── App.tsx                  # Main app (AI scan, presets, download, scene memory)
│   ├── types.ts                 # TypeScript type definitions
│   └── components/
│       ├── CameraView.tsx       # Camera capture (native resolution, JPEG 1.0)
│       └── SettingsModal.tsx    # Provider config, API key, model override
├── package.json
└── README.md
```

---

## 🔑 API Key Requirement

- **No API key = no fill-light recommendations.** The app requires a valid AI provider key to function.
- API keys are stored in your browser's `localStorage` only — never sent to any server other than your configured provider.
- If the API call fails, the app shows an error toast with no fallback preset switching.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, TailwindCSS v4, Lucide Icons, Motion |
| Backend | Express.js, Node.js, TypeScript |
| Deployment | Vercel Serverless Functions |
| AI Providers | Gemini, OpenAI, Anthropic, DeepSeek, Doubao, OpenRouter, SiliconFlow, Custom |

---

## 📜 License

[MIT](LICENSE)

---

<div align="center">
Built with ✨ by <a href="https://github.com/yeboye2025-ai">yeboye2025-ai</a>
</div>
