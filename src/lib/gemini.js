// Gemini AI client for SalonAI agents
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function askGemini(prompt, systemPrompt = "") {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key || key === "PASTE_YOUR_KEY_HERE") {
    return null; // fallback to templates
  }

  try {
    const contents = [];
    if (systemPrompt) {
      contents.push({ role: "user", parts: [{ text: systemPrompt }] });
      contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const res = await fetch(API_URL + "?key=" + key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}