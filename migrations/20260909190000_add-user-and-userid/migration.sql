-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScenarioRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "inputHash" TEXT NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "inputs" TEXT NOT NULL,
    "outputs" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Preserva las filas existentes: scopeId (columna vieja) → userId (columna nueva).
INSERT INTO "new_ScenarioRecord" ("createdAt", "formulaVersion", "id", "inputHash", "inputs", "module", "outputs", "status", "updatedAt", "version", "userId")
SELECT "createdAt", "formulaVersion", "id", "inputHash", "inputs", "module", "outputs", "status", "updatedAt", "version", "scopeId" FROM "ScenarioRecord";
DROP TABLE "ScenarioRecord";
ALTER TABLE "new_ScenarioRecord" RENAME TO "ScenarioRecord";
CREATE INDEX "ScenarioRecord_userId_module_idx" ON "ScenarioRecord"("userId", "module");
CREATE INDEX "ScenarioRecord_inputHash_idx" ON "ScenarioRecord"("inputHash");
CREATE UNIQUE INDEX "ScenarioRecord_userId_module_inputHash_status_key" ON "ScenarioRecord"("userId", "module", "inputHash", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");