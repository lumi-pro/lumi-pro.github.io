import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasOpenaiKey: !!process.env.OPENAI_API_KEY,
  });
}
