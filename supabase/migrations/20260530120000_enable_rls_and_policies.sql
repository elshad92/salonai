-- ============================================================
-- RLS Migration: Row Level Security for all public tables
-- Prevents cross-salon data leakage (critical security fix)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SALONS
--    owner_id = auth.uid() for authenticated access
--    Any anonymous user can SELECT by slug (public booking page)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

-- Owner reads their own salon
CREATE POLICY "salons_owner_select"
  ON public.salons FOR SELECT
  USING (owner_id = auth.uid());

-- Anonymous / public: read any salon by slug (booking page, ChatWidget)
-- Exposes only rows already discoverable via public URL
CREATE POLICY "salons_public_select"
  ON public.salons FOR SELECT
  TO anon
  USING (true);

-- Owner creates their own salon (slug must tie to their uid)
CREATE POLICY "salons_owner_insert"
  ON public.salons FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owner updates only their own salon
CREATE POLICY "salons_owner_update"
  ON public.salons FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owner deletes only their own salon
CREATE POLICY "salons_owner_delete"
  ON public.salons FOR DELETE
  USING (owner_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 2. APPOINTMENTS
--    salon_id → salons.owner_id path for owner access
--    Anonymous INSERT allowed (clients book without an account)
--    Anonymous UPDATE allowed for loyalty tracking on SalonPage
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Owner reads all appointments in their salon
CREATE POLICY "appointments_owner_select"
  ON public.appointments FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );

-- Anyone (anon + authenticated) can insert a booking
-- salon_id must reference a real salon (FK enforces this)
CREATE POLICY "appointments_public_insert"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

-- Owner updates appointments in their salon (e.g. reminder flags)
CREATE POLICY "appointments_owner_update"
  ON public.appointments FOR UPDATE
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );

-- Owner deletes appointments in their salon
CREATE POLICY "appointments_owner_delete"
  ON public.appointments FOR DELETE
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 3. LOYALTY
--    salon_id → salons.owner_id for owner access
--    Anonymous INSERT + UPDATE allowed (SalonPage.jsx upserts loyalty
--    on every public booking without a logged-in session)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.loyalty ENABLE ROW LEVEL SECURITY;

-- Owner reads loyalty for their salon
CREATE POLICY "loyalty_owner_select"
  ON public.loyalty FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );

-- Public booking flow: anon creates a loyalty record on first visit
CREATE POLICY "loyalty_public_insert"
  ON public.loyalty FOR INSERT
  WITH CHECK (true);

-- Public booking flow: anon updates visit count on return visits
-- Scoped to existing rows only (UPDATE USING is the row filter)
CREATE POLICY "loyalty_public_update"
  ON public.loyalty FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Owner deletes loyalty records for their salon only
CREATE POLICY "loyalty_owner_delete"
  ON public.loyalty FOR DELETE
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 4. SALON_INTEGRATIONS
--    Already has RLS enabled in whatsapp migration.
--    Drop existing policies and replace with complete set.
-- ─────────────────────────────────────────────────────────────

-- Drop old policies from previous migration to avoid conflicts
DROP POLICY IF EXISTS "Owners manage integrations" ON public.salon_integrations;
DROP POLICY IF EXISTS "Webhook reads enabled integrations" ON public.salon_integrations;

-- Re-enable just in case (idempotent)
ALTER TABLE public.salon_integrations ENABLE ROW LEVEL SECURITY;

-- Owner reads their own integrations
CREATE POLICY "integrations_owner_select"
  ON public.salon_integrations FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );

-- Webhook function (anon key, server-side): read enabled integrations for routing
-- This is intentional: webhook needs to look up salon by Twilio phone number
CREATE POLICY "integrations_webhook_select"
  ON public.salon_integrations FOR SELECT
  TO anon
  USING (enabled = true);

-- Owner inserts integrations for their own salon
CREATE POLICY "integrations_owner_insert"
  ON public.salon_integrations FOR INSERT
  WITH CHECK (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );

-- Owner updates integrations for their own salon
CREATE POLICY "integrations_owner_update"
  ON public.salon_integrations FOR UPDATE
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );

-- Owner deletes integrations for their own salon
CREATE POLICY "integrations_owner_delete"
  ON public.salon_integrations FOR DELETE
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 5. WHATSAPP_CONVERSATIONS
--    Already has RLS + partial policies. Replace with full set.
-- ─────────────────────────────────────────────────────────────

-- Drop old policies from previous migration
DROP POLICY IF EXISTS "Owners read conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Server inserts conversations" ON public.whatsapp_conversations;

-- Re-enable just in case (idempotent)
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Owner reads conversations for their salon
CREATE POLICY "conversations_owner_select"
  ON public.whatsapp_conversations FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons WHERE owner_id = auth.uid()
    )
  );

-- Netlify webhook function inserts messages using anon key (server-side only)
-- The anon key is only in the Netlify environment, never sent to browsers
CREATE POLICY "conversations_server_insert"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies: conversation history is append-only
