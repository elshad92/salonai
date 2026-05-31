-- Telegram AI Administrator — Migration
-- Apply in Supabase Dashboard → SQL Editor

-- 1. Telegram columns on salon_integrations
ALTER TABLE salon_integrations
  ADD COLUMN IF NOT EXISTS telegram_bot_token    TEXT,
  ADD COLUMN IF NOT EXISTS telegram_bot_username TEXT;

-- 2. Channel tracking on conversation history
--    Existing WhatsApp rows correctly default to 'whatsapp'
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp';

-- 3. Index for channel-filtered queries
CREATE INDEX IF NOT EXISTS idx_wa_conv_channel
  ON whatsapp_conversations(salon_id, channel, created_at DESC);

-- 4. RLS: allow telegram webhook function to insert (same rule as WhatsApp)
--    The existing "Server inserts conversations" policy (WITH CHECK true) already covers this.
--    No additional policy needed.

-- 5. RLS: webhook function reads telegram integrations
--    The existing "Webhook reads enabled integrations" policy already covers SELECT on salon_integrations.
--    No additional policy needed.
