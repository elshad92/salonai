// WhatsApp AI Administrator — Webhook Handler
// Receives messages from Twilio WhatsApp, processes via Gemini, books appointments in Supabase
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ─── In-memory rate limiter (resets when function cold-starts) ───────────────
const rateMap = new Map(); // ip → { count, windowStart }
const RATE_LIMIT = 30;     // max requests per window
const RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
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
  const data = url + sortedKeys.map(k => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // timingSafeEqual requires same length; pad to avoid timing oracle on length diff
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── Entry point ────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Rate limit by source IP
  const ip = event.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return { statusCode: 429, body: "Too Many Requests" };
  }

  // Parse Twilio's URL-encoded body
  const params = new URLSearchParams(event.body || "");
  const fromRaw = params.get("From") || ""; // whatsapp:+1234567890
  const toRaw   = params.get("To")   || ""; // salon's WhatsApp number
  const msgBody = (params.get("Body") || "").trim();

  if (!fromRaw || !toRaw || !msgBody) {
    return twiml("Sorry, I could not process your message. Please try again.");
  }

  // Supabase with service role (bypasses RLS for writes)
  const supabase = createClient(
    process.env.SUPABASE_URL        || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  // Find salon integration by the Twilio phone number that received the message
  const { data: integration, error: intErr } = await supabase
    .from("salon_integrations")
    .select("*, salons(*)")
    .eq("phone_number", toRaw)
    .eq("provider", "twilio")
    .eq("enabled", true)
    .maybeSingle();

  if (intErr || !integration) {
    console.error("No active integration for", toRaw, intErr?.message);
    return twiml(
      "This salon is not currently accepting WhatsApp bookings. Please call us directly."
    );
  }

  // Validate Twilio signature using this salon's auth token
  const twilioSignature = event.headers["x-twilio-signature"] || "";
  const webhookUrl = `https://${event.headers.host}/api/whatsapp-webhook`;
  const bodyParams = Object.fromEntries(params.entries());
  if (!validateTwilioSignature(integration.auth_token, twilioSignature, webhookUrl, bodyParams)) {
    console.warn("Invalid Twilio signature from", ip);
    return { statusCode: 403, body: "Forbidden" };
  }

  const salon = integration.salons;

  // Load last 10 messages from this client for context
  const { data: history } = await supabase
    .from("whatsapp_conversations")
    .select("role, message")
    .eq("salon_id", salon.id)
    .eq("client_phone", fromRaw)
    .order("created_at", { ascending: false })
    .limit(10);

  const historyText = (history || [])
    .reverse()
    .map((m) => `${m.role === "user" ? "Client" : "Assistant"}: ${m.message}`)
    .join("\n");

  // Prepare salon context
  const services = Array.isArray(salon.services) ? salon.services : [];
  const masters  = Array.isArray(salon.masters)  ? salon.masters  : [];
  const workingHours = salon.working_hours || { start: "09:00", end: "18:00" };
  const geminiKey = process.env.GEMINI_KEY || process.env.VITE_GEMINI_KEY;

  // Build prompt & call Gemini
  const systemPrompt = buildSystemPrompt(salon, services, masters, workingHours, historyText);
  const aiResponse   = await callGemini(geminiKey, systemPrompt, msgBody);

  if (!aiResponse) {
    return twiml(
      "I'm having trouble right now. Please try again in a moment or call us directly."
    );
  }

  // Extract ACTION block and clean reply text
  const action    = parseAction(aiResponse);
  const replyText = aiResponse.replace(/```ACTION[\s\S]*?END_ACTION```/g, "").trim();

  // Execute action
  if (action) {
    if (action.type === "book") {
      await bookAppointment(supabase, salon.id, action, fromRaw);
    } else if (action.type === "cancel" && action.appointment_id) {
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", action.appointment_id)
        .eq("salon_id", salon.id);
    }
  }

  // Log both sides of the conversation
  await supabase.from("whatsapp_conversations").insert([
    {
      salon_id: salon.id,
      client_phone: fromRaw,
      role: "user",
      message: msgBody,
    },
    {
      salon_id: salon.id,
      client_phone: fromRaw,
      role: "assistant",
      message: replyText,
      action_taken: action?.type || null,
    },
  ]);

  return twiml(replyText);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return TwiML response (Twilio sends this as WhatsApp message back to client) */
function twiml(message) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
      message
    )}</Message></Response>`,
  };
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build the Gemini system prompt with full salon context */
function buildSystemPrompt(salon, services, masters, workingHours, history) {
  const today = new Date().toISOString().slice(0, 10);

  const servicesList = services.length
    ? services.map((s) =>
        typeof s === "object"
          ? `${s.name}${s.price ? ` ($${s.price})` : ""}${s.duration ? ` — ${s.duration}min` : ""}`
          : String(s)
      ).join(", ")
    : "Various beauty services";

  const mastersList = masters.length
    ? masters.map((m) => (typeof m === "object" ? m.name : String(m))).join(", ")
    : "Our specialists";

  return `You are an AI receptionist for "${salon.name}" beauty salon.

Today: ${today}
Working hours: ${workingHours.start} – ${workingHours.end}
Services available: ${servicesList}
Masters: ${mastersList}
${salon.address ? `Address: ${salon.address}` : ""}

${history ? `Recent conversation:\n${history}\n` : ""}

RULES:
- Detect the client's language from their first message and always respond in that language.
- Be warm, friendly and professional. Keep replies short (2-4 sentences max).
- For booking: collect service, master preference (or say "any"), preferred date and time.
- For cancelling: ask for the appointment date/service to confirm.
- Suggest times within working hours only.
- When you have all info to book, end with the ACTION block below.
- If no action needed, do NOT include the ACTION block.

When booking is confirmed, append:
\`\`\`ACTION
{
  "type": "book",
  "service": "<service name>",
  "master": "<master name or any>",
  "date": "<YYYY-MM-DD>",
  "time": "<HH:MM>",
  "client_name": "<name if client mentioned it>"
}
END_ACTION\`\`\`

For cancellation:
\`\`\`ACTION
{ "type": "cancel", "appointment_id": "<id if known>" }
END_ACTION\`\`\``;
}

/** Call Gemini 2.0 Flash API */
async function callGemini(apiKey, systemPrompt, userMessage) {
  if (!apiKey) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user",  parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Understood. Ready to assist salon clients." }] },
          { role: "user",  parts: [{ text: userMessage }] },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error("Gemini error:", e.message);
    return null;
  }
}

/** Parse ```ACTION ... END_ACTION``` block from AI response */
function parseAction(text) {
  const match = text.match(/```ACTION\s*([\s\S]*?)END_ACTION```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

/** Write a new appointment to Supabase */
async function bookAppointment(supabase, salonId, action, clientPhone) {
  if (!action.service || !action.date || !action.time) return;
  const cleanPhone = clientPhone.replace("whatsapp:", "");
  const { error } = await supabase.from("appointments").insert({
    salon_id: salonId,
    name:     action.client_name || "WhatsApp Client",
    phone:    cleanPhone,
    service:  action.service,
    master:   action.master || "Any",
    date:     action.date,
    time:     action.time,
    status:   "confirmed",
  });
  if (error) console.error("Booking error:", error.message);
}
