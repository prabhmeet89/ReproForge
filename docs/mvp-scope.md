# MVP Scope — ReproForge

## What is IN the MVP

### Core Features
- **Email + Password Auth**: Simple registration and login with JWT tokens
- **Project Upload**: Upload a ZIP file of a Node/Express project (no GitHub integration yet)
- **Sample Projects**: A small set of pre-loaded sample Node/Express repos with known bugs for testing
- **Bug Report Submission**: Submit a text-based bug report linked to a project
- **AI Investigation**: Send bug report + source code to OpenAI API, get back analysis + generated test code
- **Sandboxed Execution**: Run the generated test code in an isolated Docker container
- **Results Display**: Show test results (pass/fail, stdout, stderr, duration)
- **Dashboard**: Simple overview of projects, bugs, and their statuses

### Tech Constraints (MVP)
- Only **Node.js/Express** projects supported
- Only **OpenAI** as AI provider
- Single-user focus (no teams/organizations)
- Manual deployment (no CI/CD)

---

## What is POSTPONED (Not in MVP)

| Feature | Why Postponed |
|---------|--------------|
| **GitHub App Integration** | Complex OAuth flow + webhook setup — ZIP upload is simpler for MVP |
| **Webhooks** | Needs GitHub App first |
| **PR Creation** | Needs GitHub App + write access to repos |
| **AI-Generated Patches** | Much harder than reproduction — reproduction alone is valuable |
| **Multiple AI Providers** | Start with OpenAI, add abstraction layer later |
| **OpenTelemetry** | Observability is nice-to-have, not critical for proving the concept |
| **Load Testing** | Optimize after we know the product works |
| **Multi-language Support** | Start with Node.js only, expand later |
| **Teams / Organizations** | Single-user is fine for MVP |
| **Real-time Updates (WebSocket)** | Polling is fine for MVP |
