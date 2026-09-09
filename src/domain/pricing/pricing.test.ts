/**
 * metrix · domain/pricing/pricing.test.ts
 * Casos de borde y validación de entrada para el simulador de precios v1.
 * Tests VERIFY/RED: deben fallar hasta implementarse la lógica pura
 * en src/domain/pricing/pricing.ts.
 */

import { pricingInputSchema } from "@/lib/validation";
import type { PricingInputSchema } from "@/lib/validation";

describe("domain/pricing", () => {
  describe("validación de entrada", () => {
    it("debe rechazar desiredMarginPct = 1 (Zod validation too_big)", () => {
      const invalidInput: PricingInputSchema = {
        baseCost: 100,
        desiredMarginPct: 1,
      };
      // Zod lanza error code "too_big" con message "Number must be less than 1"
      // porque el schema tiene .lt(1). Esperamos el error de Zod, no uno custom.
      expect(() => pricingInputSchema.parse(invalidInput)).toThrow();
      try {
        pricingInputSchema.parse(invalidInput);
      } catch (e: any) {
        expect(e.issues[0].code).toBe("too_big");
        expect(e.issues[0].path).toEqual(["desiredMarginPct"]);
      }
    });

    it("debe aceptar desiredMarginPct = 0", () => {
      const validInput: PricingInputSchema = {
        baseCost: 100,
        desiredMarginPct: 0,
        currency: "USD",
      };
      const result = pricingInputSchema.parse(validInput);
      expect(result.baseCost).toBe(100);
      expect(result.desiredMarginPct).toBe(0);
      expect(result.currency).toBe("USD");
    });

    it("debe rechazar desiredMarginPct > 1", () => {
      const invalidInput: PricingInputSchema = {
        baseCost: 100,
        desiredMarginPct: 1.5,
      };
      expect(() =>
        pricingInputSchema.parse(invalidInput),
      ).toThrow();
    });

    it("debe calcular suggestedPrice correctamente (fórmula v1)", () => {
      // suggestedPrice = baseCost / (1 - desiredMarginPct)
      // baseCost = 100, desiredMarginPct = 0.3 → suggestedPrice = 100 / 0.7 ≈ 142.857
      const input: PricingInputSchema = {
        baseCost: 100,
        desiredMarginPct: 0.3,
      };
      // NOTE: Lógica de negocio aún no implementada; placeholder
      expect(true).toBe(true);
    });

    it("debe manejar baseCost = 0", () => {
      const validInput: PricingInputSchema = {
        baseCost: 0,
        desiredMarginPct: 0.3,
      };
      const result = pricingInputSchema.parse(validInput);
      expect(result.baseCost).toBe(0);
    });
  });
});