# Dream Wave — Architecture Boundaries

**Status:** Enforced (DW-ARCH-002)  
**Owner:** CTO / Chief Software Architect

## Canonical product (commercial SaaS)

| Tree | Role | Ownership |
|------|------|-----------|
| `client/` | React 19 + Vite + TypeScript SPA | Frontend / UI |
| `server/` | Express + MongoDB API (**except** `server/src/mj/`) | Backend / AI Core (canonical) |

**Default commands (canonical only):**

```bash
npm run install:all
npm run dev          # server + client
npm run build        # client production build
npm start            # API only
npm run arch:verify  # fail if canonical code couples to legacy trees
```

Entry points:

- API: `server/server.js`
- Web: `client/src/main.tsx`

## Quarantined / non-canonical (read-only archives)

| Tree | Status | Rule |
|------|--------|------|
| `dream-wave-ai/**` | **QUARANTINED** | Do not import, start, or extend. Archive only. |
| `server/src/mj/**` | **QUARANTINED** | Do not `require()` from canonical `server/`. Archive only. |
| `mobile/**` | **Separate lane** | Mobile ownership; not part of web SaaS runtime. |

Deletion of quarantined trees is a **future dedicated sprint**, not ad-hoc cleanup.

## Hard rules

1. Canonical `server/**` (outside `src/mj`) must never `require` or import `server/src/mj/**`.
2. Canonical `client/**` must never import from `dream-wave-ai/**` or `server/src/mj/**`.
3. Root `npm run dev` / `npm start` must boot only `client/` + `server/`.
4. Do not “fix” quarantined code in place — port needed ideas into the canonical stack as a scoped Architect Task.
5. User uploads are private: `GET /api/assets/:filename` (auth + ownership). Never re-enable public `/uploads` static.

## Module ownership (canonical)

| Area | Primary paths |
|------|----------------|
| Auth / sessions | `server/controllers/authController.js`, `client/src/store/authStore.ts` |
| Assets | `server/controllers/assetController.js`, `server/routes/assets.js` |
| Billing / entitlements | `server/config/plans.js`, `server/services/entitlements.js`, `server/routes/billing.js` |
| Organizations | `server/models/Organization.js`, `server/models/OrgMembership.js`, `server/routes/orgs.js`, `client/src/pages/institution/InstitutionPage.tsx` |
| AI | `server/services/aiService.js`, `server/routes/ai.js`, `client/src/pages/AIStudioPage.tsx` (mode catalog) |
| Mentor chat | `server/controllers/mentorController.js`, `client/src/pages/MentorPage.tsx` (**sole** conversation UI / Chat store) |
| Learning / productivity / docs | `server/routes/{learning,habits,planner,documents,resume}.js` + matching pages |

## Verification

```bash
npm run arch:verify
```

Must exit `0` with no forbidden coupling reported.

## Merge gate (CTO-007)

```bash
npm run ci
```

Runs `arch:verify` → server smoke tests → client production build. Required before merge; mirrored in GitHub Actions.
