# DREAM WAVE AI — Master Agent Knowledge & System Prompt Document

> **DOCUMENT PURPOSE:**  
> This file is a comprehensive, single-source-of-truth master documentation for **DREAM WAVE AI**. It is specifically structured to train, context-prime, and guide any AI Agent (LLM, Autonomous Coding Assistant, or AI Copilot) working on this codebase.

---

## 1. Executive Summary & System Overview

**DREAM WAVE AI** is an end-to-end, AI-powered career guidance, learning management, institutional operations, and talent recruitment ecosystem.

### Core Ecosystem Pillars
1. **Student Career Operating System**: AI-driven roadmaps, goals, tasks, research reports, resume generation, skill tracking, and AI mentor guidance.
2. **Gamified Learning**: Level progression, XP system, daily streaks, task challenges, and verifiable digital certificates.
3. **Digital Library**: Academic catalog, licensed PDF reader, annotations, reading analytics, and AI document assistance.
4. **Unified Search & Discovery**: Real-time cross-entity search engine with privacy-governed owner scoping and public organization feeds.
5. **Institutional Command Center**: Scoped portals for universities and colleges to manage students, placements, faculty, research, and campus events.
6. **Company Recruitment Portal**: Talent matching, job/internship publishing, application management, and direct student outreach.
7. **Admin Moderation & Governance**: Organization verification, content moderation, system broadcasts, and audit logging.

---

## 2. Architecture & Technology Stack

```
                               ┌───────────────────────────────┐
                               │     Vite React 18 SPA         │
                               │        (client/)              │
                               └──────────────┬────────────────┘
                                              │ HTTP / WS / Proxy
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                Express.js API Gateway                                  │
 │                                      (server/)                                         │
 ├───────────────────┬───────────────────┬────────────────────┬───────────────────────────┤
 │ Auth & Security   │ AI Services       │ Realtime Gateway   │ Communication Services    │
 │ (JWT, Session     │ (Gemini Flash,    │ (Socket.IO)        │ (Resend Email,            │
 │  Family, Helmet)  │  OpenAI)          │                    │  Twilio Verify)           │
 └─────────┬─────────┴─────────┬─────────┴──────────┬─────────┴─────────────┬─────────────┘
           │                   │                    │                       │
           ▼                   ▼                    ▼                       ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        ┌──────────────┐
    │ MongoDB Atlas│    │  Gemini API  │    │  Resend API  │        │ Twilio API   │
    └──────────────┘    └──────────────┘    └──────────────┘        └──────────────┘
```

### Tech Stack Details
- **Runtime Environment**: Node.js `>=20.9.0 <21` (bundled locally in `.tools/node-v20.18.0-win-x64`).
- **Frontend SPA (`client/`)**:
  - React 18, Vite 5, React Router DOM v6.
  - UI & Animation: Framer Motion, Tailwind CSS, PostCSS.
  - Utilities: Axios HTTP client, PDF.js, React PDF.
- **Backend API (`server/`)**:
  - Express.js HTTP Server (`server.js`).
  - WebSockets: Socket.IO server.
  - Security: Helmet, Rate Limiter (`express-rate-limit`), CORS, Cookie Parser, bcryptjs, JSON Web Tokens.
- **Database & Persistence**:
  - MongoDB Atlas via Mongoose ORM.
  - In-Memory MongoDB (`mongodb-memory-server`) for fast local test/dev suite execution.
- **Third-Party AI & Cloud Services**:
  - **Google Gemini API**: `gemini-flash-latest` model for AI mentor, research report synthesis, and learning assistant.
  - **OpenAI API**: Backup LLM capabilities.
  - **Resend**: Transactional emails & OTP dispatch (`onboarding@resend.dev`).
  - **Twilio Verify**: Phone OTP & SMS authentication.
  - **Firebase**: Media storage / ancillary auth utilities.

---

## 3. Directory Structure & Workspace Layout

```
-DREAM-WAVE/
├── client/                      # Main React SPA
│   ├── public/                  # Static assets & public files
│   ├── src/
│   │   ├── App.jsx              # Root App container with global providers
│   │   ├── AppRouter.jsx        # App routes & role guards
│   │   ├── modules/             # Domain feature modules
│   │   │   ├── student/         # Student portal (Dashboard, Goals, Tasks, Roadmap, Mentor, Reports)
│   │   │   ├── career/          # Career portal (Jobs, Resume Builder, Applications)
│   │   │   ├── digital-library/ # Library catalog & PDF reader
│   │   │   ├── discovery/       # Discovery feeds & search views
│   │   │   ├── institution/     # Institution command portal
│   │   │   ├── company/         # Corporate hiring portal
│   │   │   └── admin/           # Super-admin portal
│   │   └── shared/              # Reusable UI components, contexts, hooks, & API services
│   ├── package.json
│   └── vite.config.js           # Vite config (proxying /api -> http://127.0.0.1:5001)
├── server/                      # Express backend API
│   ├── controllers/             # Request handlers & logic
│   ├── middleware/              # JWT auth, role guards, security, rate limiters
│   ├── models/                  # Mongoose schemas & indexes
│   ├── routes/                  # Express HTTP routers
│   ├── services/                # Gemini, OpenAI, Resend, Twilio, Cache services
│   ├── utils/                   # Environment checkers, security tokens, helpers
│   ├── tests/                   # Automated API test suites
│   ├── server.js                # Primary backend entry point
│   ├── .env                     # Server environment settings
│   └── package.json
├── docs/                        # Technical specifications & architecture blueprints
├── web/                         # Next.js workspace (optional secondary app)
├── .tools/                      # Portable Node.js v20.18.0 distribution
├── START_APP.bat                # Easiest Windows launcher
├── start-dev.bat                # Windows CLI server launcher
├── start-dev.ps1                # PowerShell launcher
├── RESTART_SERVERS.bat          # Process killer & restarter script
└── test-backend.js              # Quick API health verifier
```

---

## 4. Core Features & Functional Architecture

### 4.1. Student Learning & Career Operating System
- **Goals (`/api/goals`)**: Strategic learning targets broken into milestones, target dates, progress tracking, and AI guidance.
- **Tasks (`/api/tasks`)**: Granular daily tasks, focus timers, task cloning, and roadmap task integration.
- **Roadmap (`/api/roadmap`)**: AI-generated structured career learning paths with milestone checkpoints.
- **AI Research Reports (`/api/report`)**: Deep-dive career and skill research papers generated on demand using Gemini API.
- **AI Mentor / Krishna Copilot (`/api/mentor`, `/api/ai`)**: Real-time interactive AI assistant delivering career advice, code help, and daily wisdom.
- **Profile & Portfolio (`/api/profile`)**: Dynamic identity page displaying verified skills, credentials, projects, and custom portfolio layouts (`/profile/public/:username`).
- **Resume Builder (`/api/career/resumes`)**: PDF export, custom section editor, and public share links via unique tokens.

### 4.2. Gamification & Progression Engine
- **XP (Experience Points)**: Earned through task completion (+10 XP per task), daily challenge bonuses (+50 XP), focus sessions, and reading books.
- **Levels**: Dynamic calculation where required XP grows progressively per level.
- **Daily Streaks**: Automatic daily check-in tracking. A 1-day gap increases streak; a 2+ day gap resets to 0.
- **Certificates**: Unlocked automatically when reaching milestone levels (e.g., Level 10+).

### 4.3. Digital Library
- **Catalog & Discovery**: Public book browsing, filtering by categories, tags, and collections.
- **Interactive Reader**: In-browser PDF renderer supporting bookmarks, page position saving, annotations, and reading session analytics.
- **Publisher Portal**: Institution and company roles can publish licensed learning materials.

### 4.4. Search & Unified Discovery
- **Unified Search Endpoint (`/api/search/unified`)**: Single query returns aggregated, relevance-scored results across public organizations, courses, books, jobs, and owner-scoped private items (goals, tasks, reports, credentials).
- **Search History**: Owner-scoped query logs with automated 30-day TTL expiration.

### 4.5. Multi-Tenant Organization Portals
- **Institutions (`/api/institution`)**: Manage enrolled students, placement stats, research projects, incubation hubs, faculty, and campus events.
- **Companies (`/api/company`)**: Job and internship posting, candidate application tracking, applicant evaluation, and talent search.
- **Approval Workflow**: Newly registered institutions and companies bootstrap as `pending` and are hidden from public feeds until approved by Admin.

---

## 5. Security & Authentication Architecture

### 5.1. Session Family & Token Rotation
- **Short-Lived Access Token**: Signed JSON Web Token (JWT) sent via `Authorization: Bearer <token>` (expires in 15 minutes).
- **HttpOnly Refresh Cookie**: Secure refresh token rotated on every usage (expires in 7 days).
- **Session Family Revocation**: Stored in `RefreshToken` database collection. If a stolen/replayed refresh token is presented, the entire session family is instantly revoked.

### 5.2. Role-Based Access Control (RBAC)
- **Roles**: `student`, `institution`, `company`, `admin`.
- **Server Authorization**: Server endpoints strictly validate user role and ownership. Client-side route guards serve purely for UI state management.

### 5.3. API Request Security & Rate Limiting
- **Helmet**: Enforces CSP, HSTS, X-Content-Type-Options, and X-Frame-Options.
- **Rate Limiters**: Specialized rate limiters applied to `/api/auth/login`, `/api/auth/otp`, `/api/mentor`, and `/api/search`.
- **Sanitization**: Protection against MongoDB operator injection (`rejectMongoOperators` middleware).

---

## 6. Database Models & Schema Summary

| Model Name | Primary Description | Key Indexes & Constraints |
| :--- | :--- | :--- |
| `User` | Main identity record (email, hashed password, role, status). | Unique `email`, `role` index. |
| `RefreshToken` | Active session family tokens for JWT renewal. | Compound `{ familyId: 1 }`, TTL expiry. |
| `StudentProfile` | Detailed student data, skills, credentials, preferences. | Unique `user`, `username` index. |
| `CareerProfile` | Career readiness, target roles, preferred locations. | Unique `user` index. |
| `Goal` | Student career learning goals and milestone array. | Compound `{ user: 1, status: 1 }`. |
| `Task` | Granular action items linked to goals or roadmaps. | Compound `{ user: 1, status: 1, dueDate: 1 }`. |
| `Roadmap` | AI-generated structured milestone path. | Unique `{ user: 1, isPrimary: 1 }`. |
| `Report` | AI-generated deep research reports. | `{ user: 1, createdAt: -1 }`. |
| `LibraryBook` | Catalog book details, category, author, storage URL. | Text index on `title`, `author`, `description`. |
| `LibraryProgress` | Reading progress, last page read, completion status. | Unique `{ userId: 1, bookId: 1 }`. |
| `Institution` | University/College organizational entity profile. | Unique `owner`, `slug`, approval status index. |
| `CompanyProfile` | Corporate employer organization profile. | Unique `owner`, `slug`, approval status index. |
| `Job` / `Internship`| Career postings created by companies/institutions. | Compound `{ company: 1, status: 1 }`. |
| `Application` | Candidate job/internship application record. | Unique `{ student: 1, targetJob: 1 }`. |
| `Notification` | System and user notifications. | Compound `{ userId: 1, read: 1, createdAt: -1 }`. |
| `SearchIndex` | Cached search query history with auto-expiry. | `{ user: 1, createdAt: -1 }`, 30-day TTL. |

---

## 7. Complete API Endpoint Specification

### 🔑 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`student`, `institution`, `company`).
- `POST /api/auth/login` — Authenticate with email/password; returns access token & sets refresh cookie.
- `POST /api/auth/refresh` — Rotate refresh token cookie & issue fresh access token.
- `POST /api/auth/logout` — Revoke active refresh session family & clear cookies.
- `POST /api/auth/send-otp` — Dispatch email or Twilio phone OTP code.
- `POST /api/auth/verify-otp` — Verify OTP code for login/registration.

### 👤 Student Profile & Identity (`/api/profile`)
- `GET /api/profile` — Fetch authenticated student's profile.
- `PUT /api/profile` — Update bio, target roles, skills, and settings.
- `POST /api/profile/upload` — Upload avatar or credential PDF (max size & MIME validated).
- `GET /api/profile/public/:username` — Public portfolio view (respects privacy settings).

### 🎯 Goals, Tasks & AI Mentor (`/api/goals`, `/api/tasks`, `/api/mentor`)
- `GET /api/goals` / `POST /api/goals` — List & create learning goals.
- `GET /api/tasks` / `POST /api/tasks` — List & create daily tasks.
- `PATCH /api/tasks/:id/toggle` — Mark task completed (triggers +10 XP event).
- `POST /api/mentor/chat` — Interactive conversation with Gemini AI Mentor.
- `POST /api/report/generate` — Generate custom AI research report.

### 💼 Career & Jobs (`/api/career`)
- `GET /api/career/jobs` — Browse approved job listings with filters.
- `POST /api/career/applications` — Submit application for a job/internship.
- `GET /api/career/resumes` / `POST /api/career/resumes` — Resume builder & PDF manager.

### 📚 Digital Library (`/api/library`)
- `GET /api/library/books` — Query public book catalog.
- `GET /api/library/books/:id/read` — Stream licensed PDF file (authenticated).
- `POST /api/library/progress` — Sync current page and reading duration.

### 🔍 Search & Unified Discovery (`/api/search`, `/api/discovery`)
- `GET /api/search/unified?q=query` — Fast multi-collection search.
- `GET /api/discovery/feed` — Featured content from approved institutions & companies.

### 🏥 System Health (`/api/health`)
- `GET /api/health` — Returns system status, server timestamp, and database connectivity state.

---

## 8. Environment Variable Configuration Schema

Create `server/.env` with the following variables:

```env
# Server Runtime
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
EXTRA_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Security & JWT Secrets (Must be min 32 chars)
JWT_SECRET=dreamwave_dev_secret_change_in_production_32chars
JWT_REFRESH_SECRET=dreamwave_refresh_secret_change_in_prod_32
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Database Connection
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/dreamwave?retryWrites=true&w=majority

# Third-Party AI Services
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-flash-latest
OPENAI_API_KEY=sk-proj-...

# Communications (Email & Phone OTP)
RESEND_API_KEY=re_...
EMAIL_FROM=Dream Wave AI <onboarding@resend.dev>
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=1e...
TWILIO_VERIFY_SERVICE_SID=VA...
```

---

## 9. How to Build, Start, and Verify the Application

### 9.1. Quick Start Commands (Windows)
To start both backend and frontend servers simultaneously using the bundled Node.js:
1. Double-click `START_APP.bat` or run:
   ```cmd
   start-dev.bat
   ```
2. Or use PowerShell:
   ```powershell
   .\start-dev.ps1
   ```

### 9.2. Manual CLI Startup
**Backend Server**:
```bash
set "PATH=%CD%\.tools\node-v20.18.0-win-x64;%PATH%"
cd server
node server.js
# Backend runs on http://localhost:5001
```

**Frontend Web Client**:
```bash
set "PATH=%CD%\.tools\node-v20.18.0-win-x64;%PATH%"
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

### 9.3. Automated Verification
Run the backend verification script to test server connectivity and MongoDB response:
```bash
node test-backend.js
```
*Expected Output*: `✅ Backend Status: WORKING (HTTP 200 OK)`

---

## 10. AI Agent Operational Instructions & Coding Standards

When tasked with modifying, debugging, or adding features to **DREAM WAVE AI**, any AI Agent MUST strictly adhere to the following rules:

1. **Obey Tenant Isolation & Owner Scoping**:
   - Private student data MUST always include `userId` or `user: req.user._id` in Mongoose query predicates.
   - Organization endpoints MUST verify that `req.user` owns the target `Institution` or `CompanyProfile`.

2. **Preserve Security Credentials**:
   - Access tokens must be verified via `authenticateToken` middleware.
   - Never expose full password hashes, refresh token secrets, or API keys in HTTP responses or log files.

3. **Database Index Awareness**:
   - When introducing new query fields in Mongoose models, evaluate if a compound index is required.
   - Do not call `syncIndexes()` blindly in production.

4. **Error Handling & API Responses**:
   - Always wrap async controller logic in standard try/catch blocks or async middleware wrappers.
   - Return errors using standard payload formats: `{ success: false, code: "ERROR_CODE", message: "User friendly error" }`.

5. **Client Components & Styling**:
   - Maintain modern visual aesthetics: dark modes, sleek micro-animations, glassmorphism, responsive grid/flexbox.
   - Keep state logic clean in custom hooks under `client/src/shared/hooks/` and API endpoints under `client/src/shared/services/`.

---
*End of Master AI Knowledge & Training Document for DREAM WAVE AI.*
