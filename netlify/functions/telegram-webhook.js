// Telegram AI Administrator — Webhook Handler
// Receives updates from Telegram Bot API, processes via Gemini, books appointments in Supabase
import {
  createSupabase,
  loadConversationHistory,
  buildSystemPrompt,
  callGemini,
  parseAction,
  bookAppointment,
  persistConversation,
} from "./_shared/conversation-engine.js";

// ─── In-memory rate limiter ───────────────────────────────────────────────────
const rateMap = new Map();
const RATE_LIMIT  = 30;
const RATE_WINDOW = 60_000;

function isRateLimited(ip) {
  const now   = Date.now();
  const entry = rateMap.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  rateMap.set(ip, entry);
  return entry.count > RATE_LIMIT;
}

async function sendTelegramMessage(botToken, chatId, text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Telegram sendMessage error:", err);
    }
  } catch (e) {
    console.error("Telegram sendMessage exception:", e.message);
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const ip = event.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return { statusCode: 429, body: "Too Many Requests" };
  }

  // Telegram sends the secret_token (set during setWebhook) as this header.
  // We use the salon_id as the secret token so we can route to the right salon.
  const salonId = event.headers["x-telegram-bot-api-secret-token"];
  if (!salonId) {
    return { statusCode: 403, body: "Forbidden" };
  }

  let update;
  try {
    update = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Bad Request" };
  }

  const message = update.message || update.edited_message;
  if (!message?.text) {
    // Silently ack non-text updates (stickers, photos, etc.)
    return { statusCode: 200, body: "ok" };
  }

  const chatId   = message.chat.id;
  const msgBody  = message.text.trim();
  const fromName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean).join(" ") || "Client";
  const clientId = `telegram:${chatId}`;

  const supabase = createSupabase();

  // Look up salon integration using the salon_id from the secret token
  const { data: integration, error: intErr } = await supabase
    .from("salon_integrations")
    .select("*, salons(*)")
    .eq("salon_id", salonId)
    .eq("provider", "telegram")
    .eq("enabled", true)
    .maybeSingle();

  if (intErr || !integration?.telegram_bot_token) {
    console.error("No active Telegram integration for salon", salonId, intErr?.message);
    return { statusCode: 200, body: "ok" };
  }

  const salon     = integration.salons;
  const botToken  = integration.telegram_bot_token;
  const geminiKey = process.env.GEMINI_KEY || process.env.VITE_GEMINI_KEY;

  const historyText  = await loadConversationHistory(supabase, salon.id, clientId);
  const services     = Array.isArray(salon.services)     ? salon.services     : [];
  const masters      = Array.isArray(salon.masters)      ? salon.masters      : [];
  const workingHours = salon.working_hours || { start: "09:00", end: "18:00" };

  const systemPrompt = buildSystemPrompt(salon, services, masters, workingHours, historyText, "telegram");
  const aiResponse   = await callGemini(geminiKey, systemPrompt, msgBody);

  if (!aiResponse) {
    await sendTelegramMessage(
      botToken, chatId,
      "I'm having trouble right now. Please try again in a moment or call us directly."
    );
    return { statusCode: 200, body: "ok" };
  }

  const action    = parseAction(aiResponse);
  const replyText = aiResponse.replace(/```ACTION[\s\S]*?END_ACTION```/g, "").trim();

  if (action) {
    if (action.type === "book") {
      if (!action.client_name) action.client_name = fromName;
      await bookAppointment(supabase, salon.id, action, clientId, "telegram");
    } else if (action.type === "cancel" && action.appointment_id) {
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", action.appointment_id)
        .eq("salon_id", salon.id);
    }
  }

  await persistConversation(supabase, salon.id, clientId, msgBody, replyText, action, "telegram");
  await sendTelegramMessage(botToken, chatId, replyText);

  return { statusCode: 200, body: "ok" };
};
