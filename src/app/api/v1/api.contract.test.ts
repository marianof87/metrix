/**
 * metrix · api contract tests (unit)
 * Prueban los Route Handlers directamente (sin servidor HTTP) para validar
 * el contrato: 200 con shape correcto, 400 con Zod en inputs inválidos.
 * CA4.
 */

import { describe, it, expect, afterAll } from "vitest";
import { POST as quadraticPost } from "@/app/api/v1/quadratic/route";
import { POST as pricingPost } from "@/app/api/v1/pricing/route";
import { POST as roiPost } from "@/app/api/v1/roi/route";
import { POST as actuarialPost } from "@/app/api/v1/actuarial/route";
import { POST as scenariosPost } from "@/app/api/v1/scenarios/route";
import { GET as getScenarioById } from "@/app/api/v1/scenarios/[id]/route";
import { POST as leadMagnetPost } from "@/app/api/v1/lead-magnet/route";
import { POST as leadsPost } from "@/app/api/v1/leads/route";
import { prisma } from "@/lib/prisma";

const SAVED_IDS: string[] = [];
const LEAD_IDS: string[] = [];

afterAll(async () => {
  await prisma.auditEntry.deleteMany({ where: { scenarioId: { in: SAVED_IDS } } });
  await prisma.scenarioRecord.deleteMany({ where: { id: { in: SAVED_IDS } } });
  if (LEAD_IDS.length > 0) {
    await prisma.lead.deleteMany({ where: { id: { in: LEAD_IDS } } });
  }
});

async function call(fn: (req: Request) => Promise<Response>, body: unknown) {
  return fn(new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("api/v1/quadratic", () => {
  it("POST válido → 200 con shape de resultado", async () => {
    const res = await call(quadraticPost, { a: 1, b: -3, c: 2 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("discriminant");
    expect(data).toHaveProperty("roots");
    expect(data).toHaveProperty("vertex");
  });

  it("a=0 → 400 con mensaje claro", async () => {
    const res = await call(quadraticPost, { a: 0, b: 1, c: 1 });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("input inválido (missing c) → 400 Zod", async () => {
    const res = await call(quadraticPost, { a: 1, b: 1 });
    expect(res.status).toBe(400);
  });

  it("a no numérico → 400", async () => {
    const res = await call(quadraticPost, { a: "x", b: 1, c: 1 });
    expect(res.status).toBe(400);
  });

  it("sampleStep = 0 → 400 Zod (debe ser positive)", async () => {
    const res = await call(quadraticPost, { a: 1, b: 1, c: 1, sampleStep: 0 });
    expect(res.status).toBe(400);
  });
});

describe("api/v1/pricing", () => {
  it("POST válido → 200 y sugerencia de precio", async () => {
    const res = await call(pricingPost, { baseCost: 100, desiredMarginPct: 0.3 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestedPrice).toBeCloseTo(142.857, 2);
  });

  it("margin >= 1 → 400", async () => {
    const res = await call(pricingPost, { baseCost: 100, desiredMarginPct: 1 });
    expect(res.status).toBe(400);
  });

  it("baseCost negativo → 400", async () => {
    const res = await call(pricingPost, { baseCost: -1, desiredMarginPct: 0.3 });
    expect(res.status).toBe(400);
  });

  it("discountPct > 1 → 400", async () => {
    const res = await call(pricingPost, { baseCost: 100, desiredMarginPct: 0.3, discountPct: 1.5 });
    expect(res.status).toBe(400);
  });
});

describe("api/v1/roi", () => {
  it("POST válido (simple) → 200 con roiPct", async () => {
    const res = await call(roiPost, { initialInvestment: 1000, finalValue: 1500 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.roiPct).toBe(50);
  });

  it("initialInvestment=0 → 400", async () => {
    const res = await call(roiPost, { initialInvestment: 0, finalValue: 100 });
    expect(res.status).toBe(400);
  });

  it("flujo de caja inválido (period 0) → 400 Zod", async () => {
    const res = await call(roiPost, {
      initialInvestment: 100,
      cashFlows: [{ period: 0, amount: 50 }],
    });
    expect(res.status).toBe(400);
  });

  it("periods = 0 → 400 Zod (debe ser int positive)", async () => {
    const res = await call(roiPost, { initialInvestment: 100, finalValue: 150, periods: 0 });
    expect(res.status).toBe(400);
  });
});

describe("api/v1/actuarial", () => {
  it("POST válido → 200 con compoundAmount", async () => {
    const res = await call(actuarialPost, {
      principal: 1000,
      annualRatePct: 0.05,
      periodsPerYear: 1,
      years: 1,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.compoundAmount).toBe(1050);
  });

  it("periodsPerYear=0 → 400", async () => {
    const res = await call(actuarialPost, {
      principal: 1000,
      annualRatePct: 0.05,
      periodsPerYear: 0,
      years: 1,
    });
    expect(res.status).toBe(400);
  });

  it("tasa >= 1 → 400", async () => {
    const res = await call(actuarialPost, {
      principal: 1000,
      annualRatePct: 1,
      periodsPerYear: 1,
      years: 1,
    });
    expect(res.status).toBe(400);
  });

  it("years negativo → 400", async () => {
    const res = await call(actuarialPost, {
      principal: 1000,
      annualRatePct: 0.05,
      periodsPerYear: 1,
      years: -1,
    });
    expect(res.status).toBe(400);
  });

  it("mortalityProbability > 1 → 400", async () => {
    const res = await call(actuarialPost, {
      principal: 0,
      annualRatePct: 0,
      periodsPerYear: 1,
      years: 1,
      mortality: { age: 40, premium: 90, coverage: 10000, mortalityProbability: 1.5 },
    });
    expect(res.status).toBe(400);
  });
});

describe("api/v1/scenarios", () => {
  it("GET /scenarios/:id inexistente → 404", async () => {
    const res = await getScenarioById(new Request("http://localhost/api"), {
      params: Promise.resolve({ id: "no-existe-contract" }),
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("POST válido → 201 con scenario.id, status SAVED y shape consistente", async () => {
    const res = await call(scenariosPost, {
      scopeId: "api-contract-201",
      module: "quadratic",
      inputs: { a: 1, b: -3, c: 2 },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.scenario.id).toBeDefined();
    expect(data.scenario.status).toBe("SAVED");
    expect(data.scenario.module).toBe("quadratic");
    expect(data.scenario.inputs).toEqual({ a: 1, b: -3, c: 2 });
    expect(data.scenario.inputHash).toMatch(/^[a-f0-9]{64}$/);
    SAVED_IDS.push(data.scenario.id);
  });

  it("POST con module inválido → 400 Zod", async () => {
    const res = await call(scenariosPost, {
      scopeId: "api-contract-badmod",
      module: "nope",
      inputs: {},
    });
    expect(res.status).toBe(400);
  });
});

describe("api/v1/lead-magnet", () => {
  it("POST válido → 200 con precio, ganancia, formulaVersion y curva", async () => {
    const res = await call(leadMagnetPost, {
      coeficienteA: -2,
      coeficienteB: 120,
      coeficienteC: -1000,
      precioMinimo: 10,
      precioMaximo: 100,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.precioOptimo).toBeCloseTo(30, 2);
    expect(data.gananciaMaxima).toBeCloseTo(800, 2);
    expect(data.formulaVersion).toBe("lead-magnet-v1");
    expect(data.estrategiaSugerida).toBe("Mantener el precio en el punto de equilibrio óptimo.");
    expect(data.curva.labels).toHaveLength(25);
  });

  it("A=2 → 400", async () => {
    const res = await call(leadMagnetPost, {
      coeficienteA: 2,
      coeficienteB: 120,
      coeficienteC: -1000,
      precioMinimo: 10,
      precioMaximo: 100,
    });
    expect(res.status).toBe(400);
  });

  it("max <= min → 400", async () => {
    const res = await call(leadMagnetPost, {
      coeficienteA: -2,
      coeficienteB: 120,
      coeficienteC: -1000,
      precioMinimo: 100,
      precioMaximo: 50,
    });
    expect(res.status).toBe(400);
  });

  it("missing campo → 400", async () => {
    const res = await call(leadMagnetPost, {
      coeficienteA: -2,
      coeficienteB: 120,
      precioMinimo: 10,
      precioMaximo: 100,
    });
    expect(res.status).toBe(400);
  });
});

describe("api/v1/leads", () => {
  it("POST válido → 201 con id y createdAt", async () => {
    const res = await call(leadsPost, {
      nombre: "Ana Pérez",
      empresa: "Textil Sur",
      whatsapp: "+54 9 351 555-1234",
      email: "ana@contrato.com",
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.createdAt).toBeDefined();
    LEAD_IDS.push(data.id);
  });

  it("email inválido → 400", async () => {
    const res = await call(leadsPost, {
      nombre: "Ana",
      empresa: "Textil",
      whatsapp: "+54 9 351 555",
      email: "no-valido",
    });
    expect(res.status).toBe(400);
  });

  it("nombre vacío → 400", async () => {
    const res = await call(leadsPost, {
      nombre: "   ",
      empresa: "Textil",
      whatsapp: "+54 9 351 555",
      email: "ana@empresa.com",
    });
    expect(res.status).toBe(400);
  });
});