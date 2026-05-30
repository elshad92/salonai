# Domain Setup Guide — SalonAI

Step-by-step instructions for connecting a custom domain to SalonAI.

---

## 1. Choose & Buy a Domain

| Registrar | .com | .app | .io | Notes |
|-----------|------|------|-----|-------|
| **Cloudflare** | ~$10/yr | ~$19/yr | ~$32/yr | At-cost pricing, best DNS UI (recommended) |
| **Namecheap** | ~$10/yr | ~$19/yr | ~$32/yr | Free WHOIS privacy |
| **Squarespace** | ~$20/yr | ~$20/yr | ~$35/yr | Was Google Domains, now pricier |

**Recommendation:** Cloudflare Registrar — at-cost pricing, zero markup, best-in-class DNS management.

**Suggested names:** `salonai.app` · `getsalonai.com` · `mysalonai.io`

---

## 2. Add Domain in Netlify

1. Open **Netlify Dashboard** → select site `salonai-app`
2. **Site settings → Domain management → Add custom domain**
3. Enter your domain (e.g., `salonai.app`) and confirm
4. Netlify shows the DNS records you need to add

---

## 3. DNS Records to Configure

At your registrar's DNS panel, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| `A` | `@` (apex/root) | `75.2.60.5` | 3600 |
| `CNAME` | `www` | `salonai-app.netlify.app.` | 3600 |

> **Cloudflare users:** Enable "Proxied" (orange cloud) only if you want Cloudflare CDN. For Netlify-managed SSL, leave it "DNS only" (grey cloud) until the cert is issued.
>
> **Important:** Netlify's load balancer IP can vary by plan. Always verify the exact IP in **Site settings → Domain management** after adding the domain.

---

## 4. Enable HTTPS

After DNS propagates (5 min – 48 hrs), Netlify auto-provisions a Let's Encrypt certificate.

Verify with: `https://your-domain.com` — should show a green padlock.

---

## 5. Verify DNS Propagation

```bash
# Check apex A record
dig your-domain.com A

# Check www CNAME
dig www.your-domain.com CNAME

# Online: https://dnschecker.org  or  https://whatsmydns.net
```

---

## 6. Update Code After Domain Switch

### 6.1 Plausible Analytics — `index.html`

```html
<!-- Change salonai-app.netlify.app → your new domain -->
<script defer data-domain="your-domain.com" src="https://plausible.io/js/script.js"></script>
```

Also update Plausible dashboard: **Settings → Domain** → add the new domain.

### 6.2 Supabase Dashboard

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → project `dditnfupklbqiauzuehw`
2. **Settings → General → Site URL** → `https://your-domain.com`
3. **Authentication → URL Configuration → Redirect URLs** → add `https://your-domain.com/**`

### 6.3 Open Graph tags — `index.html`

```html
<meta property="og:url" content="https://your-domain.com" />
<meta property="og:image" content="https://your-domain.com/og-image.png" />
<meta name="twitter:image" content="https://your-domain.com/og-image.png" />
```

### 6.4 Find all hardcoded references

```bash
grep -r "salonai-app.netlify.app" src/ index.html
```

Current known locations:
- `index.html` — og:url, og:image, twitter:image, Plausible data-domain
- `src/` — no hardcoded URLs found (all use `window.location.origin`)

---

## 7. Redirect Old Domain → New Domain

Uncomment and update this line in `public/_redirects`:

```
https://salonai-app.netlify.app/*  https://your-domain.com/:splat  301!
```

This tells Netlify to permanently redirect all old-domain traffic to the new one.

---

## Checklist

- [ ] Domain purchased
- [ ] Domain added in **Netlify → Domain management**
- [ ] DNS records set (A record for apex, CNAME for www)
- [ ] HTTPS confirmed (green padlock, no errors)
- [ ] `data-domain` in `index.html` updated
- [ ] `og:url` and `og:image` in `index.html` updated
- [ ] Supabase **Site URL** updated
- [ ] Supabase **Redirect URLs** updated
- [ ] Old-domain redirect uncommented in `public/_redirects`
- [ ] Plausible dashboard: new domain added
