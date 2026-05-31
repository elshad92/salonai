// Shared AI conversation logic — reused by telegram-webhook.js and whatsapp-webhook.js
import { createClient } from "@supabase/supabase-js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export function createSupabase() {
  return createClient(
    process.env.SUPABASE_URL        || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );
}

export async function loadConversationHistory(supabase, salonId, clientPhone) {
  const { data: history } = await supabase
    .from("whatsapp_conversations")
    .select("role, message")
    .eq("salon_id", salonId)
    .eq("client_phone", clientPhone)
    .order("created_at", { ascending: false })
    .limit(10);

  return (history || [])
    .reverse()
    .map((m) => `${m.role === "user" ? "Client" : "Assistant"}: ${m.message}`)
    .join("\n");
}

export function buildSystemPrompt(salon, services, masters, workingHours, history, channel = "messaging") {
  const today = new Date().toISOString().slice(0, 10);

  const servicesList = services.length
    ? services
        .map((s) =>
          typeof s === "object"
            ? `${s.name}${s.price ? ` ($${s.price})` : ""}${s.duration ? ` — ${s.duration}min` : ""}`
            : String(s)
        )
        .join(", ")
    : "Various beauty services";

  const mastersList = masters.length
    ? masters.map((m) => (typeof m === "object" ? m.name : String(m))).join(", ")
    : "Our specialists";

  return `You are an AI receptionist for "${salon.name}" beauty salon, responding via ${channel}.

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
${channel === "telegram" ? "- You can use emoji naturally in your replies." : ""}

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

export async function callGemini(apiKey, systemPrompt, userMessage) {
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

export function parseAction(text) {
  const match = text.match(/```ACTION\s*([\s\S]*?)END_ACTION```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

export async function bookAppointment(supabase, salonId, action, clientPhone, channel) {
  if (!action.service || !action.date || !action.time) return;
  const cleanPhone = clientPhone.replace("whatsapp:", "").replace("telegram:", "");
  const channelLabel = channel === "telegram" ? "Telegram" : "WhatsApp";
  const { error } = await supabase.from("appointments").insert({
    salon_id: salonId,
    name:     action.client_name || `${channelLabel} Client`,
    phone:    cleanPhone,
    service:  action.service,
    master:   action.master || "Any",
    date:     action.date,
    time:     action.time,
    status:   "confirmed",
  });
  if (error) console.error("Booking error:", error.message);
}

export async function persistConversation(supabase, salonId, clientPhone, userMessage, replyText, action, channel) {
  const { error } = await supabase.from("whatsapp_conversations").insert([
    {
      salon_id:    salonId,
      client_phone: clientPhone,
      role:        "user",
      message:     userMessage,
      channel,
    },
    {
      salon_id:    salonId,
      client_phone: clientPhone,
      role:        "assistant",
      message:     replyText,
      action_taken: action?.type || null,
      channel,
    },
  ]);
  if (error) console.error("Persist conversation error:", error.message);
}
