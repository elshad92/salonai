// AI provider switcher (server-side) — set AI_PROVIDER=gemini to use Gemini, default is DeepSeek
import { callDeepseek } from "./deepseek.js";
import { callGemini } from "./conversation-engine.js";

export async function callAI(systemPrompt, userMessage, temperature = 0.7) {
  const provider = process.env.AI_PROVIDER || "deepseek";
  if (provider === "gemini") {
    const key = process.env.GEMINI_KEY || process.env.VITE_GEMINI_KEY;
    return callGemini(key, systemPrompt, userMessage);
  }
  const key = process.env.DEEPSEEK_API_KEY;
  return callDeepseek(key, systemPrompt, userMessage, temperature);
}
