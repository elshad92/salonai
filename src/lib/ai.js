// AI provider switcher — set VITE_AI_PROVIDER=gemini to use Gemini, default is DeepSeek
import { askGemini } from "./gemini";
import { askDeepseek } from "./deepseek";

const useGemini = import.meta.env.VITE_AI_PROVIDER === "gemini";

export function askAI(prompt, systemPrompt = "", temperature = 0.7) {
  return useGemini ? askGemini(prompt, systemPrompt) : askDeepseek(prompt, systemPrompt, temperature);
}
