# Phase Checklist — ReproForge

## Phase 0 — Requirements, Architecture & Environment Setup
- [x] Create PROJECT_SPEC.md
- [x] Prerequisites check (Node, npm, Git, Docker)
- [x] Git init + .gitignore
- [x] Connect to GitHub remote
- [x] Backend skeleton (Express + TypeScript + health endpoint)
- [x] Env validation with Zod
- [x] CORS configured for client origin
- [x] 404 handler + centralized error handler
- [x] Frontend skeleton (Vite + React + TypeScript + Tailwind CSS v4)
- [x] React Router + TanStack Query providers set up
- [x] Landing page calls /api/health and shows connection status
- [x] Docker Compose placeholder (PostgreSQL + Redis)
- [x] Documentation: mvp-scope.md
- [x] Documentation: architecture.md (with Mermaid diagram)
- [x] Documentation: database-entities.md
- [x] Documentation: wireframes.md
- [x] Documentation: phase-checklist.md
- [x] Documentation: DESIGN.md
- [x] Documentation: README.md
- [x] .env.example files for client and server
- [x] Empty folders with .gitkeep
- [x] Verification: server runs, health endpoint works, client connects
- [x] Push to GitHub

## Phase 1 — UI Shell & Static Pages
- [x] Layout component with sidebar navigation (`AppLayout`, `Sidebar`, `Topbar`)
- [x] Dashboard page with mock data
- [x] Projects list page
- [x] Bug submission form (UI only)
- [x] Investigation results page (mock)
- [x] Test execution results page (mock)
- [x] Responsive design
- [ ] Dark mode support — the app is dark-only today (fixed `#05070D` body background, no light theme or theme toggle yet)
- [x] Loading states and transitions (`Skeleton`, `Button isLoading`, TanStack Query states)

## Phase 2 — Database & Prisma Setup
- [x] Start PostgreSQL via Docker Compose — **superseded**: local dev now uses SQLite (`provider = "sqlite"`), no Docker needed. `docker-compose.yml` remains as a placeholder for later phases.
- [x] Install and configure Prisma (Prisma 5.22.0, `prisma-client-js` generator)
- [x] Create Prisma schema (User, Session, Project, BugReport, TestRun)
- [x] Run initial migration (`20261020000000_init`) plus `20261020111054_add_testrun_output` for `TestRun.stdout` / `TestRun.stderr`
- [x] Create seed script with sample data (`npm run db:seed`, add `-- --force` to wipe and reseed) — needs `DEMO_EMAIL` and `DEMO_PASSWORD` in `server/.env`, and refuses to run when `NODE_ENV=production`
- [x] Test database connection
- [x] Wire the repositories to Prisma — `projects`, `bug-reports` and `test-runs` repositories now read/write real rows instead of in-memory arrays
- [x] Isolate the test database — tests run against `prisma/test.db`, never the dev database

## Phase 3 — Authentication
- [x] Install argon2 (argon2id) and cookie-parser — **not** bcrypt/jsonwebtoken: the session design is server-side, not JWT
- [x] User registration endpoint (POST /api/auth/signup)
- [x] User login endpoint (POST /api/auth/login)
- [x] Logout endpoint (POST /api/auth/logout) — deletes the session row, idempotent
- [x] Server-side sessions in the database — the cookie holds a raw token, the database only stores its SHA-256 hash, 7 day TTL
- [x] requireAuth middleware for protected routes (sets `req.user = { id, email }`)
- [x] GET /api/auth/me endpoint
- [x] CSRF protection (Origin check) and rate limiting on login/signup
- [x] Ownership enforced in the query — every project, bug report and test run read is filtered by the caller's id, so another user's resource is a 404, never a 403
- [x] `requireAuth` on every domain route (projects, bug-reports, test-runs, dashboard)
- [x] `ownerId` / `isDemo` rejected from request bodies (strict Zod schemas)
- [x] Central Prisma error mapping — P2002 → 409, P2025 → 404, P2003 → 422, anything else → 500 with no internals
- [x] Pagination capped at 50 per page, sort fields from a whitelist
- [x] Demo seed is a dev-only script (`npm run db:seed`) that refuses to run in production
- [ ] Frontend login/register pages
- [ ] Auth context/state management
- [ ] Protected routes on frontend

## Phase 4 — Project Management (CRUD)
- [ ] POST /api/projects (create)
- [ ] GET /api/projects (list user's projects)
- [ ] GET /api/projects/:id (single project)
- [ ] DELETE /api/projects/:id
- [ ] ZIP file upload handling
- [ ] Sample project selection
- [ ] Frontend project pages (create, list, detail)

## Phase 5 — Bug Report Submission
- [ ] POST /api/bugs (create)
- [ ] GET /api/bugs/:id (single bug with test runs)
- [ ] GET /api/projects/:id/bugs (bugs for a project)
- [ ] Bug status tracking
- [ ] Frontend bug submission form
- [ ] Frontend bug detail page

## Phase 6 — AI Integration
- [ ] Install OpenAI SDK
- [ ] AI service module (send prompt, receive response)
- [ ] Prompt engineering for bug analysis
- [ ] Parse AI response (analysis + generated code)
- [ ] POST /api/bugs/:id/investigate endpoint
- [ ] Store AI results in TestRun

## Phase 7 — Job Queue (Redis + BullMQ)
- [ ] Start Redis via Docker Compose
- [ ] Install and configure BullMQ
- [ ] Create investigation queue
- [ ] Create worker process
- [ ] Move AI calls to worker
- [ ] Job status tracking
- [ ] Retry logic for failed jobs

## Phase 8 — Docker Sandbox Execution
- [ ] Create Dockerfile for sandbox (Node.js + test tools)
- [ ] Docker execution service
- [ ] Run generated code in isolated container
- [ ] Capture stdout, stderr, exit code, duration
- [ ] Resource limits (CPU, memory, timeout)
- [ ] Container cleanup after execution

## Phase 9 — Results & Polish
- [ ] Display test results with formatted logs
- [ ] Re-run capability (POST /api/bugs/:id/runs/:runId/rerun)
- [ ] Error handling for all edge cases
- [ ] Loading states, toast notifications
- [ ] Input validation on all forms
- [ ] API rate limiting

## Phase 10 — Stretch Goals
- [ ] GitHub App integration
- [ ] Webhook-based trigger on new issues
- [ ] AI-generated patches
- [ ] PR creation with fix suggestions
- [ ] OpenTelemetry observability
- [ ] Multiple AI provider support
- [ ] Load testing
- [ ] Multi-language project support
