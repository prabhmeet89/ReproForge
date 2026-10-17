# ReproForge — Project Specification

## 1. What is ReproForge?

ReproForge is an **AI-powered bug reproduction tool**. You give it a bug report (a description of what went wrong in a codebase), and it uses an LLM (Large Language Model) to **automatically generate a minimal reproduction** — runnable test code that triggers the bug.

**The core loop:**

```
Bug Report → AI Analysis → Generated Test Code → Run in Docker Sandbox → Results
```

### The Problem

When a developer files a bug report, the hardest part is often **reproducing it**. Many bug reports say "X is broken" but don't include steps to reproduce. This wastes hours of developer time.

### The Solution

ReproForge automates this:

1. A user submits a bug report (text description + project code via ZIP upload or sample repo).
2. The AI reads the bug report and the project's source code.
3. It generates a minimal test/script that should reproduce the bug.
4. The test runs inside an isolated Docker container (sandbox).
5. The user sees the results: did the bug reproduce? What was the output?

---

## 2. Target Users

- **Developers and QA engineers** who receive bug reports and need to reproduce them quickly.
- **Open-source maintainers** who get vague bug reports from users.
- **Students learning testing** who want to see how reproduction tests are written.

---

## 3. Tech Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Frontend         | React 18+ with TypeScript, Vite, Tailwind CSS |
| Backend API      | Node.js with Express and TypeScript |
| Database         | PostgreSQL (via Prisma ORM)         |
| Job Queue        | Redis + BullMQ                      |
| AI / LLM         | OpenAI API (GPT-4o or similar)      |
| Sandbox          | Docker containers (isolated execution) |
| Auth             | Email + Password (bcrypt + JWT)     |
| Source Input     | ZIP upload or sample repos (MVP), GitHub App (later) |

---

## 4. Core Features

### 4.1 User Authentication
- Email + password registration and login.
- JWT-based session tokens.
- Password hashing with bcrypt.

### 4.2 Project Management
- Users can create "Projects" — each project represents one codebase.
- In MVP: upload a ZIP of the project, or select from sample Node/Express repos.
- Later: connect via GitHub App to pull repos automatically.

### 4.3 Bug Report Submission
- Users submit bug reports tied to a project.
- Fields: title, description (free text), severity, steps to reproduce (optional).
- The AI will use this text + the project's source code to understand the bug.

### 4.4 AI Investigation
- When a bug report is submitted, a background job is queued (BullMQ).
- A worker picks up the job and sends the bug report + relevant source code to the LLM.
- The LLM generates:
  - An analysis of what might be going wrong.
  - A minimal reproduction test/script.
- The generated code is saved in the database.

### 4.5 Sandboxed Test Execution
- The generated test code runs inside a Docker container.
- The container is isolated (no network access to host, resource limits).
- The container has Node.js and common testing tools pre-installed.
- Execution results (stdout, stderr, exit code, duration) are captured and stored.

### 4.6 Results Dashboard
- Users see a dashboard with their projects and bug reports.
- For each bug report, they can see:
  - AI analysis and generated test code.
  - Test execution results (pass/fail, logs, duration).
  - Option to re-run or tweak and re-run.

---

## 5. Database Entities (Overview)

### User
- id, email, passwordHash, name, createdAt, updatedAt

### Project
- id, name, description, sourceType (zip/sample/github), userId (owner), createdAt, updatedAt

### BugReport
- id, title, description, severity, stepsToReproduce, status (pending/investigating/reproduced/not-reproduced), projectId, userId, createdAt, updatedAt

### TestRun
- id, bugReportId, generatedCode, aiAnalysis, executionStatus (queued/running/completed/failed), stdout, stderr, exitCode, durationMs, createdAt

### Relationships
- User → has many Projects
- User → has many BugReports
- Project → has many BugReports
- BugReport → has many TestRuns

---

## 6. Architecture (High Level)

```
┌──────────┐     HTTP      ┌──────────────┐     SQL      ┌────────────┐
│  React   │ ←──────────→  │  Express API │ ←──────────→ │ PostgreSQL │
│  Client  │               │   Server     │              │            │
└──────────┘               └──────┬───────┘              └────────────┘
                                  │
                           Enqueue Jobs
                                  │
                           ┌──────▼───────┐
                           │ Redis/BullMQ │
                           │   Queue      │
                           └──────┬───────┘
                                  │
                           ┌──────▼───────┐    API Call   ┌─────────┐
                           │   Worker     │ ─────────────→│ LLM API │
                           │  (BullMQ)    │               │(OpenAI) │
                           └──────┬───────┘               └─────────┘
                                  │
                           Run generated code
                                  │
                           ┌──────▼───────┐
                           │   Docker     │
                           │  Sandbox     │
                           └──────────────┘
```

---

## 7. API Endpoints (Planned)

| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| GET    | /api/health                     | Health check                   |
| POST   | /api/auth/register              | Register new user              |
| POST   | /api/auth/login                 | Login, get JWT                 |
| GET    | /api/auth/me                    | Get current user               |
| GET    | /api/projects                   | List user's projects           |
| POST   | /api/projects                   | Create a project               |
| GET    | /api/projects/:id               | Get project details            |
| GET    | /api/projects/:id/bugs          | List bugs for a project        |
| POST   | /api/bugs                       | Submit a bug report            |
| GET    | /api/bugs/:id                   | Get bug report with test runs  |
| POST   | /api/bugs/:id/investigate       | Trigger AI investigation       |
| GET    | /api/bugs/:id/runs              | List test runs for a bug       |
| POST   | /api/bugs/:id/runs/:runId/rerun | Re-run a test                  |

---

## 8. Development Phases

### Phase 0 — Requirements, Architecture, Environment Setup
- Project structure, Git, tooling, dev environment.
- Backend skeleton (Express + health endpoint).
- Frontend skeleton (Vite + React + Tailwind).
- Documentation (spec, architecture, wireframes, etc.).

### Phase 1 — UI Shell & Static Pages
- Layout with sidebar navigation.
- All pages with placeholder/mock data.
- Responsive design, dark mode support.

### Phase 2 — Database & Prisma Setup
- PostgreSQL via Docker Compose.
- Prisma schema, migrations, seed data.

### Phase 3 — Authentication
- Email + password registration/login.
- JWT tokens, protected routes.
- Auth middleware.

### Phase 4 — Project Management (CRUD)
- Create, list, view, delete projects.
- ZIP upload for project source code.
- Sample project selection.

### Phase 5 — Bug Report Submission
- Create, list, view bug reports.
- Link bugs to projects.
- Status tracking.

### Phase 6 — AI Integration
- Connect to OpenAI API.
- Send bug report + source code context.
- Receive and store AI analysis + generated test code.

### Phase 7 — Job Queue (Redis + BullMQ)
- Queue AI investigation jobs.
- Worker processes jobs in background.
- Real-time status updates.

### Phase 8 — Docker Sandbox Execution
- Build Docker image with Node.js + test tools.
- Run generated code in isolated container.
- Capture stdout, stderr, exit code, duration.
- Resource limits and timeouts.

### Phase 9 — Results & Polish
- Display test results with logs.
- Re-run capability.
- Error handling and edge cases.
- Loading states, toasts, etc.

### Phase 10 — Stretch Goals
- GitHub App integration (auto-import repos).
- Webhook-based trigger on new issues.
- AI-generated patches (not just reproductions).
- PR creation with fix suggestions.
- OpenTelemetry for observability.
- Multiple AI provider support.
- Load testing.

---

## 9. Non-Functional Requirements

- **Security**: All user code runs in isolated Docker containers. No host access.
- **Performance**: AI jobs are async (queued). UI remains responsive.
- **Scalability**: Worker-based architecture allows horizontal scaling later.
- **Developer Experience**: Hot reload for both frontend and backend. TypeScript everywhere.

---

## 10. Constraints & Assumptions

- MVP targets **Node.js/Express projects only** (the sandbox will have Node pre-installed).
- **Single user initially** — multi-tenancy can come later.
- **OpenAI API only** for MVP — provider abstraction is a stretch goal.
- **No CI/CD** in MVP — manual deployment is fine.
- The project is developed on **Windows 11** using VS Code and PowerShell.
