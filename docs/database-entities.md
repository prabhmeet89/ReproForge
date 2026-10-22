# Database Entities — ReproForge

> **Note:** This document mirrors the live Prisma schema at
> `backend/prisma/schema.prisma`. If the two ever disagree, the schema file is
> the source of truth.

---

## Entity: User

| Field        | Type      | Notes                                                        |
| ------------ | --------- | ------------------------------------------------------------ |
| id           | UUID      | Primary key, auto-generated                                  |
| email        | String    | Unique, used for login                                       |
| passwordHash | String    | Bcrypt hashed password                                       |
| name         | String    | Display name                                                 |
| createdAt    | DateTime  | Auto-set on creation                                         |
| updatedAt    | DateTime  | Auto-updated on modification                                 |

**Relationships:**
- User → has many **Projects**
- User → has many **BugReports**
- User → has many **Sessions**

> Until authentication lands (Phase 3) a single demo user owns every row.
> It is created on demand by `usersRepository.getOrCreateDemoUserId()`.

---

## Entity: Session

| Field       | Type      | Notes                                              |
| ----------- | --------- | -------------------------------------------------- |
| id          | UUID      | Primary key, auto-generated                        |
| userId      | UUID      | Foreign key → User.id                              |
| tokenHash   | String    | Unique — only the hash of the session token is stored |
| expiresAt   | DateTime  | Session expiry                                     |
| createdAt   | DateTime  | Auto-set on creation                               |
| lastUsedAt  | DateTime? | Updated on each request that uses the session     |

**Relationships:**
- Session → belongs to one **User**

---

## Entity: Project

| Field          | Type      | Notes                                                        |
| -------------- | --------- | ------------------------------------------------------------ |
| id             | UUID      | Primary key, auto-generated                                  |
| ownerId        | UUID      | Foreign key → User.id (owner)                                |
| name           | String    | Project name (e.g., "my-express-app")                        |
| repositoryUrl  | String?   | Optional source repository URL                               |
| defaultBranch  | String    | Branch name, defaults to `main`                              |
| isDemo         | Boolean   | Marks seeded demo rows, defaults to `false`                  |
| createdAt      | DateTime  | Auto-set on creation                                         |
| updatedAt      | DateTime  | Auto-updated on modification                                 |

**Relationships:**
- Project → belongs to one **User**
- Project → has many **BugReports**

---

## Entity: BugReport

| Field             | Type      | Notes                                                          |
| ----------------- | --------- | -------------------------------------------------------------- |
| id                | UUID      | Primary key, auto-generated                                    |
| projectId         | UUID      | Foreign key → Project.id                                       |
| ownerId           | UUID      | Foreign key → User.id (reporter)                               |
| title             | String    | Short summary (e.g., "Login route returns 500")                |
| description       | String    | Detailed bug description (free text)                           |
| expectedBehavior  | String?   | What the user expected to happen                               |
| actualBehavior    | String?   | What actually happened                                        |
| affectedEndpoint  | String?   | Endpoint the bug was observed on                               |
| stackTrace        | String?   | Captured stack trace                                           |
| logs              | String?   | Captured application logs                                      |
| status            | String    | `submitted` \| `investigating` \| `investigated` \| `test_generated` \| `reproduced` \| `unverified` \| `failed` |
| isDemo            | Boolean   | Marks seeded demo rows, defaults to `false`                    |
| createdAt         | DateTime  | Auto-set on creation                                           |
| updatedAt         | DateTime  | Auto-updated on modification                                   |

> SQLite has no native enum type, so `status` is stored as a `String`. The
> allowed values are enforced by the Zod schema (`bugReportStatusEnum`).

**Relationships:**
- BugReport → belongs to one **Project**
- BugReport → belongs to one **User**
- BugReport → has many **TestRuns**

---

## Entity: TestRun

| Field                  | Type      | Notes                                                       |
| ---------------------- | --------- | ----------------------------------------------------------- |
| id                     | UUID      | Primary key, auto-generated                                 |
| bugReportId            | UUID      | Foreign key → BugReport.id                                  |
| status                 | String    | `queued` \| `running` \| `passed` \| `failed` \| `error`    |
| exitCode               | Int?      | Process exit code (0 = success, non-zero = failure)         |
| durationMs             | Int?      | Execution time in milliseconds                              |
| generatedTestVersion   | String?   | Version of the generated reproduction test                  |
| commitSha              | String?   | Commit the test was generated against                       |
| outputRef              | String?   | Reference to stored output artefacts                        |
| stdout                 | String?   | Standard output from the sandbox run                         |
| stderr                 | String?   | Standard error from the sandbox run                          |
| isDemo                 | Boolean   | Marks seeded demo rows, defaults to `false`                 |
| createdAt              | DateTime  | Auto-set on creation                                        |

**Relationships:**
- TestRun → belongs to one **BugReport**

---

## Entity Relationship Diagram

```
User (1) ──────< (many) Project
User (1) ──────< (many) BugReport
User (1) ──────< (many) Session
Project (1) ───< (many) BugReport
BugReport (1) ─< (many) TestRun
```

A User can own multiple Projects. Each Project can have multiple BugReports.
Each BugReport can have multiple TestRuns (re-runs with different AI outputs).
All child rows cascade-delete when their parent is deleted.
