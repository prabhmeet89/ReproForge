# API Reference — ReproForge

Base URL (local dev): `http://localhost:3001`

All responses use the same envelope:

```json
{ "success": true, "message": "Success", "data": {} }
```

Failures use:

```json
{ "success": false, "message": "Resource not found", "errors": [{ "field": "email", "message": "..." }] }
```

`errors` is present only when the failure belongs to specific fields. Every
list endpoint adds a `meta` object alongside `data`:

```json
{ "success": true, "data": [], "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } }
```

---

## Authentication

The session lives in an **httpOnly cookie** (`SESSION_COOKIE_NAME`, default
`reproforge_session`). The browser sends it automatically; the client only
needs `credentials: "include"` on its fetches.

A request that carries no session, a session that has expired, or a session
whose token does not match any row is rejected with **401**.

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/api/auth/signup` | no | `{ email, password }` | `201` → the new user `{ id, email, createdAt }`, and sets the session cookie |
| `POST` | `/api/auth/login` | no | `{ email, password }` | `200` → the user `{ id, email, createdAt }`, and sets the session cookie |
| `POST` | `/api/auth/logout` | no | — | `200` → `null`; deletes the session row and clears the cookie. Idempotent |
| `GET` | `/api/auth/me` | **yes** | — | `200` → the current user `{ id, email, createdAt }` |

### Rules

- **Email** is trimmed and lower-cased, must be a valid address, and is at
  most 254 characters.
- **Password** at signup: 10–128 characters, and must not equal the email.
- **Password** at login: 1–128 characters. The client asks for 10 anyway,
  because every account was created with a password that long.
- A duplicate email is a **409** — *"An account with this email already exists"*.
- An unknown email and a wrong password give the **exact same** 401 message
  (*"Invalid email or password"*) and take the same time, so neither reveals
  whether an email is registered.
- `passwordHash` is **never** in any response.

### Rate limiting

`POST /api/auth/login` and `POST /api/auth/signup` are limited per IP to
`AUTH_RATE_LIMIT_MAX` attempts (default 10) per `AUTH_RATE_LIMIT_WINDOW_MINUTES`
(default 15). The limit is disabled in the test environment.

### CSRF

For `POST` / `PUT` / `PATCH` / `DELETE`, if the request carries an `Origin`
header that is not `CLIENT_URL`, the server answers **403**. `Origin` is only
present on cross-origin browser requests, so a same-origin or non-browser
client is unaffected.

### CORS

Only `CLIENT_URL` is allowed, with `credentials: true`.

---

## Domain routes

Every route below requires a session. Without one the answer is **401**.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/projects` | The caller's projects only. Supports `page`, `limit`, `search`, `sort` |
| `POST` | `/api/projects` | Creates a project owned by the caller |
| `GET` | `/api/projects/:id` | 404 if the project is not the caller's |
| `POST` | `/api/projects/:projectId/snapshots` | Multipart ZIP upload (`archive` file + optional `label`). Returns 201 (or 200 on deduplicated) |
| `POST` | `/api/projects/:projectId/snapshots/sample` | Ingests a prepackaged sample repository (e.g. `payment-order-bug`) |
| `GET` | `/api/projects/:projectId/snapshots` | Lists snapshots for a project (paginated) |
| `GET` | `/api/snapshots/:id` | Retrieves snapshot metadata and repository analysis |
| `GET` | `/api/snapshots/:id/files` | Lists files in snapshot with `kind` and `search` query parameters |
| `GET` | `/api/snapshots/:id/files/content` | Reads file content safely with secret redaction (`path` query param) |
| `DELETE` | `/api/snapshots/:id` | Deletes snapshot record and associated disk artifacts |
| `GET` | `/api/bug-reports` | The caller's bug reports only. Supports `page`, `limit`, `status`, `projectId`, `sort` |
| `POST` | `/api/bug-reports` | `projectId` must be one of the caller's projects. Optional `snapshotId` |
| `GET` | `/api/bug-reports/:id` | 404 if the bug report is not the caller's |
| `PATCH` | `/api/bug-reports/:id/snapshot` | Attaches snapshot to bug report `{ snapshotId }` |
| `GET` | `/api/bug-reports/:id/context-preview` | Heuristic context preview (ranked files, parsed frames, redacted logs) |
| `GET` | `/api/test-runs` | The caller's test runs only. Supports `page`, `limit`, `status`, `bugReportId`, `sort` |
| `GET` | `/api/test-runs/:id` | 404 if the test run is not the caller's |
| `GET` | `/api/dashboard/summary` | Counts only the caller's rows |

### Snapshot Error Codes

When a snapshot upload or ingestion fails, the server responds with a specific error code in the error response envelope:

| Error Code | HTTP Status | Description |
|---|---|---|
| `INVALID_ARCHIVE` | 400 | File is corrupt or not a valid ZIP archive |
| `ARCHIVE_TOO_LARGE` | 413 | ZIP file exceeds the maximum archive size (25 MB) |
| `TOO_MANY_FILES` | 422 | Archive contains more entries than the 5,000 file threshold |
| `EXTRACTED_TOO_LARGE`| 422 | Uncompressed disk size exceeds the 100 MB extraction limit |
| `UNSAFE_PATH` | 422 | Entry contains path traversal (`../`), absolute paths, or invalid chars |
| `ZIP_BOMB` | 422 | Entry exceeds maximum compression ratio threshold (100:1) |
| `EMPTY_SNAPSHOT` | 422 | Archive contains no valid, ingestible source files |
| `QUOTA_EXCEEDED` | 429 | Snapshot count limit reached for project (10) or user (25) |


### Ownership

Ownership is enforced **inside the query**, never as a check afterwards:

- Project → `where { id, ownerId: user.id }`
- BugReport → `where { id, project: { ownerId: user.id } }`
- TestRun → `where { id, bugReport: { project: { ownerId: user.id } } }`

So **another user's resource is a 404, never a 403**. A 403 would confirm the
resource exists, which lets someone enumerate ids. Creating a bug report
against someone else's — or a non-existent — `projectId` gives the same
404 as a missing project.

### Query parameters

| Parameter | Default | Notes |
|---|---|---|
| `page` | `1` | 1-based |
| `limit` | `10` | Capped at **50** — a larger value is silently reduced |
| `search` | — | Projects only. Case-insensitive `contains` on the name |
| `status` | — | Must be a valid enum value, else 422 |
| `projectId` | — | Bug reports only. Must be the caller's |
| `bugReportId` | — | Test runs only. Must be the caller's |
| `sort` | per endpoint | One of the whitelisted values below — never a free-form field name |

Sort whitelists:

- Projects: `newest`, `oldest`, `name`, `name-desc`
- Bug reports: `newest`, `oldest`, `title`, `title-desc`, `status`
- Test runs: `newest`, `oldest`, `status`

---

## Error codes

| Code | When |
|---|---|
| **400** | Bad request that is not field validation |
| **401** | No session, or the session is invalid or expired. Also: wrong email/password at login |
| **403** | CSRF — a cross-origin `Origin` on a state-changing request |
| **404** | The resource does not exist **or** belongs to somebody else. Also an unmatched route |
| **409** | A unique constraint failed — e.g. signing up with an email that already exists |
| **422** | Validation failed. The response carries an `errors` array naming each field |
| **429** | The auth rate limit was hit |
| **500** | Anything unexpected. The message is always *"Internal server error"* — no internals are leaked |

### Prisma error mapping

The error handler maps Prisma's own error codes centrally:

| Prisma code | Result |
|---|---|
| `P2002` (unique constraint) | **409** |
| `P2025` (record not found) | **404** |
| `P2003` (foreign key constraint) | **422** |
| anything else | **500**, generic message |

### Mass assignment

`ownerId`, `userId` and `isDemo` are **never** accepted from a request body.
The request schemas are strict, so sending any of them is a **422**. Ownership
always comes from the session.

---

## Public routes

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | No session needed. Returns `{ status, timestamp, environment }` |
