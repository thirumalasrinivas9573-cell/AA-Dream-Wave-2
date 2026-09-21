# LASYA Version 2 — Prompt 1: Institution ↔ Company Partnership Foundation

## Summary

Establishes the connected ecosystem foundation between Institution Portal and Company Portal:

- MongoDB-backed partnership entity with request/accept/decline workflow
- Discovery APIs for institution→company and company→institution search
- Industry Network (institution) and Institution Network (company) UI
- Partnership detail workspace with overview, documents, activity timeline
- Platform notifications for partnership events
- Dashboard integration widgets (no full dashboard redesign)

## Routes

### Institution
- `/institution/industry-network` — discover companies, manage partners
- `/institution/partnerships/[id]` — partnership workspace

### Company
- `/company/dashboard` — enterprise dashboard + partnership stats
- `/company/institution-network` — discover institutions, manage partners
- `/company/partnerships/[id]` — partnership workspace

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/partnerships/meta` | Relationship types |
| GET | `/api/partnerships/stats` | Partnership metrics |
| GET | `/api/partnerships` | List partnerships (scoped) |
| POST | `/api/partnerships/requests` | Create partnership request |
| GET | `/api/partnerships/:id` | Get partnership |
| PATCH | `/api/partnerships/:id` | Update partnership |
| POST | `/api/partnerships/:id/respond` | Accept / decline / request info |
| GET | `/api/partnerships/:id/activity` | Activity timeline |
| GET/POST | `/api/partnerships/:id/documents` | MoU / agreements |
| GET | `/api/discovery/companies` | Institution discovers companies |
| GET | `/api/discovery/institutions` | Company discovers institutions |
| GET | `/api/platform-notifications` | Partnership notifications |

## Security

- Organization resolved from authenticated session (`ownerUserId`), never from client-supplied org IDs
- Partnership access validated against resolved institution/company
- Documents marked private by default
- Role middleware on all partnership routes

## Verification

```bash
cd server && npm run verify:partnerships
cd web && npm run typecheck && npm run build
```

## Next (Prompt 2)

- Company Enterprise Dashboard & Recruitment Command Center
- Full recruitment/internship/drive linking to placement module
- Real-time messaging
