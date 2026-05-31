// WhatsApp AI Administrator — Webhook Handler (Twilio transport)
// Receives messages from Twilio WhatsApp, processes via Gemini, books appointments in Supabase
import crypto from "crypto";
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

// ─── Twilio request signature validation ─────────────────────────────────────
function validateTwilioSignature(authToken, signature, url, params) {
  if (!authToken || !signature) return false;
  const sortedKeys = Object.keys(params).sort();
  const data = url + sortedKeys.map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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

  const params  = new URLSearchParams(event.body || "");
  const fromRaw = params.get("From") || ""; // whatsapp:+1234567890
  const toRaw   = params.get("To")   || ""; // salon's WhatsApp number
  const msgBody = (params.get("Body") || "").trim();

  if (!fromRaw || !toRaw || !msgBody) {
    return twiml("Sorry, I could not process your message. Please try again.");
  }

  const supabase = createSupabase();

  const { data: integration, error: intErr } = await supabase
    .from("salon_integrations")
    .select("*, salons(*)")
    .eq("phone_number", toRaw)
    .eq("provider", "twilio")
    .eq("enabled", true)
    .maybeSingle();

  if (intErr || !integration) {
    console.error("No active Twilio integration for", toRaw, intErr?.message);
    return twiml(
      "This salon is not currently accepting WhatsApp bookings. Please call us directly."
    );
  }

  // Validate Twilio signature
  const twilioSignature = event.headers["x-twilio-signature"] || "";
  const webhookUrl      = `https://${event.headers.host}/api/whatsapp-webhook`;
  const bodyParams      = Object.fromEntries(params.entries());
  if (!validateTwilioSignature(integration.auth_token, twilioSignature, webhookUrl, bodyParams)) {
    console.warn("Invalid Twilio signature from", ip);
    return { statusCode: 403, body: "Forbidden" };
  }

  const salon     = integration.salons;
  const geminiKey = process.env.GEMINI_KEY || process.env.VITE_GEMINI_KEY;

  const historyText  = await loadConversationHistory(supabase, salon.id, fromRaw);
  const services     = Array.isArray(salon.services)     ? salon.services     : [];
  const masters      = Array.isArray(salon.masters)      ? salon.masters      : [];
  const workingHours = salon.working_hours || { start: "09:00", end: "18:00" };

  const systemPrompt = buildSystemPrompt(salon, services, masters, workingHours, historyText, "WhatsApp");
  const aiResponse   = await callGemini(geminiKey, systemPrompt, msgBody);

  if (!aiResponse) {
    return twiml(
      "I'm having trouble right now. Please try again in a moment or call us directly."
    );
  }

  const action    = parseAction(aiResponse);
  const replyText = aiResponse.replace(/```ACTION[\s\S]*?END_ACTION```/g, "").trim();

  if (action) {
    if (action.type === "book") {
      await bookAppointment(supabase, salon.id, action, fromRaw, "whatsapp");
    } else if (action.type === "cancel" && action.appointment_id) {
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", action.appointment_id)
        .eq("salon_id", salon.id);
    }
  }

  await persistConversation(supabase, salon.id, fromRaw, msgBody, replyText, action, "whatsapp");
  return twiml(replyText);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function twiml(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
  };
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
