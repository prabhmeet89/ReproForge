# Security & Ingestion Architecture

This document outlines the security controls, threat mitigations, test mapping, and known limitations of the ingestion pipeline in ReproForge.

---

## 1. Threats Handled & Security Controls

| Threat | Description | Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- | :--- |
| **Zip Slip** | Archive entries containing relative paths (e.g., `../../etc/passwd`) to escape target directory. | Strict path validation using `path.resolve` and verification that target path starts with target directory boundary with trailing separator. Any path escaping the directory throws `INVALID_ZIP_STRUCTURE` / `ZIP_SLIP_ATTEMPT`. | `backend/src/modules/snapshots/zip-extractor.ts` |
| **Zip Bomb / Resource Exhaustion** | Decompression bombs with tiny archives expanding to tens of gigabytes, or archives containing hundreds of thousands of files. | Limits enforced during extraction streaming: max uncompressed total size (50 MB), max file count (1,000 files), and max single file size (25 MB). Exceeding any threshold aborts extraction immediately with `ZIP_TOO_LARGE` or `ZIP_FILE_LIMIT_EXCEEDED`. | `backend/src/modules/snapshots/zip-extractor.ts` |
| **Symlink / Hardlink Exploits** | Malicious archives containing symlinks pointing to sensitive files on host (e.g., `/etc/shadow`, AWS credentials, or host config). | Symlink and hardlink entries in ZIP archives are strictly ignored or rejected during extraction. No links are followed outside the sandbox. | `backend/src/modules/snapshots/zip-extractor.ts` |
| **Oversized Uploads** | Malicious clients attempting to exhaust server RAM or disk via large file streams. | Client-side check rejects files > 25 MB before upload. Backend Fastify multipart parser enforces an upload ceiling of 25 MB (`LIMIT_FILE_SIZE`). | `frontend/src/pages/ProjectDetailPage.tsx`<br>`backend/src/modules/snapshots/snapshots.routes.ts` |
| **Secret Leakage** | Repository code containing embedded secrets (AWS keys, GitHub tokens, Slack Webhooks, private RSA keys, generic API tokens). | Multi-pattern regex secret scanner runs across all extracted non-binary files before persistence. Detected secrets are flagged with file path, line number, pattern kind, and redacted preview. Findings are displayed with an amber warning banner. | `backend/src/modules/snapshots/secret-scanner.ts`<br>`frontend/src/pages/SnapshotDetailPage.tsx` |
| **Path Traversal on File Reads** | Attackers querying `GET /api/snapshots/:id/files/content?path=../../.env` to read arbitrary host files. | Target file paths are normalized and resolved against `snapshot.storagePath`. Access is strictly denied if the resolved path does not start with the snapshot's canonical storage root. | `backend/src/modules/snapshots/snapshots.service.ts` |
| **Cross-Tenant Access** | Tenant A attempting to view or delete Tenant B's snapshots or trigger context extraction on unauthorized data. | All snapshot endpoints authenticate user via session JWT, lookup the project, and enforce project workspace ownership checks (`project.workspaceId === user.activeWorkspaceId`). | `backend/src/modules/snapshots/snapshots.service.ts` |

---

## 2. Test Mapping

The security guarantees above are validated by automated unit and integration tests:

| Threat / Control | Test File | Test Cases |
| :--- | :--- | :--- |
| **Zip Slip Rejection** | `backend/tests/zip-extractor.test.ts` | - *rejects archives containing entries with `../` path traversal*<br>- *rejects absolute paths outside root* |
| **Zip Bomb & File Limits** | `backend/tests/zip-extractor.test.ts` | - *aborts extraction when uncompressed total exceeds limit*<br>- *aborts extraction when file count exceeds 1,000* |
| **Oversized Uploads (Client)** | `frontend/src/tests/Snapshots.test.tsx` | - *rejects files larger than 25 MB with clear validation message*<br>- *rejects non-zip file extensions* |
| **Secret Scanner Detection** | `backend/tests/secret-scanner.test.ts` | - *detects AWS access keys and secret keys*<br>- *detects GitHub personal access tokens*<br>- *detects Slack incoming webhooks*<br>- *detects RSA private keys*<br>- *redacts detected secret values in output* |
| **Path Traversal on File Read** | `backend/tests/snapshots.service.test.ts` | - *rejects path traversal attempts in getFileContent*<br>- *returns 400/404 for paths outside sandbox directory* |
| **Cross-Tenant / Workspace Isolation** | `backend/tests/snapshots.routes.test.ts` | - *forbids accessing snapshots belonging to another workspace*<br>- *prevents deleting snapshots belonging to other tenants* |

---

## 3. Known Limitations

ReproForge's current snapshot ingestion pipeline is intentionally focused on safe local file analysis for Phase 3. The following limitations are acknowledged:

1. **Local Disk Storage:**
   Snapshots are stored on local persistent disk under the `storage/` directory. For multi-node cloud deployments, an S3/GCS object-storage adapter will be needed in future phases.
2. **No Git History / VCS Metadata:**
   ZIP ingestion extracts the worktree snapshot as of the time of compression. Commit hashes, branch names, and blame history are not tracked unless explicitly provided as metadata.
3. **GitHub Direct Ingestion Deferred:**
   Direct GitHub OAuth and repository cloning were evaluated and explicitly deferred to post-MVP to minimize third-party API rate limit and authentication security overhead.
4. **Heuristic Context Ranking (Non-AI):**
   Context preview ranking is 100% deterministic and heuristic-driven (stack frame regex parsing, token proximity, test file associations). While predictable and instant, it does not infer semantic intent beyond literal stack and code tokens.
