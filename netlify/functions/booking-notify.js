// Sends email notification to salon owner when a new booking arrives.
// Called by the frontend after a successful appointment insert.
// Requires: RESEND_API_KEY env var (get free key at resend.com — 3000 emails/mo free)
import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Silently skip — don't fail the booking
    console.log("booking-notify: RESEND_API_KEY not set, skipping email");
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

  const { salon_id, booking } = body;
  if (!salon_id || !booking) {
    return { statusCode: 400, body: "Missing salon_id or booking" };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  // Get salon name + owner_id
  const { data: salon } = await supabase
    .from("salons")
    .select("name, owner_id")
    .eq("id", salon_id)
    .single();

  if (!salon) return { statusCode: 200, body: JSON.stringify({ skipped: "salon not found" }) };

  // Get owner email via admin API (needs service key)
  let ownerEmail = null;
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(salon.owner_id);
    ownerEmail = user?.email;
  } catch (e) {
    console.error("booking-notify: could not get owner email", e.message);
  }

  if (!ownerEmail) return { statusCode: 200, body: JSON.stringify({ skipped: "no owner email" }) };

  const { name, service, master, date, time, phone } = booking;
  const dateStr = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #eaeaea;border-radius:16px;padding:32px;">
  <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111;">📅 New Booking at ${salon.name}</h2>
  <p style="margin:0 0 24px;font-size:14px;color:#888;">via SalonAI</p>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;font-size:13px;color:#666;width:100px;">Client</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#111;">${name || "—"}</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#666;">Phone</td><td style="padding:8px 0;font-size:14px;color:#111;">${phone || "—"}</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#666;">Service</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#111;">${service || "—"}</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#666;">Stylist</td><td style="padding:8px 0;font-size:14px;color:#111;">${master || "Any"}</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#666;">Date</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#C8A96E;">${dateStr}</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#666;">Time</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#C8A96E;">${time || "—"}</td></tr>
  </table>
  <div style="margin-top:24px;padding:14px 18px;background:#FCFAF5;border:1px solid #E9DFC9;border-radius:10px;font-size:13px;color:#666;">
    Log in to <a href="https://salonai-app.netlify.app/dashboard" style="color:#C8A96E;font-weight:600;">your dashboard</a> to see all appointments.
  </div>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SalonAI <notifications@salonai-app.netlify.app>",
        to: [ownerEmail],
        subject: `📅 New booking: ${service} — ${name} at ${time}`,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("booking-notify: Resend error", err);
    }
    return { statusCode: 200, body: JSON.stringify({ sent: res.ok }) };
  } catch (e) {
    console.error("booking-notify: fetch error", e.message);
    return { statusCode: 200, body: JSON.stringify({ error: e.message }) };
  }
};
