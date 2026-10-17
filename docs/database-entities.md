# Database Entities — ReproForge

> **Note:** This is documentation only. Prisma schema will be created in Phase 2.

---

## Entity: User

| Field        | Type      | Notes                              |
| ------------ | --------- | ---------------------------------- |
| id           | UUID      | Primary key, auto-generated        |
| email        | String    | Unique, used for login             |
| passwordHash | String    | Bcrypt hashed password             |
| name         | String    | Display name                       |
| createdAt    | DateTime  | Auto-set on creation               |
| updatedAt    | DateTime  | Auto-updated on modification       |

**Relationships:**
- User → has many **Projects**
- User → has many **BugReports**

---

## Entity: Project

| Field       | Type      | Notes                                              |
| ----------- | --------- | -------------------------------------------------- |
| id          | UUID      | Primary key, auto-generated                        |
| name        | String    | Project name (e.g., "my-express-app")              |
| description | String?   | Optional description                               |
| sourceType  | Enum      | `zip` \| `sample` \| `github` (github is for later) |
| sourcePath  | String    | Path to stored project files on server             |
| userId      | UUID      | Foreign key → User.id (owner)                      |
| createdAt   | DateTime  | Auto-set on creation                               |
| updatedAt   | DateTime  | Auto-updated on modification                       |

**Relationships:**
- Project → belongs to one **User**
- Project → has many **BugReports**

---

## Entity: BugReport

| Field            | Type      | Notes                                                  |
| ---------------- | --------- | ------------------------------------------------------ |
| id               | UUID      | Primary key, auto-generated                            |
| title            | String    | Short summary (e.g., "Login route returns 500")        |
| description      | String    | Detailed bug description (free text)                   |
| severity         | Enum      | `low` \| `medium` \| `high` \| `critical`              |
| stepsToReproduce | String?   | Optional manual repro steps from the user              |
| status           | Enum      | `pending` \| `investigating` \| `reproduced` \| `not_reproduced` \| `error` |
| projectId        | UUID      | Foreign key → Project.id                               |
| userId           | UUID      | Foreign key → User.id (reporter)                       |
| createdAt        | DateTime  | Auto-set on creation                                   |
| updatedAt        | DateTime  | Auto-updated on modification                           |

**Relationships:**
- BugReport → belongs to one **Project**
- BugReport → belongs to one **User**
- BugReport → has many **TestRuns**

---

## Entity: TestRun

| Field           | Type      | Notes                                                    |
| --------------- | --------- | -------------------------------------------------------- |
| id              | UUID      | Primary key, auto-generated                              |
| bugReportId     | UUID      | Foreign key → BugReport.id                               |
| aiAnalysis      | String?   | AI's analysis of the bug (markdown text)                 |
| generatedCode   | String?   | AI-generated test/reproduction code                      |
| executionStatus | Enum      | `queued` \| `running` \| `completed` \| `failed` \| `timeout` |
| stdout          | String?   | Standard output from Docker sandbox                      |
| stderr          | String?   | Standard error from Docker sandbox                       |
| exitCode        | Int?      | Process exit code (0 = success, non-zero = failure)      |
| durationMs      | Int?      | Execution time in milliseconds                           |
| createdAt       | DateTime  | Auto-set on creation                                     |

**Relationships:**
- TestRun → belongs to one **BugReport**

---

## Entity Relationship Diagram

```
User (1) ──────< (many) Project
User (1) ──────< (many) BugReport
Project (1) ───< (many) BugReport
BugReport (1) ─< (many) TestRun
```

A User can own multiple Projects. Each Project can have multiple BugReports.
Each BugReport can have multiple TestRuns (re-runs with different AI outputs).
