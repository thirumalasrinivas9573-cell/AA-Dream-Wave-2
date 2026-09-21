# Dream Wave AI

Dream Wave AI Version 1 is a multi-portal learning, identity, digital-library, career, discovery, and recruitment platform.

## Production applications

- `client/`: React 18 and Vite primary SPA.
- `server/`: Express, Socket.IO, Mongoose, and MongoDB API.
- `web/`: optional Next.js workspace, not part of the Version 1 deployment.

Node.js 20 is the supported runtime.

## Setup

```bash
npm run install:all
cp server/.env.example server/.env
npm run dev
```

Client: `http://127.0.0.1:5173`
API: `http://127.0.0.1:5001`
Health: `http://127.0.0.1:5001/health`

Do not copy credentials into documentation. Store local values only in ignored `.env` files and production values in the deployment provider's secret store.

## Quality gates

```bash
npm --prefix client run lint
npm --prefix client run build
npm --prefix server test
npm --prefix web run verify
npm audit --omit=dev --audit-level=high
```

## Deployment

- Netlify base directory: `client`; configuration: `client/netlify.toml`.
- Render blueprint: root `render.yaml`; API root directory: `server`.
- Canonical environment list: `server/.env.example`.

Read `docs/SECURITY_RELEASE_BLOCKERS.md` before any production deployment. Version 1 must not be promoted until exposed historical credentials are rotated and removed from git history.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Folder structure](docs/FOLDER_STRUCTURE.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Environment](docs/ENVIRONMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Developer guide](docs/DEVELOPER_GUIDE.md)
- [Security release blockers](docs/SECURITY_RELEASE_BLOCKERS.md)
- [Version 2 readiness](docs/VERSION2_READINESS.md)
