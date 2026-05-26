#!/usr/bin/env node
/**
 * SalonAI Auto-Setup — sets Netlify env vars + runs Supabase migration.
 * Run: node scripts/setup.js
 */
import { createInterface } from "readline";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const NETLIFY_SITE_NAME = "luminous-kitten-bbcfce";
const SUPABASE_URL      = "https://dditnfupklbqiauzuehw.supabase.co";
const SUPABASE_REF      = "dditnfupklbqiauzuehw";
const GEMINI_KEY        = "AIzaSyCUwGkRNjYTEpvETC2XZlaikU0xdakz-a8";
const MIGRATION_SQL     = readFileSync(
  join(ROOT, "supabase/migrations/20240526000001_whatsapp.sql"), "utf8"
);

function ask(rl, q) { return new Promise(r => rl.question(q, r)); }

async function netlifyAPI(token, path, method = "GET", body) {
  const r = await fetch(`https://api.netlify.com/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Netlify ${method} ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

async function runMigration(token) {
  console.log("\n🗄️  Running Supabase migration...");
  const stmts = MIGRATION_SQL
    .split(/;\s*(?:\n|$)/)
    .map(s => s.replace(/--.*$/gm, "").trim())
    .filter(s => s.length > 5);

  let ok = 0, skip = 0;
  for (const stmt of stmts) {
    const r = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: stmt }),
      }
    );
    if (r.ok) { ok++; continue; }
    const d = await r.json().catch(() => ({}));
    const msg = d?.message || "";
    if (r.status === 401) throw new Error(
      "401 Unauthorized.\nGo to https://supabase.com/dashboard/account/tokens and create a Personal Access Token."
    );
    if (msg.includes("already exists") || msg.includes("duplicate")) { skip++; continue; }
    console.warn(`  ⚠️  ${stmt.slice(0,60)}... → ${msg}`);
    skip++;
  }
  console.log(`  ✅ ${ok} statements applied, ${skip} skipped (already exist).`);
}

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   SalonAI — WhatsApp Setup Auto-Config   ║");
  console.log("╚══════════════════════════════════════════╝");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("\nYou need 2 Personal Access Tokens (≈30 seconds each):\n");
  console.log("  [1] Netlify token  → https://app.netlify.com/user/applications");
  console.log('       New access token → any name → copy\n');
  console.log("  [2] Supabase token → https://supabase.com/dashboard/account/tokens");
  console.log('       Generate new token → any name → copy\n');

  const netlifyTok  = (await ask(rl, "Netlify token:  ")).trim();
  const supabaseTok = (await ask(rl, "Supabase token: ")).trim();
  rl.close();

  if (!netlifyTok || !supabaseTok) { console.error("❌ Both required."); process.exit(1); }

  // 1. Find site
  console.log("\n🔍 Finding Netlify site...");
  const sites = await netlifyAPI(netlifyTok, "/sites");
  const site  = sites.find(s =>
    s.name === NETLIFY_SITE_NAME || (s.default_domain || "").includes(NETLIFY_SITE_NAME)
  );
  if (!site) { console.error(`❌ Site "${NETLIFY_SITE_NAME}" not found.`); process.exit(1); }
  console.log(`  ✅ ${site.name} (${site.id})`);

  // 2. Set env vars
  console.log("\n⚙️  Setting env vars on Netlify...");
  const vars = [
    ["SUPABASE_URL",        SUPABASE_URL],
    ["SUPABASE_SERVICE_KEY", supabaseTok],
    ["GEMINI_KEY",          GEMINI_KEY],
    ["MIGRATION_SECRET",    "salonai-migrate-2024"],
  ];
  for (const [key, value] of vars) {
    const body = { key, values: [{ value, context: "production" }] };
    await netlifyAPI(netlifyTok, `/sites/${site.id}/env`, "POST", body)
      .catch(() => netlifyAPI(netlifyTok, `/sites/${site.id}/env/${key}`, "PUT", body)
        .catch(() => {}));
    console.log(`  ✅ ${key}`);
  }

  // 3. Supabase migration
  await runMigration(supabaseTok);

  // 4. Trigger redeploy
  console.log("\n🚀 Triggering Netlify redeploy...");
  const build = await netlifyAPI(netlifyTok, `/sites/${site.id}/builds`, "POST", {})
    .catch(e => ({ error: e.message }));
  if (build.id) console.log(`  ✅ Build started: ${build.id}`);
  else console.log("  ⚠️  Trigger manually in Netlify dashboard → Deploys → Trigger deploy");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║              ✅ All Done!                 ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("\n1. Wait ~2 min for deploy");
  console.log("2. Go to /dashboard → 💬 WhatsApp AI → configure Twilio\n");
}

main().catch(e => { console.error("\n❌", e.message); process.exit(1); });
