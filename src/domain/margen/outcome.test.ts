import { describe, it, expect } from "vitest";
import { calcularMargenReal, type MargenInputs, type MargenResult } from "@/domain/margen/margen";
import { toMargenOutcomes } from "@/domain/margen/outcome";

function assertHonest(o: any) {
  expect(o.id).toMatch(/^[a-f0-9]{64}$/);
  expect(Array.isArray(o.range)).toBe(true);
  expect(o.range).toHaveLength(2);
  expect(Number.isFinite(o.range[0]) && Number.isFinite(o.range[1])).toBe(true);
  expect(o.range[0]).toBeLessThanOrEqual(o.range[1]);
  expect(typeof o.driver === "string" && o.driver.trim().length > 0).toBe(true);
  expect(typeof o.action === "string" && o.action.trim().length > 0).toBe(true);
  expect(["baja","media","alta"]).toContain(o.confidence);
}

describe("domain/margen/outcome — toMargenOutcomes", () => {
  it("caso feliz: margen positivo → ≥1 outcome con range conteniendo margenRealUnitario y confidence alta", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 60, comisionPct: 0.1, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 };
    const result: MargenResult = calcularMargenReal(inputs);
    const outcomes = toMargenOutcomes(result, inputs);
    expect(outcomes.length).toBeGreaterThanOrEqual(1);
    const main = outcomes[0];
    assertHonest(main);
    expect(main.confidence).toBe("alta");
    expect(main.range[0]).toBeLessThanOrEqual(result.margenRealUnitario);
    expect(main.range[1]).toBeGreaterThanOrEqual(result.margenRealUnitario);
    // amplitud honesta: no intervalo gigante inventado
    expect(main.range[1] - main.range[0]).toBeLessThan(Math.abs(result.margenRealUnitario) + 5);
  });

  it("driver dominante: comisión pesa más → driver comisión en castellano y action renegociar", () => {
    // comisionAbs 20 domina sobre costo 10
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 10, comisionPct: 0.2, mermaPct: 0.02, ivaPct: 0.02, fleteUnitario: 2 };
    const result = calcularMargenReal(inputs);
    const [main] = toMargenOutcomes(result, inputs);
    expect(main.driver.toLowerCase()).toMatch(/comisi/);
    expect(main.action.toLowerCase()).toMatch(/renegociar|comisi/);
  });

  it("driver dominante: costo unitario pesa más → driver costo y action bajar costo", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 70, comisionPct: 0.01, mermaPct: 0.01, ivaPct: 0.01, fleteUnitario: 1 };
    const result = calcularMargenReal(inputs);
    const [main] = toMargenOutcomes(result, inputs);
    expect(main.driver.toLowerCase()).toMatch(/costo/);
    expect(main.action.toLowerCase()).toMatch(/costo|adquisici/);
  });

  it("margen negativo → driver honesto y action concreta subir precio / bajar costo (no dato)", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 90, comisionPct: 0.2, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 };
    const result = calcularMargenReal(inputs); // margen -10
    expect(result.puedeCubrirCostos).toBe(false);
    const [main] = toMargenOutcomes(result, inputs);
    assertHonest(main);
    expect(main.range[0]).toBeLessThanOrEqual(result.margenRealUnitario);
    // action debe ser verbo concreto, no un número
    expect(main.action.toLowerCase()).toMatch(/subir precio|bajar costo|renegociar|revisar/);
    expect(main.action).not.toMatch(/^\d/);
  });

  it("margen cero o muy chico → range puntual o estrecho válido", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 100, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 };
    const result = calcularMargenReal(inputs); // margen 0
    const [main] = toMargenOutcomes(result, inputs);
    assertHonest(main);
    expect(main.range[0]).toBeLessThanOrEqual(0);
    expect(main.range[1]).toBeGreaterThanOrEqual(0);
  });

  it("bordes: todos los drivers en cero → outcome válido, driver costo, range contiene 40", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 60, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 };
    const result = calcularMargenReal(inputs);
    const outcomes = toMargenOutcomes(result, inputs);
    expect(outcomes[0].driver.toLowerCase()).toMatch(/costo/);
    expect(outcomes[0].range[0]).toBeLessThanOrEqual(40);
  });

  it("flete dominante → driver flete y action revisar flete", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 5, comisionPct: 0.01, mermaPct: 0.01, ivaPct: 0.01, fleteUnitario: 30 };
    const result = calcularMargenReal(inputs);
    const [main] = toMargenOutcomes(result, inputs);
    expect(main.driver.toLowerCase()).toMatch(/flete/);
    expect(main.action.toLowerCase()).toMatch(/flete/);
  });

  it("determinismo: mismos (result,inputs) → mismos ids", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 60, comisionPct: 0.1, mermaPct: 0.05, ivaPct: 0.21, fleteUnitario: 10 };
    const result = calcularMargenReal(inputs);
    const a = toMargenOutcomes(result, inputs);
    const b = toMargenOutcomes(result, inputs);
    expect(a).toEqual(b);
    expect(a[0].id).toBe(b[0].id);
  });

  it("inputs distintos → id distinto", () => {
    const i1: MargenInputs = { precioVenta: 100, costoUnitario: 60, comisionPct: 0.1, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 };
    const r1 = calcularMargenReal(i1);
    const i2: MargenInputs = { precioVenta: 110, costoUnitario: 60, comisionPct: 0.1, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 };
    const r2 = calcularMargenReal(i2);
    expect(toMargenOutcomes(r1, i1)[0].id).not.toBe(toMargenOutcomes(r2, i2)[0].id);
  });

  it("no expone números sueltos: outcome no tiene margenRealUnitario como campo suelto", () => {
    const inputs: MargenInputs = { precioVenta: 100, costoUnitario: 60, comisionPct: 0.1, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 };
    const result = calcularMargenReal(inputs);
    const [main] = toMargenOutcomes(result, inputs);
    expect((main as any).margenRealUnitario).toBeUndefined();
    expect((main as any).precioVenta).toBeUndefined();
  });
});