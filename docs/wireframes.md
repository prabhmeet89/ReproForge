# Wireframes — ReproForge

> Simple ASCII wireframes for the main pages. These are rough layouts — final
> design will be polished in Phase 1.

---

## 1. Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  🔬 ReproForge                          [User] [Logout]     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │   Welcome back, Prabhmeet!                       │
│          │                                                  │
│ Dashboard│   ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ Projects │   │ Projects │ │   Bugs   │ │TestRuns  │        │
│ Bugs     │   │    3     │ │    12    │ │    8     │        │
│ Settings │   └──────────┘ └──────────┘ └──────────┘        │
│          │                                                  │
│          │   Recent Bug Reports                             │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ #12 Login 500 error    [Reproduced] ✅  │    │
│          │   │ #11 CORS issue         [Investigating]  │    │
│          │   │ #10 Memory leak        [Pending] ⏳     │    │
│          │   └─────────────────────────────────────────┘    │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 2. Projects List

```
┌─────────────────────────────────────────────────────────────┐
│  🔬 ReproForge                          [User] [Logout]     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │   My Projects              [+ New Project]       │
│          │                                                  │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ 📦 my-express-app                       │    │
│          │   │    3 bugs · Last updated 2 hours ago    │    │
│          │   ├─────────────────────────────────────────┤    │
│          │   │ 📦 todo-api                             │    │
│          │   │    5 bugs · Last updated 1 day ago      │    │
│          │   ├─────────────────────────────────────────┤    │
│          │   │ 📦 sample-chat-app                      │    │
│          │   │    4 bugs · Last updated 3 days ago     │    │
│          │   └─────────────────────────────────────────┘    │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 3. Bug Submission Form

```
┌─────────────────────────────────────────────────────────────┐
│  🔬 ReproForge                          [User] [Logout]     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │   Submit Bug Report                              │
│          │   Project: [my-express-app ▾]                    │
│          │                                                  │
│          │   Title:                                         │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ Login route returns 500 on valid creds  │    │
│          │   └─────────────────────────────────────────┘    │
│          │                                                  │
│          │   Description:                                   │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ When I POST to /api/login with valid    │    │
│          │   │ email and password, the server returns  │    │
│          │   │ HTTP 500 instead of a JWT token...      │    │
│          │   └─────────────────────────────────────────┘    │
│          │                                                  │
│          │   Severity: [Medium ▾]                           │
│          │                                                  │
│          │   Steps to Reproduce (optional):                 │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ 1. POST /api/login                      │    │
│          │   │ 2. Body: { email, password }            │    │
│          │   └─────────────────────────────────────────┘    │
│          │                                                  │
│          │             [Cancel]  [Submit & Investigate 🔍]  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 4. Investigation Results

```
┌─────────────────────────────────────────────────────────────┐
│  🔬 ReproForge                          [User] [Logout]     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │   Bug #12: Login route returns 500               │
│          │   Status: [Reproduced ✅]  Severity: [Medium]    │
│          │                                                  │
│          │   ── AI Analysis ──────────────────────────────   │
│          │   The issue is in src/routes/auth.ts line 42.    │
│          │   The bcrypt.compare call is missing an await,   │
│          │   causing it to always resolve as truthy...      │
│          │                                                  │
│          │   ── Generated Test Code ─────────────────────   │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ const request = require('supertest');   │    │
│          │   │ const app = require('./src/app');       │    │
│          │   │                                        │    │
│          │   │ test('login returns 500', async () => { │    │
│          │   │   const res = await request(app)       │    │
│          │   │     .post('/api/login')                │    │
│          │   │     .send({ email: '...', pass: '...' │    │
│          │   │   expect(res.status).toBe(500);       │    │
│          │   │ });                                    │    │
│          │   └─────────────────────────────────────────┘    │
│          │                                                  │
│          │             [Re-investigate 🔄]  [Run Test ▶️]    │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 5. Test Execution Results

```
┌─────────────────────────────────────────────────────────────┐
│  🔬 ReproForge                          [User] [Logout]     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │   Test Run #3 for Bug #12                        │
│          │   Status: [Completed ✅]  Duration: 2.4s         │
│          │   Exit Code: 1 (test failed = bug reproduced!)   │
│          │                                                  │
│          │   ── stdout ──────────────────────────────────   │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ FAIL  test/repro.test.js                │    │
│          │   │   ✕ login returns 500 (234 ms)         │    │
│          │   │                                        │    │
│          │   │ Expected: 200                          │    │
│          │   │ Received: 500                          │    │
│          │   └─────────────────────────────────────────┘    │
│          │                                                  │
│          │   ── stderr ──────────────────────────────────   │
│          │   ┌─────────────────────────────────────────┐    │
│          │   │ (empty)                                │    │
│          │   └─────────────────────────────────────────┘    │
│          │                                                  │
│          │             [Back to Bug]  [Re-run ▶️]            │
└──────────┴──────────────────────────────────────────────────┘
```
