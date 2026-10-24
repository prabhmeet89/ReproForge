-- CreateTable
CREATE TABLE "RepoSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "contentHash" TEXT NOT NULL,
    "commitSha" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" INTEGER NOT NULL DEFAULT 0,
    "excludedCount" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL,
    "analysis" TEXT,
    "secretFindingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepoSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SnapshotFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "secretFindings" TEXT,
    CONSTRAINT "SnapshotFile_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RepoSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BugReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedBehavior" TEXT,
    "actualBehavior" TEXT,
    "affectedEndpoint" TEXT,
    "stackTrace" TEXT,
    "logs" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "snapshotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BugReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BugReport_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BugReport_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RepoSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BugReport" ("actualBehavior", "affectedEndpoint", "createdAt", "description", "expectedBehavior", "id", "isDemo", "logs", "ownerId", "projectId", "stackTrace", "status", "title", "updatedAt") SELECT "actualBehavior", "affectedEndpoint", "createdAt", "description", "expectedBehavior", "id", "isDemo", "logs", "ownerId", "projectId", "stackTrace", "status", "title", "updatedAt" FROM "BugReport";
DROP TABLE "BugReport";
ALTER TABLE "new_BugReport" RENAME TO "BugReport";
CREATE INDEX "BugReport_projectId_createdAt_idx" ON "BugReport"("projectId", "createdAt");
CREATE INDEX "BugReport_projectId_status_idx" ON "BugReport"("projectId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RepoSnapshot_projectId_createdAt_idx" ON "RepoSnapshot"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepoSnapshot_projectId_contentHash_key" ON "RepoSnapshot"("projectId", "contentHash");

-- CreateIndex
CREATE INDEX "SnapshotFile_snapshotId_kind_idx" ON "SnapshotFile"("snapshotId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SnapshotFile_snapshotId_path_key" ON "SnapshotFile"("snapshotId", "path");
