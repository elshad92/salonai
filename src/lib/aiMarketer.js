import { askGemini } from "./gemini";

export async function generatePostsAI(salonName = "SalonAI") {
  const prompt = `You are an expert Instagram marketer for a beauty salon called "${salonName}".
Generate exactly 5 Instagram posts. Mix these types: 1 promo, 2 engagement, 1 tip, 1 seasonal.

For each post return EXACTLY this format (no extra text):
TYPE: promo|engagement|tip|seasonal
TEXT: the caption text with emojis
TAGS: 5-6 relevant hashtags
TIME: best posting time (e.g. 9:00 AM)
---

Make posts trendy, use current social media language, include emojis. Keep captions under 150 words.`;

  const result = await askGemini(prompt);
  if (result) {
    const posts = [];
    const blocks = result.split("---").map(b => b.trim()).filter(Boolean);
    for (let i = 0; i < blocks.length && posts.length < 5; i++) {
      const b = blocks[i];
      const type = b.match(/TYPE:\s*(\w+)/i)?.[1]?.toLowerCase() || "engagement";
      const text = b.match(/TEXT:\s*([\s\S]*?)(?=TAGS:|$)/i)?.[1]?.trim() || "";
      const tags = b.match(/TAGS:\s*(.*)/i)?.[1]?.trim() || "#SalonLife #HairGoals";
      const time = b.match(/TIME:\s*(.*)/i)?.[1]?.trim() || "12:00 PM";
      if (text.length > 10) {
        posts.push({ id: i+1, type, text, hashtags: tags, bestTime: time });
      }
    }
    if (posts.length >= 3) return posts;
  }
  return generatePostsFallback();
}
function generatePostsFallback() {
  const templates = [
    { type:"promo", text:"✨ This week only — 15% off all color services! Book your transformation now. Link in bio 👆", hashtags:"#SalonDeal #HairGoals #ColorSpecial #BookNow #SalonLife", bestTime:"9:00 AM" },
    { type:"engagement", text:"What's your go-to salon service? 💇‍♀️ Drop it below!", hashtags:"#SalonLife #HairCommunity #SelfCare #GlowUp #BeautyTips", bestTime:"12:00 PM" },
    { type:"tip", text:"💡 Pro tip: Use a silk pillowcase to reduce frizz and breakage while you sleep. Your hair will thank you!", hashtags:"#HairTips #ProTips #HealthyHair #SalonAdvice #HairCare", bestTime:"5:00 PM" },
    { type:"engagement", text:"Tag someone who deserves a self-care day 💆‍♀️ They'll love you for it!", hashtags:"#SelfCare #TreatYourself #SalonDay #GlowUp #BeautyTime", bestTime:"7:00 PM" },
    { type:"seasonal", text:"Summer is coming! ☀️ Protect your color with our UV treatment. Limited appointments available.", hashtags:"#SummerHair #UVProtection #ColorCare #SalonLife #BookNow", bestTime:"10:00 AM" },
  ];
  return templates.map((t,i) => ({ ...t, id: i+1 }));
}

export { generatePostsFallback as generatePosts };