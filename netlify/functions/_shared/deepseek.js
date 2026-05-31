// DeepSeek AI client (server-side) — OpenAI-compatible API
const API_URL = "https://api.deepseek.com/chat/completions";

export async function callDeepseek(apiKey, systemPrompt, userMessage, temperature = 0.7) {
  if (!apiKey) {
    console.error("DeepSeek error: DEEPSEEK_API_KEY is not set");
    return null;
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
        stream: false,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`DeepSeek error: HTTP ${res.status}`, errBody);
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error("DeepSeek error:", e.message);
    return null;
  }
}
