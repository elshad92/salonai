# SalonAI — Full Project Documentation

## What is SalonAI
SaaS platform with AI employees for beauty salons. Commission-free alternative to traditional booking platforms. Target market: USA and Europe.

**Live site:** https://luminous-kitten-bbcfce.netlify.app
**GitHub:** https://github.com/elshad92/salonai (branch: master)
**Supabase:** https://dditnfupklbqiauzuehw.supabase.co

---

## Tech Stack
- **Frontend:** Vite + React
- **Database & Auth:** Supabase (PostgreSQL + Google OAuth)
- **Hosting:** Netlify (auto-deploy from GitHub)
- **IDE:** Cursor
- **AI Model:** Gemma 4 (planned for future smart chat)

---

## Project Structure

```
salonai/
├── public/
│   ├── _redirects          # Netlify SPA routing
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── lib/
│   │   ├── supabase.js     # Supabase client
│   │   ├── aiAnalyst.js    # AI Analyst — generates insights from data
│   │   ├── aiMarketer.js   # AI Marketer — generates Instagram posts
│   │   └── ChatWidget.jsx  # AI Administrator — booking chatbot
│   ├── pages/
│   │   ├── Landing.jsx     # Landing page with pricing
│   │   ├── Login.jsx       # Google Auth login
│   │   ├── Dashboard.jsx   # Owner dashboard with real data
│   │   ├── Booking.jsx     # Client booking form
│   │   └── Marketing.jsx   # Instagram post generator
│   ├── App.jsx             # Routing + auth guard
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── .env                    # Supabase keys (not in git)
├── package.json
└── vite.config.js
```

---

## Pages & Routes

| Route | Page | Access | Description |
|-------|------|--------|-------------|
| `/` | Landing.jsx | Public | Landing page with hero, features, pricing |
| `/login` | Login.jsx | Public | Google OAuth sign-in |
| `/dashboard` | Dashboard.jsx | Protected | Owner dashboard with stats, appointments, AI insights |
| `/booking` | Booking.jsx | Public | Client booking form (no registration needed) |
| `/marketing` | Marketing.jsx | Protected | AI-generated Instagram posts |

---

## AI Agents

### 1. 🤖 AI Administrator (ChatWidget)
**File:** `src/lib/ChatWidget.jsx`
**Location:** Floating button on all pages (bottom-right corner)
**How it works:**
- Step-by-step booking flow: service → master → date → time → name → phone → confirm
- Saves directly to Supabase `appointments` table
- No external API needed — runs entirely in browser
- Available services: Haircut, Color & Tone, Blowout, Keratin Treatment
- Available masters: Emma Wilson, Olivia Brown, Mia Johnson
- Available times: 09:30, 11:00, 13:15, 15:00, 16:30, 18:00

### 2. 📸 AI Marketer
**File:** `src/lib/aiMarketer.js` + `src/pages/Marketing.jsx`
**Location:** `/marketing` (protected route)
**How it works:**
- Generates 5 Instagram posts per click
- 3 types: Promo, Engagement, Tips
- Each post includes: caption text, hashtags, best posting time
- One-click copy to clipboard
- "Generate New" button for fresh posts

### 3. 📊 AI Analyst
**File:** `src/lib/aiAnalyst.js`
**Location:** Right panel in Dashboard
**How it works:**
- Analyzes real appointment data from Supabase
- Generates 4 insights:
  1. Today's load analysis + recommendation
  2. Popular services + upsell suggestion
  3. Weekly trend + growth advice
  4. Monthly projection + time-based tips
- Updates automatically when data changes

---

## Database (Supabase)

### Table: `appointments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| name | text | Client name |
| phone | text | Client phone |
| service | text | Service name |
| master | text | Stylist name |
| date | date | Appointment date |
| time | text | Appointment time |
| created_at | timestamp | When booking was made |

### Authentication
- Google OAuth via Supabase Auth
- Protected routes redirect to `/login` if not authenticated
- User greeting shows Google profile name

---

## Design System
- **Style:** Apple/Tesla minimalism
- **Background:** White (#FFFFFF)
- **Text:** Black (#111111)
- **Accent:** Gold (#C8A96E)
- **Border radius:** 14-24px
- **Font:** System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Language:** English only

---

## Pricing Plans
| Plan | Price | Staff |
|------|-------|-------|
| Solo | $19/mo | 1 |
| Small | $49/mo | Up to 5 |
| Pro | $99/mo | Up to 15 |
| Enterprise | $199/mo | Up to 30 |
| Custom | Contact us | 30+ |

---

## Features Completed
- [x] Landing page with hero, features, pricing
- [x] Google OAuth authentication
- [x] Protected routes (auth guard)
- [x] Owner Dashboard with real Supabase data
- [x] Client Booking form → saves to database
- [x] AI Administrator — chat widget for booking
- [x] AI Marketer — Instagram post generator
- [x] AI Analyst — real-time insights
- [x] Logout functionality
- [x] User greeting by name
- [x] Deployed on Netlify with auto-deploy
- [x] SPA routing with _redirects

## Features To-Do
- [ ] WhatsApp Business API integration (requires Meta verification)
- [ ] Stripe payment integration for subscriptions
- [ ] Custom domain (salonai.com)
- [ ] Email notifications for bookings
- [ ] Client history & repeat booking
- [ ] Staff schedule management
- [ ] Multi-salon support
- [ ] Product Hunt launch
- [ ] Gemma 4 integration for smart AI chat
- [ ] Mobile responsive polish

---

## Environment Variables

### Local (.env in salonai folder)
```
VITE_SUPABASE_URL=https://dditnfupklbqiauzuehw.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

### Netlify (Project Configuration → Environment Variables)
Same two variables as above.

---

## Deployment
- **Platform:** Netlify
- **Branch:** master
- **Build command:** npm install && npm run build
- **Publish directory:** dist
- **Auto-deploy:** Yes (on every git push)

### How to deploy updates:
```bash
cd C:\Users\user\Desktop\21\salonai
git add -A
git commit -m "your message"
git push
```
Netlify auto-deploys within 1-2 minutes.

---

## External Services Setup

### Google OAuth (console.cloud.google.com)
- Project: salonai
- OAuth Client: Web application
- Authorized redirect URIs:
  - `https://dditnfupklbqiauzuehw.supabase.co/auth/v1/callback`
  - `https://luminous-kitten-bbcfce.netlify.app/dashboard`

### Supabase Auth (Authentication → URL Configuration)
- Site URL: `https://luminous-kitten-bbcfce.netlify.app`
- Redirect URLs:
  - `http://localhost:5173/dashboard`
  - `https://luminous-kitten-bbcfce.netlify.app/dashboard`

### Supabase Auth (Sign In / Providers → Google)
- Enable Sign in with Google: ON
- Client ID: from Google Console
- Client Secret: from Google Console

---

## Owner Info
- Location: Tashkent, Uzbekistan
- Age: 33
- Goal: $1M in 2 years
- Note: Tends to burn out quickly — keep focused on priorities!
