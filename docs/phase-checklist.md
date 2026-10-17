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
- [ ] Layout component with sidebar navigation
- [ ] Dashboard page with mock data
- [ ] Projects list page
- [ ] Bug submission form (UI only)
- [ ] Investigation results page (mock)
- [ ] Test execution results page (mock)
- [ ] Responsive design
- [ ] Dark mode support
- [ ] Loading states and transitions

## Phase 2 — Database & Prisma Setup
- [ ] Start PostgreSQL via Docker Compose
- [ ] Install and configure Prisma
- [ ] Create Prisma schema (User, Project, BugReport, TestRun)
- [ ] Run initial migration
- [ ] Create seed script with sample data
- [ ] Test database connection

## Phase 3 — Authentication
- [ ] Install bcrypt and jsonwebtoken
- [ ] User registration endpoint (POST /api/auth/register)
- [ ] User login endpoint (POST /api/auth/login)
- [ ] JWT middleware for protected routes
- [ ] GET /api/auth/me endpoint
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
