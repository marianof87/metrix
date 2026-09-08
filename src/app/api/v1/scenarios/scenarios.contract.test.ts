/**
 * metrix · api scenarios contract tests (unit)
 * CA4: los endpoints de escenarios responden y validan correctamente.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as listGet, POST as savePost } from "@/app/api/v1/scenarios/route";
import { GET as getById } from "@/app/api/v1/scenarios/[id]/route";
import { POST as reRunPost } from "@/app/api/v1/scenarios/[id]/re-run/route";
import { prisma } from "@/lib/prisma";

const IDS_TO_CLEAN: string[] = [];

async function call(fn: (req: Request, ctx: unknown) => Promise<Response>, body: unknown, ctx = {}) {
  return fn(
    new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx
  );
}

beforeAll(async () => {
  // Limpia escenarios de prueba creados en corridas anteriores.
  const rows = await prisma.scenarioRecord.findMany({
    where: { scopeId: { startsWith: "api-test" } },
    select: { id: true },
  });
  await prisma.auditEntry.deleteMany({
    where: { scenarioId: { in: rows.map((r) => r.id) } },
  });
  await prisma.scenarioRecord.deleteMany({ where: { scopeId: { startsWith: "api-test" } } });
});

afterAll(async () => {
  await prisma.auditEntry.deleteMany({
    where: { scenarioId: { in: IDS_TO_CLEAN } },
  });
  await prisma.scenarioRecord.deleteMany({
    where: { id: { in: IDS_TO_CLEAN } },
  });
});

describe("api/v1/scenarios", () => {
  it("POST guarda un escenario → 201 SAVED", async () => {
    const res = await call(savePost, {
      scopeId: "api-test-1",
      module: "quadratic",
      inputs: { a: 1, b: -3, c: 2 },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.scenario.status).toBe("SAVED");
    IDS_TO_CLEAN.push(data.scenario.id);
  });

  it("POST con module inválido → 400 Zod", async () => {
    const res = await call(savePost, {
      scopeId: "api-test-1",
      module: "nope",
      inputs: {},
    });
    expect(res.status).toBe(400);
  });

  it("GET lista escenarios del scopeId", async () => {
    // Guardar un escenario primero
    const saved = await call(savePost, {
      scopeId: "api-test-list",
      module: "pricing",
      inputs: { baseCost: 50, desiredMarginPct: 0.2 },
    });
    const savedData = await saved.json();
    IDS_TO_CLEAN.push(savedData.scenario.id);

    const req = new Request("http://localhost/api/scenarios?scopeId=api-test-list");
    const res = await listGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scenarios.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /:id devuelve detalle + audits; id inexistente → 404", async () => {
    const saved = await call(savePost, {
      scopeId: "api-test-detail",
      module: "roi",
      inputs: { initialInvestment: 100, finalValue: 120 },
    });
    const savedData = await saved.json();
    IDS_TO_CLEAN.push(savedData.scenario.id);

    const res = await getById(new Request("http://localhost/api"), { params: Promise.resolve({ id: savedData.scenario.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.audits.length).toBeGreaterThanOrEqual(1);

    const notFound = await getById(new Request("http://localhost/api"), { params: Promise.resolve({ id: "no-existe" }) });
    expect(notFound.status).toBe(404);
  });

  it("POST /:id/re-run re-ejecuta desde historial → nuevo RE_RUN", async () => {
    const saved = await call(savePost, {
      scopeId: "api-test-rerun",
      module: "quadratic",
      inputs: { a: 1, b: -3, c: 2 },
    });
    const savedData = await saved.json();
    IDS_TO_CLEAN.push(savedData.scenario.id);

    const res = await reRunPost(new Request("http://localhost/api", { method: "POST" }), {
      params: Promise.resolve({ id: savedData.scenario.id }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.scenario.status).toBe("RE_RUN");
    expect(data.scenario.id).not.toBe(savedData.scenario.id);
    IDS_TO_CLEAN.push(data.scenario.id);
  });

  it("POST con inputs que el dominio rechaza (quadratic a=0) → 400", async () => {
    const res = await call(savePost, {
      scopeId: "api-test-400",
      module: "quadratic",
      inputs: { a: 0, b: 1, c: 1 },
    });
    expect(res.status).toBe(400);
    // El save deja un DRAFT persistido; se limpia para no contaminar la BD.
    const leaked = await prisma.scenarioRecord.findMany({
      where: { scopeId: "api-test-400" },
      select: { id: true },
    });
    await prisma.auditEntry.deleteMany({ where: { scenarioId: { in: leaked.map((r) => r.id) } } });
    await prisma.scenarioRecord.deleteMany({ where: { scopeId: "api-test-400" } });
  });

  it("201 shape: la respuesta contiene scenario.id, module, inputs e inputHash", async () => {
    const res = await call(savePost, {
      scopeId: "api-test-shape",
      module: "roi",
      inputs: { initialInvestment: 100, finalValue: 120 },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.scenario.id).toBeDefined();
    expect(data.scenario.module).toBe("roi");
    expect(data.scenario.status).toBe("SAVED");
    expect(data.scenario.inputs).toEqual({ initialInvestment: 100, finalValue: 120 });
    expect(data.scenario.inputHash).toBeDefined();
    IDS_TO_CLEAN.push(data.scenario.id);
  });

  it("GET lista filtrada por module", async () => {
    const saved = await call(savePost, {
      scopeId: "api-test-mod",
      module: "actuarial",
      inputs: { principal: 100, annualRatePct: 0.05, periodsPerYear: 1, years: 1 },
    });
    const savedData = await saved.json();
    IDS_TO_CLEAN.push(savedData.scenario.id);

    const res = await listGet(
      new Request("http://localhost/api/scenarios?scopeId=api-test-mod&module=actuarial")
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.scenarios.length).toBeGreaterThanOrEqual(1);
    expect(data.scenarios.every((s: { module: string }) => s.module === "actuarial")).toBe(true);

    const other = await listGet(
      new Request("http://localhost/api/scenarios?scopeId=api-test-mod&module=roi")
    );
    const otherData = await other.json();
    expect(otherData.scenarios.length).toBe(0);
  });
});