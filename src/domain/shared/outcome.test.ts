import { describe, it, expect } from "vitest";
import { buildOutcome, OutcomeError } from "@/domain/shared/outcome";
import { sha256Hex } from "@/domain/shared/hash";
import { canonicalJson } from "@/domain/shared/canonicalJson";

describe("domain/shared/outcome — buildOutcome contrato honesto", () => {
  it("rango normal → Outcome con id 64hex, driver/action trim y confidence válida", () => {
    const o = buildOutcome({ range: [24, 30], driver: "comisión por venta", action: "renegociar comisión", confidence: "alta" });
    expect(o.range).toEqual([24, 30]);
    expect(o.driver).toBe("comisión por venta");
    expect(o.action).toBe("renegociar comisión");
    expect(o.confidence).toBe("alta");
    expect(o.id).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rango puntual (min === max) es válido", () => {
    const o = buildOutcome({ range: [100, 100], driver: "costo unitario", action: "bajar costo de adquisición", confidence: "alta" });
    expect(o.range).toEqual([100, 100]);
    expect(o.id).toMatch(/^[a-f0-9]{64}$/);
  });

  it("determinismo: mismo contenido → mismo id (orden de claves irrelevante)", () => {
    const a = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media" });
    const b = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media" });
    expect(a.id).toBe(b.id);
    // verificación explícita contra hash canónico
    const expected = sha256Hex(canonicalJson({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media" }));
    expect(a.id).toBe(expected);
  });

  it("contenido distinto → id distinto", () => {
    const a = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media" });
    const b = buildOutcome({ range: [10, 21], driver: "flete", action: "revisar flete", confidence: "media" });
    expect(a.id).not.toBe(b.id);
  });

  it("trim: driver/action con espacios se normalizan y entran al hash", () => {
    const a = buildOutcome({ range: [1, 2], driver: "  comisión  ", action: " renegociar comisión ", confidence: "alta" });
    expect(a.driver).toBe("comisión");
    expect(a.action).toBe("renegociar comisión");
    const b = buildOutcome({ range: [1, 2], driver: "comisión", action: "renegociar comisión", confidence: "alta" });
    expect(a.id).toBe(b.id);
  });

  it("range invertido → lanza OutcomeError", () => {
    expect(() => buildOutcome({ range: [30, 20], driver: "x", action: "y", confidence: "alta" })).toThrow(OutcomeError);
    try { buildOutcome({ range: [30, 20], driver: "x", action: "y", confidence: "alta" }); } catch (e: any) {
      expect(e.name).toBe("OutcomeError");
      expect(e.message).toMatch(/range/i);
    }
  });

  it("range no finito (NaN/Infinity) → OutcomeError", () => {
    expect(() => buildOutcome({ range: [NaN, 20] as any, driver: "x", action: "y", confidence: "alta" })).toThrow(OutcomeError);
    expect(() => buildOutcome({ range: [0, Infinity] as any, driver: "x", action: "y", confidence: "alta" })).toThrow(OutcomeError);
  });

  it("driver vacío / solo espacios → OutcomeError", () => {
    expect(() => buildOutcome({ range: [0, 1], driver: "   ", action: "hacer algo", confidence: "baja" })).toThrow(OutcomeError);
  });

  it("action vacía → OutcomeError", () => {
    expect(() => buildOutcome({ range: [0, 1], driver: "costo unitario", action: "", confidence: "baja" })).toThrow(OutcomeError);
  });

  it("confidence inválida → OutcomeError (case-sensitive)", () => {
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "Alta" as any })).toThrow(OutcomeError);
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "" as any })).toThrow(OutcomeError);
  });

  it("mensajes en castellano: driver/action no vacíos implican texto humano (smoke)", () => {
    const o = buildOutcome({ range: [5, 15], driver: "IVA sobre venta", action: "subir precio de venta", confidence: "alta" });
    expect(o.driver.length).toBeGreaterThan(3);
    expect(o.action.length).toBeGreaterThan(5);
  });
});