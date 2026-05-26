-- WhatsApp AI Administrator Migration
-- Run in Supabase SQL Editor

-- 1. Add Twilio phone number to salons (for webhook routing)
ALTER TABLE salons ADD COLUMN IF NOT EXISTS twilio_phone_number text DEFAULT '';

-- 2. Salon integrations table (stores per-salon Twilio credentials)
CREATE TABLE IF NOT EXISTS salon_integrations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id    uuid REFERENCES salons(id) ON DELETE CASCADE,
  provider    text NOT NULL DEFAULT 'twilio',
  account_sid text DEFAULT '',
  auth_token  text DEFAULT '',
  phone_number text DEFAULT '',  -- e.g. whatsapp:+14155238886
  enabled     boolean DEFAULT false,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now(),
  UNIQUE(salon_id, provider)
);

-- 3. WhatsApp conversation history (last N messages per client × salon)
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

-- 4. Reminder tracking columns on appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent  boolean DEFAULT false;

-- 5. RLS policies for new tables
ALTER TABLE salon_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own integrations
CREATE POLICY "Owners manage integrations"
  ON salon_integrations FOR ALL
  USING (
    salon_id IN (
      SELECT id FROM salons WHERE owner_id = auth.uid()
    )
  );

-- Owners can read their salon's conversations
CREATE POLICY "Owners read conversations"
  ON whatsapp_conversations FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM salons WHERE owner_id = auth.uid()
    )
  );

-- Server functions can insert conversations (anon key used in Netlify Functions)
CREATE POLICY "Server inserts conversations"
  ON whatsapp_conversations FOR INSERT
  WITH CHECK (true);

-- Webhook function reads integrations by phone number (anon key, server-side only)
-- Safe: the anon key is never exposed to end users in the webhook context
CREATE POLICY "Webhook reads enabled integrations"
  ON salon_integrations FOR SELECT
  USING (enabled = true);
