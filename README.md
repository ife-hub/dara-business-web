# Dara Business (desktop)

Desktop web app for Dara business owners and staff, at `business.usedara.com`.
Talks to the Dara API (`dara-backend`, `/api/v1/business/*` plus the existing endpoints).

## Develop

```bash
npm install
cp .env.example .env    # VITE_API_URL, defaults to https://base.usedara.com/api/v1
npm run dev             # http://localhost:5173
npm test                # unit tests (vitest)
npm run typecheck
```

## Deploy to business.usedara.com (cPanel)

The app is static files. It needs the backend's `/api/v1/business/*` endpoints
(dara-backend PR "Business desktop API") deployed and migrated first.

1. In cPanel → Domains, create the subdomain `business.usedara.com` (document root e.g. `~/business.usedara.com`) and turn on SSL (AutoSSL).
2. Build locally: `npm ci && npm run build`. `VITE_API_URL` is baked in at build time.
3. Upload the **contents** of `dist/` to the document root, including the hidden `.htaccess`
   (it sends every path to `index.html` so links like `/bookings` work on refresh).
4. Open https://business.usedara.com and log in with an owner account, or as staff with work email + PIN.

The backend already allows `https://business.usedara.com` in CORS.

## Notes

- Who sees what comes from `/business/me` → `permissions` (owner, manager, front desk, practitioner).
- WhatsApp orders can be started, completed and paid from here; rescheduling and reassigning them stays in the app.
- Customer insights, rewards and campaigns stay on the Dara mobile app ("Open Dara App" emails a link).
