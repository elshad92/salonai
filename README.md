# SalonAI

AI employees for beauty salons. Zero booking commissions and a $19/mo flat fee — no hidden costs, ever.

Live: **https://salonai-app.netlify.app**

---

## What it does

SalonAI gives salon owners three autonomous AI employees:

- **AI Administrator** — WhatsApp bot (Twilio + Gemini) that books appointments, handles cancellations, and sends 24h/1h reminders automatically
- **AI Receptionist** — embedded chat widget for your website that qualifies visitors and fills your calendar through natural conversation
- **AI Marketer** — generates ready-to-post Instagram captions tailored to your salon's services and brand
- **AI Analyst** — surfaces plain-English insights from your real booking data every time you open the dashboard

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React (inline styles, Apple/Tesla minimalism) |
| Backend | Supabase (Postgres + Auth + RLS) |
| AI | Google Gemini 2.0 Flash (via REST API) |
| WhatsApp | Twilio Programmable Messaging |
| Hosting | Netlify (with Netlify Functions for webhooks) |

---

## Run locally

```bash
git clone https://github.com/elshad92/salonai.git
cd salonai
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

Open http://localhost:5173

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_GEMINI_KEY` | Google AI Studio API key |
| `SUPABASE_URL` | Same as VITE_SUPABASE_URL (used by Netlify Functions) |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key (for Netlify Functions) |
| `GEMINI_KEY` | Same as VITE_GEMINI_KEY (used by Netlify Functions) |

See `.env.example` for the full list.

---

## Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Set all env vars under **Site settings → Environment variables**
4. Deploy — Netlify auto-detects Vite and the `netlify/functions/` folder

**WhatsApp webhook:** after deploy, set `https://<your-site>.netlify.app/api/whatsapp-webhook` as the incoming message URL in your Twilio WhatsApp sandbox.

---

## Analytics

SalonAI ships with [Plausible](https://plausible.io) privacy-friendly analytics.

**3-minute setup:**
1. Go to [plausible.io](https://plausible.io) → **Start free trial**
2. Add site `salonai-app.netlify.app` (or your custom domain)
3. The tracking script is already in `index.html` — no code changes needed

**Tracked events** (fired automatically, no configuration needed):

| Event | Trigger |
|---|---|
| `signup` | Successful Google sign-in / new account |
| `salon_created` | Salon setup saved for the first time |
| `chat_widget_opened` | Client opens the AI Receptionist chat bubble |
| `appointment_booked` | AI Receptionist saves a confirmed booking |
| `telegram_enabled` | Owner saves Telegram bot with `enabled: true` |

When you add a custom domain, update the `data-domain` attribute in `index.html` and add the new domain in your Plausible dashboard under **Settings → Domain**.

---

## Pricing

| Plan | Price | Stylists |
|---|---|---|
| Solo | $19/mo | 1 |
| Small | $49/mo | Up to 5 |
| Pro | $99/mo | Up to 15 |
| Enterprise | $199/mo | Unlimited |

All plans include the full AI stack. Zero commissions, ever.
