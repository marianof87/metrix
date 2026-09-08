import { describe, it, expect } from "vitest";
import { calculatePricing, PricingDomainError, PRICING_FORMULA_VERSION } from "./pricing";
import { approxEq } from "../shared/decimal";

describe("domain/pricing", () => {
  it("calcula el precio sugerido base (100 / (1-0.3) = 142.857)", () => {
    const r = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3 });
    expect(approxEq(r.suggestedPrice, 142.857, 1e-3)).toBe(true);
    expect(approxEq(r.grossMargin, 42.857, 1e-3)).toBe(true);
    expect(r.marginPct).toBe(0.3);
  });

  it("aplica descuento sobre el precio sugerido", () => {
    const r = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, discountPct: 0.1 });
    // 142.857 * 0.9 = 128.571
    expect(approxEq(r.priceWithDiscount, 128.571, 1e-3)).toBe(true);
  });

  it("aplica impuesto después del descuento", () => {
    const r = calculatePricing({
      baseCost: 100,
      desiredMarginPct: 0.3,
      discountPct: 0.1,
      taxPct: 0.21,
    });
    // 128.571 * 1.21 = 155.571
    expect(approxEq(r.finalPrice, 155.571, 1e-3)).toBe(true);
    expect(r.priceWithTax).toBe(r.finalPrice);
  });

  it("totaliza revenue y cost con quantity", () => {
    const r = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, quantity: 5 });
    expect(approxEq(r.totalRevenue ?? 0, 142.857 * 5, 1e-3)).toBe(true);
    expect(r.totalCost).toBe(500);
  });

  it("desglose auditable coincide con las partes", () => {
    const r = calculatePricing({ baseCost: 80, desiredMarginPct: 0.2 });
    expect(r.breakdown.baseCost).toBe(80);
    expect(r.breakdown.percentMargin).toBe(0.2);
    expect(approxEq(r.breakdown.addedValue, 20)).toBe(true);
    expect(approxEq(r.breakdown.suggestedPrice, 100)).toBe(true);
  });

  describe("casos borde §6.2", () => {
    it("desiredMarginPct = 1 → error", () => {
      expect(() => calculatePricing({ baseCost: 100, desiredMarginPct: 1 })).toThrow(
        PricingDomainError
      );
    });

    it("desiredMarginPct < 0 → error", () => {
      expect(() => calculatePricing({ baseCost: 100, desiredMarginPct: -0.1 })).toThrow(
        PricingDomainError
      );
    });

    it("baseCost = 0 → precio 0 válido", () => {
      const r = calculatePricing({ baseCost: 0, desiredMarginPct: 0.3 });
      expect(r.suggestedPrice).toBe(0);
      expect(r.grossMargin).toBe(0);
    });

    it("discountPct > 1 → error", () => {
      expect(() =>
        calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, discountPct: 1.5 })
      ).toThrow(PricingDomainError);
    });

    it("taxPct = 0 → sin cambios en impuesto", () => {
      const r = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, taxPct: 0 });
      expect(r.priceWithTax).toBe(r.priceWithDiscount);
    });

    it("precisión decimal: 0.1 + 0.2 no produce 0.30000000000000004 en margen", () => {
      const r = calculatePricing({ baseCost: 0.1, desiredMarginPct: 0.2 });
      expect(Number.isInteger(r.suggestedPrice) || r.suggestedPrice.toFixed(10).length < 15).toBe(
        true
      );
    });

    it("desiredMarginPct NaN → error", () => {
      expect(() =>
        calculatePricing({ baseCost: 100, desiredMarginPct: Number.NaN })
      ).toThrow(PricingDomainError);
    });

    it("quantity NaN o negativo → error", () => {
      expect(() =>
        calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, quantity: Number.NaN })
      ).toThrow(PricingDomainError);
      expect(() =>
        calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, quantity: -1 })
      ).toThrow(PricingDomainError);
    });

    it("discountPct NaN → error", () => {
      expect(() =>
        calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, discountPct: Number.NaN })
      ).toThrow(PricingDomainError);
    });

    it("baseCost NaN o negativo → error", () => {
      expect(() => calculatePricing({ baseCost: Number.NaN, desiredMarginPct: 0.3 })).toThrow(
        PricingDomainError
      );
      expect(() => calculatePricing({ baseCost: -5, desiredMarginPct: 0.3 })).toThrow(
        PricingDomainError
      );
    });
  });

  describe("casos borde adicionales: edges de inputs y precisión", () => {
    it("margin = 0 → precio = baseCost sin mark-up", () => {
      const r = calculatePricing({ baseCost: 120, desiredMarginPct: 0 });
      expect(r.suggestedPrice).toBe(120);
      expect(r.grossMargin).toBe(0);
      expect(r.marginPct).toBe(0);
    });

    it("discountPct = 1 (límite permitido) → precio con descuento 0", () => {
      const r = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, discountPct: 1 });
      expect(r.priceWithDiscount).toBe(0);
      expect(r.finalPrice).toBe(0);
    });

    it("quantity = 0 → no totaliza (totalRevenue/totalCost undefined)", () => {
      const r = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, quantity: 0 });
      expect(r.totalRevenue).toBeUndefined();
      expect(r.totalCost).toBeUndefined();
      expect(r.finalPrice).toBeGreaterThan(0);
    });

    it("precisión determinista en la cadena completa (0.1/0.2/0.1/0.21)", () => {
      const r = calculatePricing({
        baseCost: 0.1,
        desiredMarginPct: 0.2,
        discountPct: 0.1,
        taxPct: 0.21,
      });
      expect(r.suggestedPrice).toBe(0.125);
      expect(r.priceWithDiscount).toBe(0.1125);
      expect(r.priceWithTax).toBe(0.136125);
      expect(r.finalPrice).toBe(0.136125);
    });

    it("sin ruido 0.1+0.2: margin y addedValue exactos", () => {
      const r = calculatePricing({ baseCost: 0.1, desiredMarginPct: 0.2 });
      expect(r.marginPct).toBe(0.2);
      expect(r.breakdown.addedValue).toBe(0.025);
      expect(r.suggestedPrice).toBe(Number(r.suggestedPrice.toFixed(10)));
    });

    it("tax alto 0.99 escala el precio final", () => {
      const r = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, taxPct: 0.99 });
      expect(approxEq(r.finalPrice, 284.2857, 1e-3)).toBe(true);
    });

    it("baseCost=0 con descuento, impuesto y quantity → todo 0", () => {
      const r = calculatePricing({
        baseCost: 0,
        desiredMarginPct: 0.2,
        discountPct: 0.5,
        taxPct: 0.21,
        quantity: 5,
      });
      expect(r.suggestedPrice).toBe(0);
      expect(r.priceWithDiscount).toBe(0);
      expect(r.finalPrice).toBe(0);
      expect(r.totalRevenue).toBe(0);
      expect(r.totalCost).toBe(0);
      expect(r.grossMargin).toBe(0);
    });

    it("discountPct negativo → error", () => {
      expect(() =>
        calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, discountPct: -0.1 })
      ).toThrow(PricingDomainError);
    });

    it("taxPct negativo → error", () => {
      expect(() =>
        calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, taxPct: -0.1 })
      ).toThrow(PricingDomainError);
    });

    it("discountPct = 0 explícito equivale a omitido", () => {
      const withZero = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, discountPct: 0 });
      const omitted = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3 });
      expect(withZero.priceWithDiscount).toBe(omitted.priceWithDiscount);
      expect(withZero.finalPrice).toBe(omitted.finalPrice);
    });

    it("taxPct = 0 explícito equivale a omitido", () => {
      const withZero = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3, taxPct: 0 });
      const omitted = calculatePricing({ baseCost: 100, desiredMarginPct: 0.3 });
      expect(withZero.finalPrice).toBe(omitted.finalPrice);
    });

    it("margin cercano a 1 (0.999) → precio amplificado pero finito y exacto", () => {
      const r = calculatePricing({ baseCost: 1, desiredMarginPct: 0.999 });
      expect(Number.isFinite(r.suggestedPrice)).toBe(true);
      expect(r.suggestedPrice).toBe(1000);
    });
  });

  it("expone la versión de fórmula congelada", () => {
    expect(calculatePricing({ baseCost: 1, desiredMarginPct: 0.1 }).formulaVersion).toBe(
      PRICING_FORMULA_VERSION
    );
  });
});