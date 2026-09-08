/**
 * metrix · scenarios/scenario.repo.test.ts
 * Test de integración del repositorio Prisma contra SQLite (BD local de desarrollo).
 * Se truncan las tablas en beforeEach para aislamiento.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { PrismaScenarioRepo } from "./scenario.repo";
import { prisma } from "@/lib/prisma";

const repo = new PrismaScenarioRepo();

beforeAll(async () => {
  // Asegura el schema (si la BD no existe aún).
  // En CI se ejecuta prisma db push previamente; aquí es un no-op si ya existe.
});

beforeEach(async () => {
  await prisma.auditEntry.deleteMany();
  await prisma.scenarioRecord.deleteMany();
});

describe("scenario.repo (SQLite integration)", () => {
  it("crea un ScenarioRecord y lo recupera por id", async () => {
    const created = await repo.create({
      scopeId: "scope-int",
      module: "quadratic",
      inputHash: "hash-1",
      formulaVersion: "quadratic-v1",
      inputs: { a: 1, b: -3, c: 2 },
    });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.module).toBe("quadratic");
    expect(found?.status).toBe("DRAFT");
    expect(found?.inputs).toEqual({ a: 1, b: -3, c: 2 });
  });

  it("busca por clave única scopeId+module+inputHash", async () => {
    await repo.create({
      scopeId: "scope-int",
      module: "pricing",
      inputHash: "h-shared",
      formulaVersion: "pricing-v1",
      inputs: { baseCost: 10 },
    });
    const found = await repo.findByUniqueKey("scope-int", "pricing", "h-shared");
    expect(found).not.toBeNull();
    expect(found?.status).toBe("DRAFT");
  });

  it("lista filtrado", async () => {
    await repo.create({ scopeId: "s1", module: "quadratic", inputHash: "q1", formulaVersion: "v", inputs: {} });
    await repo.create({ scopeId: "s1", module: "pricing", inputHash: "p1", formulaVersion: "v", inputs: {} });
    const list = await repo.list({ scopeId: "s1", module: "pricing" });
    expect(list).toHaveLength(1);
    expect(list[0].module).toBe("pricing");
  });

  it("actualiza estado y outputs preservando inmutabilidad en BD", async () => {
    const created = await repo.create({
      scopeId: "s1",
      module: "roi",
      inputHash: "r1",
      formulaVersion: "roi-v1",
      inputs: { initialInvestment: 100 },
    });
    const updated = await repo.updateStatus(created.id, "SAVED", { roiPct: 20 });
    expect(updated.status).toBe("SAVED");
    expect(updated.outputs).toEqual({ roiPct: 20 });
    // Persistido realmente
    const reloaded = await repo.findById(created.id);
    expect(reloaded?.status).toBe("SAVED");
    expect(reloaded?.outputs).toEqual({ roiPct: 20 });
  });

  it("registra audits y los lista cronológicamente", async () => {
    const created = await repo.create({
      scopeId: "s1",
      module: "quadratic",
      inputHash: "a1",
      formulaVersion: "v",
      inputs: {},
    });
    await repo.createAudit({ scenarioId: created.id, fromStatus: null, toStatus: "DRAFT", action: "CREATE" });
    await repo.createAudit({ scenarioId: created.id, fromStatus: "DRAFT", toStatus: "SAVED", action: "SAVE" });
    const audits = await repo.listAudits(created.id);
    expect(audits).toHaveLength(2);
    expect(audits.map((a) => a.action)).toEqual(["CREATE", "SAVE"]);
  });

  it("la clave única impide duplicados (violación de constraint si se fuerza)", async () => {
    await repo.create({
      scopeId: "s1",
      module: "quadratic",
      inputHash: "dup",
      formulaVersion: "v",
      inputs: {},
    });
    await expect(
      repo.create({ scopeId: "s1", module: "quadratic", inputHash: "dup", formulaVersion: "v", inputs: {} })
    ).rejects.toThrow();
  });
});