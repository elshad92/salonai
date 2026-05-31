import { askAI } from "./ai";

export async function generatePostsAI(salonName = "SalonAI", services = "", tone = "professional") {
  const svcHint = services ? ` specializing in ${services}` : "";
  const toneHint =
    tone === "fun" ? "fun, playful, casual, uses humor" :
    tone === "trendy" ? "trendy, Gen-Z, viral, bold" :
    "professional, warm, trustworthy";

  const prompt = `You are an expert Instagram marketer for a beauty salon called "${salonName}"${svcHint}.
Tone: ${toneHint}.
Generate exactly 5 Instagram posts. Mix types: 1 promo, 2 engagement, 1 tip, 1 seasonal.

For each post return EXACTLY this format (no extra text):
TYPE: promo|engagement|tip|seasonal
TEXT: the caption text with emojis
TAGS: 5-6 relevant hashtags
TIME: best posting time (e.g. 9:00 AM)
VISUAL: brief image idea (e.g. "Before/after split of balayage" or "Flat lay of tools on marble")
---

Make posts engaging, include emojis. Keep captions under 150 words.`;

  const result = await askAI(prompt, "", 0.7);
  if (result) {
    const posts = [];
    const blocks = result.split("---").map(b => b.trim()).filter(Boolean);
    for (let i = 0; i < blocks.length && posts.length < 5; i++) {
      const b = blocks[i];
      const type = b.match(/TYPE:\s*(\w+)/i)?.[1]?.toLowerCase() || "engagement";
      const text = b.match(/TEXT:\s*([\s\S]*?)(?=TAGS:|$)/i)?.[1]?.trim() || "";
      const tags = b.match(/TAGS:\s*(.*)/i)?.[1]?.trim() || "#SalonLife #HairGoals";
      const time = b.match(/TIME:\s*(.*)/i)?.[1]?.trim() || "12:00 PM";
      const visual = b.match(/VISUAL:\s*(.*)/i)?.[1]?.trim() || "";
      if (text.length > 10) {
        posts.push({ id: i + 1, type, text, hashtags: tags, bestTime: time, visual });
      }
    }
    if (posts.length >= 3) return posts;
  }
  return generatePostsFallback();
}

function generatePostsFallback() {
  return [
    { type: "promo", text: "✨ This week only — 15% off all color services! Book your transformation now. Link in bio 👆", hashtags: "#SalonDeal #HairGoals #ColorSpecial #BookNow #SalonLife", bestTime: "9:00 AM", visual: "Freshly colored hair under warm studio lighting, vibrant and glossy" },
    { type: "engagement", text: "What's your go-to salon service? 💇‍♀️ Drop it below!", hashtags: "#SalonLife #HairCommunity #SelfCare #GlowUp #BeautyTips", bestTime: "12:00 PM", visual: "Flat lay of styling tools arranged on marble counter" },
    { type: "tip", text: "💡 Pro tip: Use a silk pillowcase to reduce frizz and breakage while you sleep. Your hair will thank you!", hashtags: "#HairTips #ProTips #HealthyHair #SalonAdvice #HairCare", bestTime: "5:00 PM", visual: "Close-up of silk pillowcase with a few hair accessories, soft pastel tones" },
    { type: "engagement", text: "Tag someone who deserves a self-care day 💆‍♀️ They'll love you for it!", hashtags: "#SelfCare #TreatYourself #SalonDay #GlowUp #BeautyTime", bestTime: "7:00 PM", visual: "Client relaxing in salon chair, soft ambient lighting, warm atmosphere" },
    { type: "seasonal", text: "Summer is coming! ☀️ Protect your color with our UV treatment. Limited appointments available.", hashtags: "#SummerHair #UVProtection #ColorCare #SalonLife #BookNow", bestTime: "10:00 AM", visual: "Sun-kissed hair at golden hour, beach or outdoor natural light" },
  ].map((t, i) => ({ ...t, id: i + 1 }));
}

export { generatePostsFallback as generatePosts };
