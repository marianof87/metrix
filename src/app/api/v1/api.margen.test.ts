/**
 * metrix · api contract tests — margen
 * Contrato POST /api/v1/margen — 200 shape + 400 Zod
 * Debe FALLAR en RED porque src/app/api/v1/margen/route.ts no existe
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

describe("api/v1/margen", () => {
  it("POST válido → 200 con shape completo y margenRealUnitario esperado", async () => {
    // caso conocido: precio 100, costo 60, comisión 10% → margen 30
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
    expect(data.formulaVersion).toBe("margen-v1");
    expect(data.precioVenta).toBe(100);
    expect(data.comisionAbs).toBeCloseTo(10, 2);
    expect(data.ingresoNetoUnitario).toBeCloseTo(90, 2);
    expect(data.margenRealUnitario).toBeCloseTo(30, 2);
    expect(data.margenPct).toBeCloseTo(0.3, 2);
    expect(data.puedeCubrirCostos).toBe(true);
    expect(data.pisoPrecioSku).toBeDefined();
    expect(Number.isFinite(data.margenRealUnitario)).toBe(true);
    expect(Number.isFinite(data.margenPct)).toBe(true);
  });

  it("POST con costos fijos → 200 con puntoEquilibrioUnidades", async () => {
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
    expect(data.margenRealUnitario).toBeCloseTo(40, 2);
    expect(data.puntoEquilibrioUnidades).toBeCloseTo(20, 2);
  });

  it("tasa suma ≥ 1 → 400 Zod con Invalid input", async () => {
    // comision 0.5 + merma 0.3 + iva 0.2 =1.0 → refine <1 debe fallar
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

  it("campo faltante (precioVenta) → 400", async () => {
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

  it("campo negativo (costoUnitario -5) → 400", async () => {
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
});