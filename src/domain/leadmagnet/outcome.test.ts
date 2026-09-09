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
  });

  it("driver en castellano no vacío (demanda o costo)", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect(outcome.driver.trim().length).toBeGreaterThan(3);
    expect(outcome.driver.toLowerCase()).toMatch(/demanda|curvatura|costo/);
  });

  it("action concreta contiene fijar precio y optimalPrice", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect(outcome.action.toLowerCase()).toMatch(/fijar|monitorear|validar|lanzamiento/);
    expect(outcome.action).toMatch(String(Math.round(result.optimalPrice)));
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
  });

  it("no expone números falsos sueltos: Outcome no tiene optimalPrice como campo suelto", () => {
    const result = computeLeadMagnet(baseInputs)!;
    const outcome = toLeadMagnetOutcome(result, baseInputs)!;
    expect((outcome as any).optimalPrice).toBeUndefined();
    expect((outcome as any).maxProfit).toBeUndefined();
  });
});