import { describe, it, expect } from "vitest";
import { computeLeadMagnet, type LeadMagnetInputs } from "@/domain/leadmagnet/leadmagnet";
import { toLeadMagnetOutcome } from "@/domain/leadmagnet/outcome";

describe("domain/leadmagnet/outcome — toLeadMagnetOutcome", () => {
  const baseInputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -0.5, demandB: 10, demandC: 100, costPerUnit: 5 };

  it("caso feliz: result válido → Outcome con range de escenarios y optimalPrice contenido", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect(outcome).not.toBeNull();
    expect(outcome!.id).toMatch(/^[a-f0-9]{64}$/);
    expect(outcome!.access).toBe("contact-gated");
    expect(outcome!.range[0]).toBeLessThanOrEqual(outcome!.range[1]);
    expect(outcome!.range[0]).toBeGreaterThanOrEqual(baseInputs.minPrice);
    expect(outcome!.range[1]).toBeLessThanOrEqual(baseInputs.maxPrice);
    expect(outcome!.range[0]).toBeLessThanOrEqual(result.optimalPrice);
    expect(outcome!.range[1]).toBeGreaterThanOrEqual(result.optimalPrice);
    expect(outcome!.range[0]).toBeCloseTo(result.scenarios.conservative.price, 5);
    expect(outcome!.range[1]).toBeCloseTo(result.scenarios.aggressive.price, 5);
  });

  it("confidence nunca alta por demanda estimada: media o baja", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect(["media","baja"]).toContain(outcome.confidence);
    expect(outcome.confidence).not.toBe("alta");
    expect(outcome.access).toBe("contact-gated");
  });

  it("driver en castellano no vacío (demanda o costo)", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect(outcome.driver.trim().length).toBeGreaterThan(3);
    expect(outcome.driver.toLowerCase()).toMatch(/demanda|curvatura|costo/);
    expect(outcome.driver).toBe("curvatura de la demanda");
    expect(outcome.access).toBe("contact-gated");
  });

  it("action concreta contiene fijar precio y optimalPrice", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect(outcome.action.toLowerCase()).toMatch(/fijar|monitorear|validar|lanzamiento/);
    expect(outcome.action).toBe(`fijar precio de lanzamiento en ${Math.round(result.optimalPrice)} y monitorear demanda`);
    expect(outcome.access).toBe("contact-gated");
  });

  it("result null (inputs inválidos) → retorna null honesto", () => {
    const badInputs: LeadMagnetInputs = { minPrice: 50, maxPrice: 50, demandA: -1, demandB: 10, demandC: 100, costPerUnit: 10 };
    const result = computeLeadMagnet(badInputs); // null
    expect(result).toBeNull();
    const outcome = toLeadMagnetOutcome(result, badInputs);
    expect(outcome).toBeNull();
  });

  it("determinismo: mismos (result,inputs) → mismo id", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const a = toLeadMagnetOutcome(result, baseInputs)!;
    const b = toLeadMagnetOutcome(result, baseInputs)!;
    expect(a.id).toBe(b.id);
    expect(a).toEqual(b);
    expect(a.access).toBe("contact-gated");
  });

  it("inputs distintos → id distinto", () => {
    const r1 = computeLeadMagnet(baseInputs)!;
    const o1 = toLeadMagnetOutcome(r1, baseInputs)!;
    const altInputs: LeadMagnetInputs = { minPrice: 20, maxPrice: 80, demandA: -0.3, demandB: 6, demandC: 80, costPerUnit: 8 };
    const r2 = computeLeadMagnet(altInputs)!;
    const o2 = toLeadMagnetOutcome(r2, altInputs)!;
    expect(o1.id).not.toBe(o2.id);
  });

  it("bordes: optimalPrice recortado a minPrice → range sigue dentro de [min,max]", () => {
    // vértice -b/(2a) muy bajo → clamp a minPrice
    const inputs: LeadMagnetInputs = { minPrice: 40, maxPrice: 100, demandA: -0.2, demandB: 5, demandC: 200, costPerUnit: 10 };
    const result = computeLeadMagnet(inputs)!;
    const outcome = toLeadMagnetOutcome(result, inputs)!;
    expect(outcome.range[0]).toBeGreaterThanOrEqual(inputs.minPrice);
    expect(outcome.range[1]).toBeLessThanOrEqual(inputs.maxPrice);
    expect(outcome.access).toBe("contact-gated");
  });

  it("no expone números falsos sueltos: Outcome no tiene optimalPrice como campo suelto", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect((outcome as any).optimalPrice).toBeUndefined();
    expect((outcome as any).maxProfit).toBeUndefined();
    expect(outcome.access).toBe("contact-gated");
  });

  it("frontera gratis/pago: outcome no-null tiene access contact-gated (driver estimado por sistema → paid-eligible, desbloqueo por contacto MVP-2)", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect(outcome.access).toBe("contact-gated");
    expect(["free","contact-gated","paid"]).toContain(outcome.access);
    expect(outcome.driver).toBe("curvatura de la demanda");
  });
});

/**
 * Complemento Fase 4 — casos faltantes de toLeadMagnetOutcome.
 * No duplica los casos ya sellados; solo añade bordes no cubiertos.
 * Debe PASS en RED (ya existe) y seguir PASS en GREEN.
 */
describe("domain/leadmagnet/outcome — complemento Fase 4 (baja confidence, curva, recorte alto)", () => {
  it("confidence baja cuando optimalQuantity === 0 (demanda no viable al precio óptimo)", () => {
    // Forzamos cantidad 0: demanda negativa o cero al precio óptimo → profit 0 → quantity 0
    const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -2, demandB: 0, demandC: 0, costPerUnit: 5 };
    const result = computeLeadMagnet(inputs)!;
    expect(result).not.toBeNull();
    expect(result.optimalQuantity).toBe(0);
    const outcome = toLeadMagnetOutcome(result, inputs)!;
    expect(outcome.confidence).toBe("baja");
    expect(outcome.confidence).not.toBe("alta");
    expect(outcome.access).toBe("contact-gated");
    expect(outcome.driver).toBe("curvatura de la demanda");
  });

  it("access siempre contact-gated incluso con confidence baja", () => {
    const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -2, demandB: 0, demandC: 0, costPerUnit: 5 };
    const result = computeLeadMagnet(inputs)!;
    const outcome = toLeadMagnetOutcome(result, inputs)!;
    expect(outcome.access).toBe("contact-gated");
  });

  it("curva técnica no vacía y con pares finitos {x,y} para inputs válidos", () => {
    const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -2, demandB: 120, demandC: -1000, costPerUnit: 5 };
    const result = computeLeadMagnet(inputs)!;
    expect(result.profitCurve.length).toBeGreaterThan(0);
    for (const pt of result.profitCurve) {
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
    }
    // El outcome no expone la curva, pero el dominio sí la genera para el endpoint
    const outcome = toLeadMagnetOutcome(result, inputs)!;
    expect(outcome.range[0]).toBeLessThanOrEqual(outcome.range[1]);
  });

  it("optimalPrice recortado a maxPrice → range sigue dentro de [min,max] y contiene max", () => {
    // vértice 30 pero con maxPrice 25 → optimalPrice recortado a 25
    const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 25, demandA: -2, demandB: 120, demandC: -1000, costPerUnit: 5 };
    const result = computeLeadMagnet(inputs)!;
    expect(result.optimalPrice).toBe(25);
    const outcome = toLeadMagnetOutcome(result, inputs)!;
    expect(outcome.range[0]).toBeGreaterThanOrEqual(inputs.minPrice);
    expect(outcome.range[1]).toBeLessThanOrEqual(inputs.maxPrice);
    expect(outcome.range[1]).toBe(25);
  });

  it("null-safe con inputs distintos (minPrice>maxPrice) → null sin lanzar", () => {
    const bad: LeadMagnetInputs = { minPrice: 100, maxPrice: 10, demandA: -1, demandB: 10, demandC: 10, costPerUnit: 5 };
    const result = computeLeadMagnet(bad);
    expect(result).toBeNull();
    expect(toLeadMagnetOutcome(result, bad)).toBeNull();
  });
});