# ReproForge 🔬

> AI-Powered Bug Reproduction Tool

ReproForge takes a bug report and your project code, analyzes the bug with an LLM, generates minimal runnable reproduction test code, and executes it inside an isolated Docker sandbox container.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router DOM, react-hook-form + Zod
- **Backend:** Node.js, Express, TypeScript, Zod, tsx, CORS, dotenv
- **Database (Phase 2+):** SQLite (via Prisma ORM) — PostgreSQL later
- **Auth (Phase 3):** Server-side sessions in the database, argon2id passwords, httpOnly cookies
- **Job Queue (Phase 7+):** Redis + BullMQ
- **AI / LLM (Phase 6+):** OpenAI API
- **Execution Sandbox (Phase 8+):** Docker containers
- For UI/UX work, use the ui-ux-pro-max skill as an ADVISOR and
  checker. My explicit design decisions (docs/DESIGN.md and the
  current prompt) always win. If the skill's advice conflicts with
  them, tell me the conflict instead of silently changing the design.
- On Windows use `python`, not `python3`, if python3 is not found.
  Never install software yourself; ask me.

---

## Project Structure

```text
bug-to-repro-ai/
├── client/                  # Frontend (React + TypeScript + Vite + Tailwind CSS v4)
│   ├── src/
│   │   ├── components/      # Reusable UI components (ui/, layout/, auth/, landing/)
│   │   ├── pages/           # Page views
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Helpers / utilities
│   │   ├── App.tsx          # Health check & App component
│   │   ├── main.tsx         # Root provider wrapper (QueryClient, Router)
│   │   └── index.css        # Tailwind CSS import
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                  # Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/          # Zod env schema & validation (env.ts)
│   │   ├── middleware/      # requireAuth, csrf, rate limit, error & 404 handlers
│   │   ├── modules/         # auth, projects, bug-reports, test-runs, dashboard
│   │   ├── queues/          # BullMQ queue definitions
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   ├── workers/         # Background job workers
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entry point & listener
│   ├── prisma/              # Prisma schema & migrations
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── docker/                  # Dockerfiles for sandbox
├── docs/                    # Specifications & Architecture
│   ├── PROJECT_SPEC.md
│   ├── mvp-scope.md
│   ├── architecture.md
│   ├── database-entities.md
│   ├── wireframes.md
│   ├── phase-checklist.md
│   ├── api.md
│   └── DESIGN.md
├── docker-compose.yml       # PostgreSQL & Redis container definitions
├── .gitignore
└── README.md
```

---

## Windows Setup & Run Instructions

### 1. Prerequisites
- **Node.js**: v20+ or current LTS installed
- **Git**: Installed
- **PowerShell**: Default shell on Windows 11

### 2. Database

Local development uses **SQLite** (a file on disk), so **no Docker and no
PostgreSQL are needed**. `docker-compose.yml` stays in the repo as a
placeholder for the Redis queue in Phase 7.

```powershell
cd server
npm install
Copy-Item .env.example .env
```

The schema lives in `prisma/schema.prisma`. Create the database and apply the
migrations:

```powershell
# Create the SQLite file and run every migration
npx prisma migrate dev

# (Optional) Seed the demo account and its sample projects / bug reports.
# Needs DEMO_EMAIL and DEMO_PASSWORD in server/.env, and refuses to run
# when NODE_ENV=production.
npm run db:seed
```

> **Watch `NODE_ENV`.** If `NODE_ENV=production` is set in your Windows
> environment, the session cookie is issued with `Secure`, and browsers
> reject it over plain `http://` — so login will silently fail. Start the
> dev server with `$env:NODE_ENV="development"` to override it.

### 3. Backend (Server) Setup
```powershell
cd server

# Start dev server with auto-reload (runs on http://localhost:3001)
npm run dev

# Or compile TypeScript build
npm run build
```

Health check endpoint:
[http://localhost:3001/api/health](http://localhost:3001/api/health)

### 4. Frontend (Client) Setup
Open a second PowerShell window:
```powershell
cd client
npm install

# Copy environment variables file if not already done
Copy-Item .env.example .env

# Start dev server (runs on http://localhost:5173)
npm run dev

# Or build client production bundle
npm run build
```
Open [http://localhost:5173](http://localhost:5173) in your browser to verify "Backend connected".

### 5. Sign in

The console at `/app` needs an account. Use the **Sign up** link on the
landing page, or log in with the demo account if you ran `npm run db:seed`.
Every project, bug report and test run belongs to the account that created
it — another user cannot see or open them.

### 6. Tests

```powershell
cd server
npm test          # 59 tests against an isolated SQLite test database

cd ..\client
npm test          # 17 tests (Vitest + Testing Library)
```

The client suite pins `NODE_ENV=development` for the test run, because
React's production build does not expose `act` and Testing Library cannot
render without it.

## API

See [docs/api.md](docs/api.md) for the full endpoint list, the auth flow,
the error codes and the pagination and sorting rules.

## Phase 2 rules
- Phase 2 = database + auth only. Do not touch the landing page
  (client/src/components/landing, pages/LandingPage.tsx, CursorGlow).
- Never use Bash echo to print status; write status in the reply.
- Ask me BEFORE destructive commands: prisma migrate reset,
  docker compose down -v, DROP/TRUNCATE on any non-test database,
  deleting files.
- Follow the CURRENT official docs for Prisma and for every library
  you install. Do not guess syntax from memory.
- Security: never log passwords, tokens or cookies. Never return
  passwordHash in any response. Real secrets only in .env
  (gitignored); placeholders in .env.example.
- Any query returning user data must filter by the logged-in user
  inside the query itself. Someone else's resource returns 404,
  never 403.
- Explain changes in simple Hinglish. PowerShell-compatible commands.