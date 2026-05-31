// DeepSeek AI client — OpenAI-compatible API
const API_URL = "https://api.deepseek.com/chat/completions";

export async function askDeepseek(prompt, systemPrompt = "", temperature = 0.7) {
  const key = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!key) return null;

  try {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature,
        stream: false,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}
