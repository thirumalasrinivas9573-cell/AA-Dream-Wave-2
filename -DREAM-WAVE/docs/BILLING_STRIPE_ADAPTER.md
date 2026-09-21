# Stripe adapter (CTO-006)

Dream Wave entitlements are owned by `server/services/entitlements.js` and `server/config/plans.js`.
Stripe lives in `server/services/stripeService.js` as an adapter only.

## Live endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/billing/plan` | JWT | Plan, credits, catalog, `checkoutEnabled` |
| POST | `/api/billing/checkout` | JWT | Body `{ plan: "pro" \| "team" }` → Checkout URL |
| POST | `/api/billing/portal` | JWT | Customer Portal URL |
| POST | `/api/billing/webhook` | Stripe signature | Sync plan/credits (raw body) |

## Contract

1. **Assignment:** `User.plan` ∈ `free | pro | team` (admin or Stripe webhook only — never client self-elevate).
2. **Runtime gates:** Controllers call `assertCanUseAi` / `consumeAiCredit`.
3. **Webhook events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. **On paid plan:** set `User.plan` and reset `credits` to catalog `monthlyCredits`.
5. **`checkoutEnabled`:** true only when all of `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM` are set.

## Env

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
```

App boots without these keys; checkout stays disabled.
