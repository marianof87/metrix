/**
 * metrix · scenarios/scenario.repo.user.test.ts
 * Fase 5a — T1 RED: User FK + renombrar scopeId→userId
 * ESTE ARCHIVO DEBE FALLAR hasta que exista el GREEN de T1
 * (PrismaScenarioRepo hoy usa scopeId; schema.prisma aún no tiene User/userId).
 *
 * Contrato que valida (AC T1):
 * 1. create() acepta userId y persiste fila con userId
 * 2. findByUniqueKey(userId, module, inputHash, status) encuentra
 * 3. unique(userId, module, inputHash, status) rechaza duplicado → P2002
 * 4. list({ userId }) filtra por userId
 *
 * Patrón replicado de src/scenarios/scenario.repo.test.ts:
 * - importa repo REAL (PrismaScenarioRepo) y prisma singleton de @/lib/prisma
 * - cleanup con deleteMany por prefijo "f5-" en el campo que corresponde (userId)
 * - misma base prisma/dev.db
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PrismaScenarioRepo } from "./scenario.repo";
import { prisma } from "@/lib/prisma";

const repo = new PrismaScenarioRepo();

beforeEach(async () => {
  // Aislamiento por prefijo f5- en el NUEVO campo userId (definición definitiva).
  // Orden: primero audits (FK cascade), luego scenarios.
  // Hoy FALLA: Prisma no conoce el campo userId → Unknown argument `userId`.
  await prisma.auditEntry.deleteMany({
    where: {
      scenario: { userId: { startsWith: "f5-" } },
    },
  }).catch(async () => {
    // Fallback si la relación no existe aún por falta de migración: borra todo con prefijo f5- intentando por userId
    // Este catch no salva el RED; solo evita que el beforeEach oculte el error real del test
    await prisma.auditEntry.deleteMany();
  });

  await prisma.scenarioRecord.deleteMany({
    where: { userId: { startsWith: "f5-" } } as any,
  });
});

describe("scenario.repo (T1 RED — userId)", () => {
  it("create() acepta userId y persiste fila con ese userId", async () => {
    const created = await repo.create({
      userId: "f5-user-a",
      module: "quadratic",
      inputHash: "f5-hash-user-a-1",
      formulaVersion: "quadratic-v1",
      inputs: { a: 1, b: -3, c: 2 },
    } as any);

    expect(created).toBeDefined();
    expect((created as any).userId).toBe("f5-user-a");
    expect((created as any).scopeId).toBeUndefined(); // después de T1 ya no existe scopeId
    expect(created.module).toBe("quadratic");
    expect(created.status).toBe("DRAFT");

    // Verificación directa en BD: la fila existe con userId
    const raw = await prisma.scenarioRecord.findUnique({
      where: { id: created.id },
    } as any);
    expect(raw).not.toBeNull();
    expect((raw as any).userId).toBe("f5-user-a");
  });

  it("findByUniqueKey(userId, module, inputHash, status) encuentra el registro creado", async () => {
    await repo.create({
      userId: "f5-user-a",
      module: "pricing",
      inputHash: "f5-hash-shared",
      formulaVersion: "pricing-v1",
      inputs: { baseCost: 10 },
    } as any);

    // Firma definitiva T1: (userId, module, inputHash, status?)
    const found = await (repo as any).findByUniqueKey("f5-user-a", "pricing", "f5-hash-shared");
    expect(found).not.toBeNull();
    expect((found as any).userId).toBe("f5-user-a");
    expect(found?.status).toBe("DRAFT");

    // Variante con status explícito
    const foundWithStatus = await (repo as any).findByUniqueKey(
      "f5-user-a",
      "pricing",
      "f5-hash-shared",
      "DRAFT"
    );
    expect(foundWithStatus).not.toBeNull();
    expect(foundWithStatus?.id).toBe(found?.id);

    // Otro userId no debe encontrarlo (aislamiento por usuario)
    const notFoundOtherUser = await (repo as any).findByUniqueKey("f5-user-b", "pricing", "f5-hash-shared");
    expect(notFoundOtherUser).toBeNull();
  });

  it("la unique constraint (userId, module, inputHash, status) rechaza el segundo create idéntico con P2002", async () => {
    await repo.create({
      userId: "f5-user-a",
      module: "quadratic",
      inputHash: "f5-hash-dup",
      formulaVersion: "v",
      inputs: {},
    } as any);

    await expect(
      repo.create({
        userId: "f5-user-a",
        module: "quadratic",
        inputHash: "f5-hash-dup",
        formulaVersion: "v",
        inputs: {},
      } as any)
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("list({ userId }) filtra por userId y no devuelve filas de otro userId", async () => {
    await repo.create({
      userId: "f5-user-a",
      module: "quadratic",
      inputHash: "f5-q1",
      formulaVersion: "v",
      inputs: {},
    } as any);
    await repo.create({
      userId: "f5-user-a",
      module: "pricing",
      inputHash: "f5-p1",
      formulaVersion: "v",
      inputs: {},
    } as any);
    await repo.create({
      userId: "f5-user-b",
      module: "pricing",
      inputHash: "f5-p1-other",
      formulaVersion: "v",
      inputs: {},
    } as any);

    const listA = await (repo as any).list({ userId: "f5-user-a" });
    expect(listA.length).toBeGreaterThanOrEqual(2);
    expect(listA.every((r: any) => r.userId === "f5-user-a")).toBe(true);

    const listB = await (repo as any).list({ userId: "f5-user-b" });
    expect(listB).toHaveLength(1);
    expect((listB[0] as any).userId).toBe("f5-user-b");

    const filteredByModule = await (repo as any).list({ userId: "f5-user-a", module: "pricing" });
    expect(filteredByModule).toHaveLength(1);
    expect(filteredByModule[0].module).toBe("pricing");
  });
});