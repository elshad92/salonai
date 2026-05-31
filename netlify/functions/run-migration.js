// One-time migration runner — call once after deploy with the secret token
// GET /.netlify/functions/run-migration?token=MIGRATION_SECRET
import { createClient } from "@supabase/supabase-js";

const MIGRATION_SQL = `
-- 1. Add Twilio phone number to salons
ALTER TABLE salons ADD COLUMN IF NOT EXISTS twilio_phone_number text DEFAULT '';

-- 2. Salon integrations (Twilio credentials per salon)
CREATE TABLE IF NOT EXISTS salon_integrations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id    uuid REFERENCES salons(id) ON DELETE CASCADE,
  provider    text NOT NULL DEFAULT 'twilio',
  account_sid text DEFAULT '',
  auth_token  text DEFAULT '',
  phone_number text DEFAULT '',
  enabled     boolean DEFAULT false,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now(),
  UNIQUE(salon_id, provider)
);

-- 3. WhatsApp conversation history
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id     uuid REFERENCES salons(id) ON DELETE CASCADE,
  client_phone text NOT NULL,
  role         text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message      text NOT NULL,
  action_taken text DEFAULT NULL,
  created_at   timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_lookup
  ON whatsapp_conversations(salon_id, client_phone, created_at DESC);

-- 4. Reminder tracking on appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent  boolean DEFAULT false;

-- 5. Working hours for salons
ALTER TABLE salons ADD COLUMN IF NOT EXISTS working_hours jsonb DEFAULT '{"start":"09:00","end":"18:00","days":["Mon","Tue","Wed","Thu","Fri","Sat"]}';

-- 6. Appointment status
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed';

-- 5. RLS
ALTER TABLE salon_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Owners manage integrations"
  ON salon_integrations FOR ALL
  USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Owners read conversations"
  ON whatsapp_conversations FOR SELECT
  USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Service role inserts conversations"
  ON whatsapp_conversations FOR INSERT WITH CHECK (true);
`;

export const handler = async (event) => {
  const token = event.queryStringParameters?.token || "";
  const secret = process.env.MIGRATION_SECRET || "salonai-migrate-2024";

  if (token !== secret) {
    return { statusCode: 403, body: "Forbidden. Add ?token=<MIGRATION_SECRET> to URL." };
  }

  const supabaseUrl  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    return {
      statusCode: 500,
      body: "SUPABASE_SERVICE_KEY env var not set. Add it in Netlify → Site settings → Environment variables.",
    };
  }

  // Use Supabase Management API to execute SQL
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    }
  );

  if (!res.ok) {
    // Fallback: try via supabase-js rpc if management API fails
    const supabase = createClient(supabaseUrl, serviceKey);
    const stmts = MIGRATION_SQL.split(";").map((s) => s.trim()).filter(Boolean);
    const errors = [];
    for (const stmt of stmts) {
      const { error } = await supabase.rpc("exec", { sql: stmt }).single();
      if (error && !error.message.includes("already exists")) {
        errors.push(error.message);
      }
    }
    if (errors.length > 0) {
      return { statusCode: 500, body: "Migration errors: " + errors.join("; ") };
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `<h2>✅ Migration complete!</h2><p>Tables created: salon_integrations, whatsapp_conversations. Columns added to appointments.</p><p>You can now <a href="/whatsapp">configure WhatsApp AI</a>.</p>`,
  };
};
