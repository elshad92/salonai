import { askGemini } from "./gemini";

// AI Analyst — generates insights from real appointment data
// Uses Gemini when available, falls back to templates

export async function generateInsightsAI({ todayAppointments, weekCount, monthCount }) {
  const today = new Date();
  const prompt = `You are an AI business analyst for a beauty salon. Based on this data, give exactly 4 short actionable insights (1-2 sentences each). Be specific with numbers.

Data:
- Today (${today.toLocaleDateString("en", { weekday: "long" })}): ${todayAppointments.length} appointments
- This week total: ${weekCount} appointments
- This month total: ${monthCount} appointments
- Today's services: ${todayAppointments.map(a => a.service).join(", ") || "none yet"}
- Current time: ${today.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}

Format: Return exactly 4 insights, one per line. No numbering, no bullets. Just the insight text.`;

  const result = await askGemini(prompt);
  if (result) {
    const lines = result.split("\n").map(l => l.trim()).filter(l => l.length > 10);
    if (lines.length >= 3) return lines.slice(0, 4);
  }

  // Fallback to template insights
  return generateInsightsFallback({ todayAppointments, weekCount, monthCount });
}
function generateInsightsFallback({ todayAppointments, weekCount, monthCount }) {
  const insights = [];
  const today = new Date();
  const todayCount = todayAppointments.length;

  if (todayCount === 0) {
    insights.push("No bookings yet today. Consider sending a reminder to regular clients or posting a same-day discount.");
  } else if (todayCount <= 2) {
    insights.push(`Light day with ${todayCount} booking${todayCount > 1 ? "s" : ""}. Good time for walk-ins or staff training.`);
  } else {
    insights.push(`Busy day — ${todayCount} appointments! Make sure all stations are prepped.`);
  }

  if (todayCount > 0) {
    const sc = {};
    todayAppointments.forEach(a => { sc[a.service] = (sc[a.service]||0)+1; });
    const top = Object.entries(sc).sort((a,b) => b[1]-a[1])[0];
    if (top) insights.push(`Top service today: ${top[0]} (${top[1]}x). Promote add-ons that pair well.`);
  }

  if (weekCount !== null) {
    const avg = weekCount / Math.max(today.getDay() || 7, 1);
    insights.push(`Week average: ${avg.toFixed(1)} bookings/day (${weekCount} total).`);
  }

  if (monthCount !== null) {
    const proj = Math.round((monthCount / today.getDate()) * 30);
    insights.push(`Month projection: ~${proj} bookings by end of ${today.toLocaleDateString("en",{month:"long"})}.`);
  }

  return insights.slice(0, 4);
}

export { generateInsightsFallback as generateInsights };