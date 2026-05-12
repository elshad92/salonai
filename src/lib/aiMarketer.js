// AI Marketer — generates Instagram post ideas based on salon data

const postTemplates = [
  {
    type: "promo",
    templates: [
      "✨ {service} Special This Week! Book now and get 15% off your first visit. Link in bio 👆",
      "💫 Transform your look with our {service} service. Limited slots available this week!",
      "🌟 New week, new you! Our {master} has openings for {service}. Don't miss out!",
    ],
  },
  {
    type: "engagement",
    templates: [
      "What's your go-to salon service? 💇‍♀️ Drop a comment below!",
      "Monday mood: fresh hair, fresh start ✨ Who's booking this week?",
      "Tag someone who needs a self-care day 💆‍♀️",
      "Before & after transformations are our favorite thing. Stay tuned! 🔥",
    ],
  },
  {
    type: "tip",
    templates: [
      "💡 Pro tip: {tip}",
      "Did you know? {tip} Book a consultation to learn more!",
      "Your hair deserves the best. Here's a tip from our experts: {tip}",
    ],
  },
];
const tips = [
  "Deep conditioning once a week keeps your hair healthier between salon visits",
  "Avoid washing color-treated hair for 48 hours after your appointment",
  "Use a silk pillowcase to reduce frizz and breakage while you sleep",
  "Heat protectant is non-negotiable before using any hot tools",
  "Regular trims every 6-8 weeks prevent split ends from traveling up",
  "Cold water rinse after conditioning seals the cuticle for extra shine",
];

const services = ["Haircut", "Color & Tone", "Blowout", "Keratin Treatment"];
const masters = ["Emma Wilson", "Olivia Brown", "Mia Johnson"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generatePosts(count = 5) {
  const posts = [];
  const usedTypes = [];

  for (let i = 0; i < count; i++) {
    const typeIndex = i % postTemplates.length;
    const category = postTemplates[typeIndex];
    let template = pick(category.templates);

    template = template
      .replace("{service}", pick(services))
      .replace("{master}", pick(masters))
      .replace("{tip}", pick(tips));

    posts.push({
      id: i + 1,
      type: category.type,
      text: template,
      hashtags: generateHashtags(category.type),
      bestTime: pick(["9:00 AM", "12:00 PM", "5:00 PM", "7:00 PM"]),
    });
  }

  return posts;
}

function generateHashtags(type) {
  const base = ["#SalonLife", "#HairGoals", "#BeautyTips"];
  if (type === "promo") return [...base, "#SalonDeal", "#BookNow", "#HairSpecial"].join(" ");
  if (type === "engagement") return [...base, "#HairCommunity", "#SelfCare", "#GlowUp"].join(" ");
  return [...base, "#HairTips", "#ProTips", "#HealthyHair"].join(" ");
}