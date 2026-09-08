/**
 * metrix · api contract tests (unit)
 * Prueban los Route Handlers directamente (sin servidor HTTP) para validar
 * el contrato: 200 con shape correcto, 400 con Zod en inputs inválidos.
 * CA4.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { POST as quadraticPost } from "@/app/api/v1/quadratic/route";
import { POST as pricingPost } from "@/app/api/v1/pricing/route";
import { POST as roiPost } from "@/app/api/v1/roi/route";
import { POST as actuarialPost } from "@/app/api/v1/actuarial/route";

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
});