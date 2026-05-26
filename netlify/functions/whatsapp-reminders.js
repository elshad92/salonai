// WhatsApp Appointment Reminders — Scheduled Netlify Function
// Runs every hour via netlify.toml schedule.
// Finds appointments in ~24h and ~1h, sends WhatsApp reminders via Twilio REST API.
import { createClient } from "@supabase/supabase-js";

export const handler = async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL        || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  const now = new Date();
  let sent = 0;

  // Check two reminder windows: 24h ahead and 1h ahead (±30min tolerance)
  const windows = [
    { hoursAhead: 24, field: "reminder_24h_sent", label: "24h" },
    { hoursAhead: 1,  field: "reminder_1h_sent",  label: "1h"  },
  ];

  for (const win of windows) {
    const targetMs  = now.getTime() + win.hoursAhead * 60 * 60 * 1000;
    const targetMin = new Date(targetMs - 30 * 60 * 1000); // -30min
    const targetMax = new Date(targetMs + 30 * 60 * 1000); // +30min

    const targetDate = targetMin.toISOString().slice(0, 10);
    const minTime    = targetMin.toTimeString().slice(0, 5); // HH:MM
    const maxTime    = targetMax.toTimeString().slice(0, 5);

    // Fetch unsent reminders in this window
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, name, phone, service, master, date, time, salon_id")
      .eq("date", targetDate)
      .eq(win.field, false)
      .eq("status", "confirmed")
      .gte("time", minTime)
      .lte("time", maxTime);

    if (!appts?.length) continue;

    // Group by salon_id to batch-load integrations
    const salonIds = [...new Set(appts.map((a) => a.salon_id))];

    const { data: integrations } = await supabase
      .from("salon_integrations")
      .select("salon_id, account_sid, auth_token, phone_number, salons(name)")
      .in("salon_id", salonIds)
      .eq("provider", "twilio")
      .eq("enabled", true);

    const integrationMap = Object.fromEntries(
      (integrations || []).map((i) => [i.salon_id, i])
    );

    for (const appt of appts) {
      const intg = integrationMap[appt.salon_id];
      if (!intg?.account_sid || !intg?.auth_token || !intg?.phone_number) continue;

      const clientWaPhone = appt.phone.startsWith("whatsapp:")
        ? appt.phone
        : `whatsapp:${appt.phone}`;

      const msg =
        win.label === "24h"
          ? `Hi ${appt.name}! 👋 Reminder: you have an appointment at ${intg.salons?.name || "the salon"} tomorrow (${appt.date}) at ${appt.time} — ${appt.service} with ${appt.master}. See you then! ✨`
          : `Hi ${appt.name}! ⏰ Your appointment at ${intg.salons?.name || "the salon"} starts in 1 hour (${appt.time}) — ${appt.service} with ${appt.master}. We look forward to seeing you!`;

      const ok = await sendTwilioMessage(
        intg.account_sid,
        intg.auth_token,
        intg.phone_number,
        clientWaPhone,
        msg
      );

      if (ok) {
        await supabase
          .from("appointments")
          .update({ [win.field]: true })
          .eq("id", appt.id);
        sent++;
      }
    }
  }

  console.log(`Reminders sent: ${sent}`);
  return { statusCode: 200, body: JSON.stringify({ sent }) };
};

/** Send a WhatsApp message via Twilio REST API (no SDK needed) */
async function sendTwilioMessage(accountSid, authToken, fromNumber, toNumber, body) {
  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To:   toNumber,
          Body: body,
        }).toString(),
      }
    );
    return res.ok;
  } catch (e) {
    console.error("Twilio send error:", e.message);
    return false;
  }
}
