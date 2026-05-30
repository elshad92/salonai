# How to Apply the RLS Migration

## Step 1 — Open Supabase SQL Editor

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select project **dditnfupklbqiauzuehw** (elshad92)
3. In the left sidebar click **SQL Editor**
4. Click **New query**

## Step 2 — Run the migration

Copy the entire contents of:

```
supabase/migrations/20260530120000_enable_rls_and_policies.sql
```

Paste into the SQL Editor and click **Run** (or press `Ctrl+Enter`).

## Step 3 — Verify (smoke test)

Run these queries in SQL Editor to confirm policies are active:

```sql
-- List all RLS-enabled tables and their policies
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('salons','appointments','loyalty','salon_integrations','whatsapp_conversations');
```

Expected: `rowsecurity = true` for all 5 rows.

```sql
-- List all policies
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Step 4 — Verify cross-salon isolation

To confirm salon A cannot read salon B's data, use the Supabase **Row Level Security** tester
or the API with a user token:

1. Log in as Owner A → get their JWT (from browser devtools → Application → Local Storage → `sb-*-auth-token`)
2. Make a raw API call:
   ```
   GET https://dditnfupklbqiauzuehw.supabase.co/rest/v1/appointments?select=*
   Authorization: Bearer <JWT-of-owner-A>
   apikey: <anon-key>
   ```
3. You should only see appointments where `salon_id` belongs to Owner A's salon.
4. Repeat as Owner B — should see completely different (their own) records.

## What the migration covers

| Table | Owner policies | Public / anon policies |
|-------|---------------|----------------------|
| `salons` | SELECT / INSERT / UPDATE / DELETE | SELECT (public booking page needs to read by slug) |
| `appointments` | SELECT / UPDATE / DELETE | INSERT (anyone can book), no SELECT/UPDATE/DELETE |
| `loyalty` | SELECT / DELETE | INSERT + UPDATE (booking flow upserts visits) |
| `salon_integrations` | SELECT / INSERT / UPDATE / DELETE | SELECT WHERE enabled=true (webhook routing) |
| `whatsapp_conversations` | SELECT | INSERT (Netlify webhook function, server-side only) |

## Edge Functions / Netlify Functions

Netlify functions (`netlify/functions/whatsapp-webhook.js`) use the **service_role** key or the **anon** key server-side. RLS does not block service_role. Anon key policies that allow `WITH CHECK (true)` are intentional for those server-to-server calls.
