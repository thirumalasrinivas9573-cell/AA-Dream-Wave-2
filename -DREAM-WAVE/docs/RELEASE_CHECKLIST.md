# Dream Wave — Release Checklist (CTO-007)

Use this before promoting a build to staging/production. Merge gate must be green first.

## 1. Merge gate (required)

Local:

```bash
npm run install:all
npm run ci
```

CI (GitHub Actions): workflow `.github/workflows/ci.yml` runs the same sequence:

1. `npm run arch:verify` — canonical vs quarantined boundaries  
2. `npm test` — API smoke (auth, assets, billing gates, Stripe signature)  
3. `npm run build` — client production build  

Do **not** merge with a red CI check.

## 2. Environment

### API (`server/.env`)

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | Production cluster URI |
| `JWT_SECRET` | Yes | ≥32 chars |
| `JWT_REFRESH_SECRET` | Yes | ≥32 chars |
| `CLIENT_URL` | Yes | Comma-separated allowlist for CORS |
| `ADMIN_EMAIL` | Recommended | First admin signup email |
| `OPENAI_API_KEY` | Optional | Falls back if unset |
| `STRIPE_SECRET_KEY` | Optional* | Required for live checkout |
| `STRIPE_WEBHOOK_SECRET` | Optional* | Required for webhooks |
| `STRIPE_PRICE_PRO` | Optional* | Stripe Price ID |
| `STRIPE_PRICE_TEAM` | Optional* | Stripe Price ID |

\*All four Stripe vars required for `checkoutEnabled: true`. App boots without them.

### Client

| Variable | Notes |
|----------|--------|
| `VITE_API_URL` | Absolute API base (e.g. `https://api.example.com/api`) or rely on reverse-proxy `/api` |

## 3. Stripe (if monetizing)

1. Create Products/Prices for Pro and Team; set `STRIPE_PRICE_PRO` / `STRIPE_PRICE_TEAM`.  
2. Webhook endpoint: `POST https://<api-host>/api/billing/webhook`  
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`  
4. Confirm Settings shows Upgrade/Manage when configured.  
5. See [BILLING_STRIPE_ADAPTER.md](./BILLING_STRIPE_ADAPTER.md).

## 4. Post-deploy health

```bash
curl -s https://<api-host>/api/health
```

Expect JSON:

```json
{ "success": true, "status": "ok", "mongo": "up", "version": "1.0.0", "time": "..." }
```

- `status: "ok"` and `mongo: "up"` → ready  
- `status: "degraded"` → fix Mongo before sending traffic  

## 5. Smoke after deploy

- [ ] Signup / login  
- [ ] Refresh session (cookie)  
- [ ] AI Chat send (credits decrement)  
- [ ] Settings → Plan & credits visible  
- [ ] Unauthenticated `GET /api/assets/<file>` → 401  
- [ ] Stripe checkout (staging keys only) if enabled  

## 6. Architecture reminders

- Canonical app: `client/` + `server/` (not `server/src/mj/`, not `dream-wave-ai/`)  
- User uploads: authenticated `/api/assets/:filename` only  
- Plan changes: admin or Stripe webhook — never client self-elevate  

## 7. Rollback

1. Revert deploy to previous API/client artifacts.  
2. Confirm `/api/health` ok.  
3. If a bad Stripe webhook applied plans, correct via admin plan update (resets credits to catalog).
