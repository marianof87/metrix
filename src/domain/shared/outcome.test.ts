import { describe, it, expect } from "vitest";
import { buildOutcome, OutcomeError, accessFromSources } from "@/domain/shared/outcome";
import { sha256Hex } from "@/domain/shared/hash";
import { canonicalJson } from "@/domain/shared/canonicalJson";

describe("domain/shared/outcome — buildOutcome contrato honesto", () => {
  it("rango normal → Outcome con id 64hex, driver/action trim y confidence válida", () => {
    const o = buildOutcome({ range: [24, 30], driver: "comisión por venta", action: "renegociar comisión", confidence: "alta", access: "free" });
    expect(o.range).toEqual([24, 30]);
    expect(o.driver).toBe("comisión por venta");
    expect(o.action).toBe("renegociar comisión");
    expect(o.confidence).toBe("alta");
    expect(o.access).toBe("free");
    expect(o.id).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rango puntual (min === max) es válido", () => {
    const o = buildOutcome({ range: [100, 100], driver: "costo unitario", action: "bajar costo de adquisición", confidence: "alta", access: "free" });
    expect(o.range).toEqual([100, 100]);
    expect(o.access).toBe("free");
    expect(o.id).toMatch(/^[a-f0-9]{64}$/);
  });

  it("determinismo: mismo contenido → mismo id (orden de claves irrelevante)", () => {
    const a = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "free" });
    const b = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "free" });
    expect(a.id).toBe(b.id);
    // verificación explícita contra hash canónico (access entra al hash)
    const expected = sha256Hex(canonicalJson({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "free" }));
    expect(a.id).toBe(expected);
  });

  it("contenido distinto → id distinto", () => {
    const a = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "free" });
    const b = buildOutcome({ range: [10, 21], driver: "flete", action: "revisar flete", confidence: "media", access: "free" });
    expect(a.id).not.toBe(b.id);
  });

  it("trim: driver/action con espacios se normalizan y entran al hash", () => {
    const a = buildOutcome({ range: [1, 2], driver: "  comisión  ", action: " renegociar comisión ", confidence: "alta", access: "paid" });
    expect(a.driver).toBe("comisión");
    expect(a.action).toBe("renegociar comisión");
    expect(a.access).toBe("paid");
    const b = buildOutcome({ range: [1, 2], driver: "comisión", action: "renegociar comisión", confidence: "alta", access: "paid" });
    expect(a.id).toBe(b.id);
  });

  it("range invertido → lanza OutcomeError", () => {
    expect(() => buildOutcome({ range: [30, 20], driver: "x", action: "y", confidence: "alta", access: "free" })).toThrow(OutcomeError);
    try { buildOutcome({ range: [30, 20], driver: "x", action: "y", confidence: "alta", access: "free" }); } catch (e: any) {
      expect(e.name).toBe("OutcomeError");
      expect(e.message).toMatch(/range/i);
    }
  });

  it("range no finito (NaN/Infinity) → OutcomeError", () => {
    expect(() => buildOutcome({ range: [NaN, 20] as any, driver: "x", action: "y", confidence: "alta", access: "free" })).toThrow(OutcomeError);
    expect(() => buildOutcome({ range: [0, Infinity] as any, driver: "x", action: "y", confidence: "alta", access: "free" })).toThrow(OutcomeError);
  });

  it("driver vacío / solo espacios → OutcomeError", () => {
    expect(() => buildOutcome({ range: [0, 1], driver: "   ", action: "hacer algo", confidence: "baja", access: "free" })).toThrow(OutcomeError);
  });

  it("action vacía → OutcomeError", () => {
    expect(() => buildOutcome({ range: [0, 1], driver: "costo unitario", action: "", confidence: "baja", access: "free" })).toThrow(OutcomeError);
  });

  it("confidence inválida → OutcomeError (case-sensitive)", () => {
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "Alta" as any, access: "free" })).toThrow(OutcomeError);
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "" as any, access: "free" })).toThrow(OutcomeError);
  });

  it("mensajes en castellano: driver/action no vacíos implican texto humano (smoke)", () => {
    const o = buildOutcome({ range: [5, 15], driver: "IVA sobre venta", action: "subir precio de venta", confidence: "alta", access: "contact-gated" });
    expect(o.driver.length).toBeGreaterThan(3);
    expect(o.action.length).toBeGreaterThan(5);
    expect(o.access).toBe("contact-gated");
  });
});

describe("domain/shared/outcome — access (OBJ-1 frontera gratis/pago)", () => {
  it("access válido se persiste en el objeto (free/contact-gated/paid)", () => {
    const free = buildOutcome({ range: [1, 2], driver: "merma", action: "reducir merma", confidence: "alta", access: "free" });
    expect(free.access).toBe("free");
    const gated = buildOutcome({ range: [1, 2], driver: "curvatura de la demanda", action: "fijar precio de lanzamiento en 50 y monitorear demanda", confidence: "media", access: "contact-gated" });
    expect(gated.access).toBe("contact-gated");
    const paid = buildOutcome({ range: [1, 2], driver: "curvatura de la demanda", action: "fijar precio de lanzamiento en 50 y monitorear demanda", confidence: "media", access: "paid" });
    expect(paid.access).toBe("paid");
  });

  it("access inválido (string 'pro' o número 42) → lanza OutcomeError con name OutcomeError", () => {
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "alta", access: "pro" as any })).toThrow(OutcomeError);
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "alta", access: 42 as any })).toThrow(OutcomeError);
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "alta", access: "" as any })).toThrow(OutcomeError);
    expect(() => buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "alta", access: undefined as any })).toThrow(OutcomeError);
    try { buildOutcome({ range: [0, 1], driver: "x", action: "y", confidence: "alta", access: "pro" as any }); } catch (e: any) {
      expect(e.name).toBe("OutcomeError");
      expect(e.message).toMatch(/access/i);
    }
  });

  it("mismo contenido con access distinto → id distinto (hash incluye access)", () => {
    const a = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "free" });
    const b = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "paid" });
    expect(a.id).not.toBe(b.id);
    const c = buildOutcome({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "contact-gated" });
    expect(a.id).not.toBe(c.id);
    expect(b.id).not.toBe(c.id);
    // hash canónico debe incluir access
    const expectedFree = sha256Hex(canonicalJson({ range: [10, 20], driver: "flete", action: "revisar flete", confidence: "media", access: "free" }));
    expect(a.id).toBe(expectedFree);
  });

  describe("accessFromSources — frontera gratis/pago (helper puro)", () => {
    it("systemEstimatedDriver=false, gatedByContact=false → free", () => {
      expect(accessFromSources({ systemEstimatedDriver: false, gatedByContact: false })).toBe("free");
    });
    it("systemEstimatedDriver=true, gatedByContact=true → contact-gated", () => {
      expect(accessFromSources({ systemEstimatedDriver: true, gatedByContact: true })).toBe("contact-gated");
    });
    it("systemEstimatedDriver=true, gatedByContact=false → paid", () => {
      expect(accessFromSources({ systemEstimatedDriver: true, gatedByContact: false })).toBe("paid");
    });
    it("systemEstimatedDriver=false, gatedByContact=true → incoherente → lanza OutcomeError", () => {
      expect(() => accessFromSources({ systemEstimatedDriver: false, gatedByContact: true })).toThrow(OutcomeError);
      try { accessFromSources({ systemEstimatedDriver: false, gatedByContact: true }); } catch (e: any) {
        expect(e.name).toBe("OutcomeError");
        expect(e.message).toMatch(/gated|incoherente|contact/i);
      }
    });
  });
});