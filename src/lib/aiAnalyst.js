// AI Analyst — generates insights from real appointment data
// No external API needed, runs entirely in the browser

export function generateInsights({ todayAppointments, weekCount, monthCount }) {
  const insights = [];
  const today = new Date();
  const dayName = today.toLocaleDateString("en", { weekday: "long" });
  const todayCount = todayAppointments.length;

  // Insight 1: Today's load
  if (todayCount === 0) {
    insights.push(
      `No bookings for ${dayName} yet. Consider sending a reminder to regular clients or posting a same-day discount on Instagram.`
    );
  } else if (todayCount <= 2) {
    insights.push(
      `Light day ahead with ${todayCount} booking${todayCount > 1 ? "s" : ""}. Good time for walk-ins or staff training.`
    );
  } else if (todayCount <= 5) {
    insights.push(
      `Solid ${dayName} — ${todayCount} appointments confirmed. Schedule is filling up nicely.`
    );
  } else {
    insights.push(
      `Busy day! ${todayCount} appointments today. Make sure all stations are prepped and consider adding buffer time between sessions.`
    );
  }
  // Insight 2: Popular services
  if (todayCount > 0) {
    const serviceCounts = {};
    todayAppointments.forEach((a) => {
      const s = a.service || "Unknown";
      serviceCounts[s] = (serviceCounts[s] || 0) + 1;
    });
    const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];
    if (topService) {
      insights.push(
        `Top service today: ${topService[0]} (${topService[1]} booking${topService[1] > 1 ? "s" : ""}). Consider promoting add-ons that pair well with it.`
      );
    }
  }

  // Insight 3: Week trend
  if (weekCount !== null) {
    const avgPerDay = weekCount / Math.max(today.getDay() || 7, 1);
    if (avgPerDay < 1) {
      insights.push(
        `This week averages less than 1 booking per day. Time to boost marketing — try a limited-time offer or Instagram story.`
      );
    } else if (avgPerDay < 3) {
      insights.push(
        `Averaging ${avgPerDay.toFixed(1)} bookings/day this week. Steady pace — a small promotion could push it higher.`
      );
    } else {
      insights.push(
        `Strong week — ${weekCount} total bookings so far, averaging ${avgPerDay.toFixed(1)}/day. Keep the momentum going.`
      );
    }
  }
  // Insight 4: Monthly performance
  if (monthCount !== null) {
    const dayOfMonth = today.getDate();
    const projectedMonth = Math.round((monthCount / dayOfMonth) * 30);
    insights.push(
      `Month projection: ~${projectedMonth} bookings by end of ${today.toLocaleDateString("en", { month: "long" })} (${monthCount} so far in ${dayOfMonth} days).`
    );
  }

  // Insight 5: Time-based tips
  const hour = today.getHours();
  if (hour < 10) {
    insights.push(
      "Morning tip: Check for any last-minute cancellations and open those slots for walk-ins."
    );
  } else if (hour < 14) {
    insights.push(
      "Midday tip: Lunch hours are prime for quick services. Promote express treatments."
    );
  } else if (hour < 18) {
    insights.push(
      "Afternoon tip: Start confirming tomorrow's appointments via WhatsApp to reduce no-shows."
    );
  } else {
    insights.push(
      "Evening wrap-up: Review today's performance and prep stations for tomorrow's first clients."
    );
  }

  return insights.slice(0, 4);
}