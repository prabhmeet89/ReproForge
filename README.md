# ReproForge 🔬

> AI-Powered Bug Reproduction Tool

ReproForge takes a bug report and your project code, analyzes the bug with an LLM, generates minimal runnable reproduction test code, and executes it inside an isolated Docker sandbox container.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router DOM
- **Backend:** Node.js, Express, TypeScript, Zod, tsx, CORS, dotenv
- **Database (Phase 2+):** PostgreSQL (via Prisma ORM)
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
│   │   ├── components/      # Reusable UI components
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
│   │   ├── middleware/      # Error & 404 handlers (errorHandler.ts)
│   │   ├── modules/         # Future domain modules
│   │   ├── queues/          # BullMQ queue definitions
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   ├── workers/         # Background job workers
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entry point & listener
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

### 2. Backend (Server) Setup
Open PowerShell and run:
```powershell
cd server
npm install

# Copy environment variables file if not already done
Copy-Item .env.example .env

# Start dev server with auto-reload (runs on http://localhost:3001)
npm run dev

# Or compile TypeScript build
npm run build
```

Health check endpoint:
[http://localhost:3001/api/health](http://localhost:3001/api/health)

### 3. Frontend (Client) Setup
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