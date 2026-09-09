/**
 * metrix · domain/leadmagnet/leadmagnet.test.ts
 * Tests VERIFY/RED para el dominio leadmagnet.
 * Estos tests deben fallar (Fase 2 VERIFY/RED) hasta implementarse
 * casos específicos o ajustes finos en leadmagnet.ts.
 * 
 * Cobertura objetivo: ≥95% líneas.
 */

import { computeLeadMagnet, validateLeadMagnetInputs, type LeadMagnetInputs, type LeadMagnetResult } from "@/domain/leadmagnet/leadmagnet";

describe("domain/leadmagnet", () => {
  // ---------- Validación de entrada ----------

  describe("validación de inputs", () => {
    it("debe rechazar minPrice >= maxPrice", () => {
      const inputs: LeadMagnetInputs = { minPrice: 50, maxPrice: 50, demandA: -1, demandB: 10, demandC: 100, costPerUnit: 10 };
      const err = validateLeadMagnetInputs(inputs);
      expect(err).toBe("El precio máximo debe ser mayor que el mínimo");
    });

    it("debe rechazar demandA >= 0", () => {
      const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: 0, demandB: 5, demandC: 50, costPerUnit: 5 };
      const err = validateLeadMagnetInputs(inputs);
      expect(err).toBe("El coeficiente demandA debe ser negativo (curva concave)");
    });

    it("debe rechazar costPerUnit < 0", () => {
      const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -1, demandB: 5, demandC: 50, costPerUnit: -1 };
      const err = validateLeadMagnetInputs(inputs);
      expect(err).toBe("El costo unitario no puede ser negativo");
    });

    it("debe aceptar inputs válidos", () => {
      const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -0.5, demandB: 10, demandC: 100, costPerUnit: 5 };
      const err = validateLeadMagnetInputs(inputs);
      expect(err).toBeNull();
    });
  });

  // ---------- Cálculo completo ----------

  describe("computeLeadMagnet", () => {
    it("debe retornar null cuando los inputs son inválidos", () => {
      const badInputs: LeadMagnetInputs = { minPrice: 50, maxPrice: 50, demandA: -1, demandB: 10, demandC: 100, costPerUnit: 10 };
      const result = computeLeadMagnet(badInputs);
      expect(result).toBeNull();
    });

    it("debe calcular precio óptimo, cantidad y ganancia para un caso básico", () => {
      const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -0.5, demandB: 10, demandC: 100, costPerUnit: 5 };
      const result = computeLeadMagnet(inputs);
      expect(result).not.toBeNull();
      if (result === null) return; // type guard

      // El precio óptimo debe estar dentro del rango
      expect(result.optimalPrice).toBeGreaterThanOrEqual(inputs.minPrice);
      expect(result.optimalPrice).toBeLessThanOrEqual(inputs.maxPrice);

      // La ganancia debe ser un número finito
      expect(Number.isFinite(result.maxProfit)).toBe(true);
      expect(result.optimalQuantity).toBe >= 0;

      // Los escenarios deben tener 3 entradas
      expect(Object.keys(result.scenarios).length).toBe(3);
      expect("conservative" in result.scenarios).toBe(true);
      expect("moderate" in result.scenarios).toBe(true);
      expect("aggressive" in result.scenarios).toBe(true);
    });

    it("debe respetar los límites de precio en los escenarios", () => {
      const inputs: LeadMagnetInputs = { minPrice: 20, maxPrice: 80, demandA: -0.3, demandB: 6, demandC: 80, costPerUnit: 8 };
      const result = computeLeadMagnet(inputs);
      expect(result).not.toBeNull();
      if (result === null) return;

      const { conservative, moderate, aggressive } = result.scenarios;
      // Todos los precios deben estar en [minPrice, maxPrice]
      [conservative, moderate, aggressive].forEach((s) => {
        expect(s.price).toBeGreaterThanOrEqual(inputs.minPrice);
        expect(s.price).toBeLessThanOrEqual(inputs.maxPrice);
      });
    });

    it("debe generar curva de ganancia con puntos dentro del rango", () => {
      const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -0.2, demandB: 5, demandC: 200, costPerUnit: 10 };
      const result = computeLeadMagnet(inputs);
      expect(result).not.toBeNull();
      if (result === null) return;

      const { profitCurve } = result;
      // Todos los puntos deben estar dentro del rango y ser finitos
      profitCurve.forEach((pt) => {
        expect(pt.x).toBeGreaterThanOrEqual(inputs.minPrice);
        expect(pt.x).toBeLessThanOrEqual(inputs.maxPrice);
        expect(Number.isFinite(pt.y)).toBe(true);
      });
      // La curva debe tener al menos algunos puntos
      expect(profitCurve.length).toBeGreaterThan(0);
    });

    it("debe manejar demandA muy cercano a 0 (cercano a línea recta)", () => {
      const inputs: LeadMagnetInputs = { minPrice: 5, maxPrice: 50, demandA: -0.001, demandB: 2, demandC: 50, costPerUnit: 2 };
      const result = computeLeadMagnet(inputs);
      // Debe fallar validación o retornar resultado (demandA < 0 cumplo, aunque sea chiquito)
      expect(result).not.toBeNull();
    });

    it("debe manejar costPerUnit = 0", () => {
      const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -1, demandB: 10, demandC: 100, costPerUnit: 0 };
      const result = computeLeadMagnet(inputs);
      expect(result).not.toBeNull();
      if (result === null) return;
      expect(result.costPerUnit).toBe(0);
      expect(Number.isFinite(result.optimalPrice)).toBe(true);
    });

    it("debe producir resultados consistentes en inputs idénticos (determinismo)", () => {
      const inputs: LeadMagnetInputs = { minPrice: 10, maxPrice: 100, demandA: -0.7, demandB: 3, demandC: 150, costPerUnit: 12 };
      const result1 = computeLeadMagnet(inputs);
      const result2 = computeLeadMagnet(inputs);
      expect(result1).toEqual(result2);
    });
  });
});