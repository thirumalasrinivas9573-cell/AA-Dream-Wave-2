# Version 1 Folder Structure

```text
.
├── client/                 Primary React/Vite production SPA
│   ├── public/             Static assets and robots policy
│   └── src/
│       ├── modules/        Domain-owned pages, components, hooks, styles
│       ├── shared/         Cross-domain auth, UI, state, services, utilities
│       ├── App.jsx         Provider composition
│       ├── AppRouter.jsx   Public and portal route boundaries
│       └── main.jsx        Browser entry and root error boundary
├── server/                 Express/Socket.IO production API
│   ├── controllers/        Validation and business orchestration
│   ├── middleware/         Authentication, roles, request security
│   ├── models/             Mongoose schemas and indexes
│   ├── routes/             HTTP namespaces and middleware composition
│   ├── services/           Provider and domain services
│   ├── tests/              Node test runner + MongoMemoryServer suites
│   ├── utils/              Tokens, environment, indexes, shared helpers
│   └── server.js           API entry point
├── web/                    Optional Next.js workspace; not V1 deployed
├── mobile/                 Future mobile workspace; not V1 deployed
├── docs/                   Canonical engineering and release documentation
├── .github/workflows/      Continuous integration
├── render.yaml             Canonical API deployment blueprint
└── package.json            Workspace convenience scripts
```

`dream-wave-ai/` is a tracked legacy duplicate excluded by `.gitignore` and by the Version 1 deployment. It should be removed in a separately reviewed repository-hygiene change after confirming no external process consumes it.
