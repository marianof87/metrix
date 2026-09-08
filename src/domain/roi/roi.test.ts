import { describe, it, expect } from "vitest";
import { calculateRoi, RoiDomainError, ROI_FORMULA_VERSION } from "./roi";
import { calculateIrr, npv, IRRNonConvergenceError } from "./irr";
import { approxEq } from "../shared/decimal";

describe("domain/roi", () => {
  describe("variante simple", () => {
    it("ROI simple positivo (I0=1000, VF=1500 → 50%)", () => {
      const r = calculateRoi({ initialInvestment: 1000, finalValue: 1500 });
      expect(r.roiPct).toBe(50);
      expect(r.netGain).toBe(500);
    });

    it("ROI negativo (I0=1000, VF=800 → -20%)", () => {
      const r = calculateRoi({ initialInvestment: 1000, finalValue: 800 });
      expect(r.roiPct).toBe(-20);
    });

    it("ROI anualizado (I0=100, VF=121, 2 periodos → 10% anual)", () => {
      const r = calculateRoi({ initialInvestment: 100, finalValue: 121, periods: 2 });
      expect(r.roiAnnualizedPct).toBe(10);
    });
  });

  describe("variante por flujo de caja", () => {
    const flows = [
      { period: 1, amount: 300 },
      { period: 2, amount: 400 },
      { period: 3, amount: 500 },
    ];

    it("payback: recupera la inversión en el periodo 2 (I0=600)", () => {
      const r = calculateRoi({ initialInvestment: 600, cashFlows: flows });
      expect(r.paybackPeriod).toBe(2);
    });

    it("payback indefinido si nunca recupera (I0=5000)", () => {
      const r = calculateRoi({ initialInvestment: 5000, cashFlows: flows });
      expect(r.paybackPeriod).toBeUndefined();
    });

    it("NPV con tasa de descuento (I0=1000, 3 flujos 400 c/u, 10% → ≈ -5.26)", () => {
      const r = calculateRoi({
        initialInvestment: 1000,
        cashFlows: [
          { period: 1, amount: 400 },
          { period: 2, amount: 400 },
          { period: 3, amount: 400 },
        ],
        discountRatePct: 0.1,
      });
      expect(r.npv).not.toBeUndefined();
      // NPV = -1000 + 400/1.1 + 400/1.21 + 400/1.331 ≈ -5.26
      expect(approxEq(r.npv ?? 0, -5.26, 1e-2)).toBe(true);
    });

    it("TIR de un proyecto simple converge (I0=1000, flujos 600 y 600 → TIR ≈ 13.07%)", () => {
      const r = calculateRoi({
        initialInvestment: 1000,
        cashFlows: [
          { period: 1, amount: 600 },
          { period: 2, amount: 600 },
        ],
      });
      expect(r.internalRateOfReturn).not.toBeUndefined();
      // IRR: -1000 + 600/(1+r) + 600/(1+r)^2 = 0 → r ≈ 0.13066
      expect(approxEq(r.internalRateOfReturn ?? 0, 13.066, 1e-2)).toBe(true);
    });
  });

  describe("npv / calculateIrr helpers", () => {
    it("npv de flujo único a tasa 0", () => {
      expect(npv([-100, 110], 0)).toBe(10);
    });

    it("calculateIrr del ejemplo clásico", () => {
      const tir = calculateIrr([-1000, 600, 600]);
      expect(approxEq(tir, 0.13066, 1e-3)).toBe(true);
    });
  });

  describe("casos borde §6.2", () => {
    it("initialInvestment = 0 → error", () => {
      expect(() => calculateRoi({ initialInvestment: 0, finalValue: 100 })).toThrow(
        RoiDomainError
      );
    });

    it("initialInvestment negativo → error", () => {
      expect(() => calculateRoi({ initialInvestment: -10, finalValue: 100 })).toThrow(
        RoiDomainError
      );
    });

    it("TIR de flujos todos positivos (sin inversión) → +Infinity controlado", () => {
      expect(calculateIrr([100, 100])).toBe(Number.POSITIVE_INFINITY);
    });

    it("IRR de flujos negativos constantes no converge", () => {
      expect(() => calculateIrr([-100, -100, -100])).toThrow(IRRNonConvergenceError);
    });

    it("discountRatePct negativo → error", () => {
      expect(() =>
        calculateRoi({
          initialInvestment: 100,
          cashFlows: [{ period: 1, amount: 120 }],
          discountRatePct: -0.1,
        })
      ).toThrow(RoiDomainError);
    });
  });

  describe("casos borde adicionales: pago exacto, flujos y TIR", () => {
    it("ROI simple nulo: VF == I0 → 0% y netGain 0", () => {
      const r = calculateRoi({ initialInvestment: 100, finalValue: 100 });
      expect(r.roiPct).toBe(0);
      expect(r.netGain).toBe(0);
    });

    it("ROI simple con decimales (I0=100, VF=134.56 → 34.56%)", () => {
      const r = calculateRoi({ initialInvestment: 100, finalValue: 134.56 });
      expect(r.roiPct).toBe(34.56);
      expect(r.netGain).toBe(34.56);
    });

    it("ROI anualizado decimal (I0=50, VF=72, 3 periodos → ≈12.92%)", () => {
      const r = calculateRoi({ initialInvestment: 50, finalValue: 72, periods: 3 });
      expect(approxEq(r.roiAnnualizedPct ?? 0, 12.9243, 1e-3)).toBe(true);
    });

    it("flujos vacíos → sin payback ni TIR, sin cashFlows en breakdown", () => {
      const r = calculateRoi({ initialInvestment: 100, cashFlows: [] });
      expect(r.paybackPeriod).toBeUndefined();
      expect(r.internalRateOfReturn).toBeUndefined();
      expect(r.breakdown).not.toHaveProperty("cashFlows");
    });

    it("todos los flujos negativos → TIR lanza error controlado (nunca se recupera)", () => {
      expect(() =>
        calculateRoi({
          initialInvestment: 100,
          cashFlows: [
            { period: 1, amount: -50 },
            { period: 2, amount: -30 },
          ],
        })
      ).toThrow(IRRNonConvergenceError);
    });

    it("flujos positivos que no alcanzan la inversión → payback indefinido", () => {
      const r = calculateRoi({
        initialInvestment: 400,
        cashFlows: [
          { period: 1, amount: 100.5 },
          { period: 2, amount: 200.25 },
        ],
      });
      expect(r.paybackPeriod).toBeUndefined();
    });

    it("flujos decimales: recupera en el periodo que supera I0 (I0=250)", () => {
      const r = calculateRoi({
        initialInvestment: 250,
        cashFlows: [
          { period: 1, amount: 100.5 },
          { period: 2, amount: 200.25 },
        ],
      });
      expect(r.paybackPeriod).toBe(2);
    });

    it("payback exacto en un solo periodo (I0=100, flujo 100)", () => {
      const r = calculateRoi({ initialInvestment: 100, cashFlows: [{ period: 1, amount: 100 }] });
      expect(r.paybackPeriod).toBe(1);
    });

    it("IRR con un solo flujo convergente (I0=100, flujo 110 → ≈10%)", () => {
      const r = calculateRoi({ initialInvestment: 100, cashFlows: [{ period: 1, amount: 110 }] });
      expect(r.paybackPeriod).toBe(1);
      expect(approxEq(r.internalRateOfReturn ?? 0, 10, 1e-2)).toBe(true);
    });

    it("calculateIrr de un solo flujo rescata la tasa exacta ([-100,130] → 0.3)", () => {
      const tir = calculateIrr([-100, 130]);
      expect(approxEq(tir, 0.3, 1e-5)).toBe(true);
    });

    it("NPV con tasa 0 = suma de flujos - inversión", () => {
      const r = calculateRoi({
        initialInvestment: 1000,
        cashFlows: [
          { period: 1, amount: 400 },
          { period: 2, amount: 400 },
          { period: 3, amount: 400 },
        ],
        discountRatePct: 0,
      });
      expect(r.npv).toBe(200);
    });

    it("periodos no consecutivos: payback usa periodos reales, NPV solo 1..N (comportamiento observable)", () => {
      const r = calculateRoi({
        initialInvestment: 150,
        cashFlows: [
          { period: 1, amount: 100 },
          { period: 5, amount: 200 },
        ],
        discountRatePct: 0,
      });
      expect(r.paybackPeriod).toBe(5);
      expect(r.npv).toBe(-50);
    });

    it("finalValue no finito → error (NaN e Infinity)", () => {
      expect(() =>
        calculateRoi({ initialInvestment: 100, finalValue: Number.NaN })
      ).toThrow(RoiDomainError);
      expect(() =>
        calculateRoi({ initialInvestment: 100, finalValue: Number.POSITIVE_INFINITY })
      ).toThrow(RoiDomainError);
    });

    it("discountRatePct NaN → error", () => {
      expect(() =>
        calculateRoi({
          initialInvestment: 100,
          cashFlows: [{ period: 1, amount: 120 }],
          discountRatePct: Number.NaN,
        })
      ).toThrow(RoiDomainError);
    });

    it("npv con tasa decimal ([-1000,600,600] al 10% → ≈41.32)", () => {
      expect(approxEq(npv([-1000, 600, 600], 0.1), 41.3223, 1e-3)).toBe(true);
    });
  });

  it("expone la versión de fórmula congelada", () => {
    expect(calculateRoi({ initialInvestment: 100, finalValue: 110 }).formulaVersion).toBe(
      ROI_FORMULA_VERSION
    );
  });
});