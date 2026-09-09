/**
 * metrix · api contract tests — margen (OBJ-2: formato honesto Outcome · OBJ-1: access)
 * Contrato POST /api/v1/margen — 200 con { outcomes: Outcome[] }, 400 Zod.
 * Reemplaza el shape plano (violaba OBJ-2: números falsos con decimales sueltos).
 * Cada Outcome lleva access (frontera gratis/pago): margen → "free" (100% inputs usuario).
 */
import { describe, it, expect } from "vitest";
import { POST as margenPost } from "@/app/api/v1/margen/route";

async function call(fn: (req: Request) => Promise<Response>, body: unknown) {
  return fn(
    new Request("http://localhost/api/v1/margen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function assertOutcome(o: any) {
  expect(o.id).toMatch(/^[a-f0-9]{64}$/);
  expect(Array.isArray(o.range)).toBe(true);
  expect(o.range).toHaveLength(2);
  expect(Number.isFinite(o.range[0]) && Number.isFinite(o.range[1])).toBe(true);
  expect(o.range[0]).toBeLessThanOrEqual(o.range[1]);
  expect(typeof o.driver === "string" && o.driver.trim().length > 0).toBe(true);
  expect(typeof o.action === "string" && o.action.trim().length > 0).toBe(true);
  expect(["baja", "media", "alta"]).toContain(o.confidence);
  expect(typeof o.access === "string").toBe(true);
  expect(["free","contact-gated","paid"]).toContain(o.access);
}

describe("api/v1/margen — contrato honesto Outcome (OBJ-2)", () => {
  it("POST válido → 200 con { outcomes: Outcome[] } honesto, sin números falsos sueltos", async () => {
    const res = await call(margenPost, {
      precioVenta: 100,
      costoUnitario: 60,
      comisionPct: 0.1,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.outcomes)).toBe(true);
    expect(data.outcomes.length).toBeGreaterThanOrEqual(1);
    for (const o of data.outcomes) {
      assertOutcome(o);
      expect(o.access).toBe("free"); // margen es 100% free
    }
    // metadata técnica permitida pero no números de producto sueltos
    if (data.formulaVersion !== undefined) expect(data.formulaVersion).toBe("margen-v1");
    expect(data.margenRealUnitario).toBeUndefined();
    expect(data.margenPct).toBeUndefined();
    expect(data.pisoPrecioSku).toBeUndefined();
    expect(data.ingresoNetoUnitario).toBeUndefined();
    expect(data.comisionAbs).toBeUndefined();
  });

  it("POST con costos fijos → 200 con outcomes; el principal sigue siendo válido", async () => {
    const res = await call(margenPost, {
      precioVenta: 100,
      costoUnitario: 60,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
      costosFijosMensuales: 800,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.outcomes.length).toBeGreaterThanOrEqual(1);
    assertOutcome(data.outcomes[0]);
    expect(data.outcomes[0].access).toBe("free");
    expect(data.outcomes[0].range[0]).toBeLessThanOrEqual(data.outcomes[0].range[1]);
  });

  it("tasa suma ≥ 1 → 400 Zod con Invalid input (se conserva)", async () => {
    const res = await call(margenPost, {
      precioVenta: 100,
      costoUnitario: 60,
      comisionPct: 0.5,
      mermaPct: 0.3,
      ivaPct: 0.2,
      fleteUnitario: 0,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error).toMatch(/Invalid input/i);
  });

  it("campo faltante (precioVenta) → 400 (se conserva)", async () => {
    const res = await call(margenPost, {
      costoUnitario: 60,
      comisionPct: 0.1,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    } as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("campo negativo (costoUnitario -5) → 400 (se conserva)", async () => {
    const res = await call(margenPost, {
      precioVenta: 100,
      costoUnitario: -5,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(res.status).toBe(400);
  });

  it("confirma honestidad: driver/action en castellano (no inglés técnico)", async () => {
    const res = await call(margenPost, {
      precioVenta: 100,
      costoUnitario: 50,
      comisionPct: 0.2,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(res.status).toBe(200);
    const { outcomes } = await res.json();
    expect(outcomes[0].driver).not.toMatch(/driver|action/i);
    expect(outcomes[0].driver.length).toBeGreaterThan(3);
    expect(outcomes[0].action.length).toBeGreaterThan(5);
    expect(outcomes[0].access).toBe("free");
    expect(typeof outcomes[0].access).toBe("string");
  });
});