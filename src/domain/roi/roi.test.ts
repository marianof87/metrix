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

  it("expone la versión de fórmula congelada", () => {
    expect(calculateRoi({ initialInvestment: 100, finalValue: 110 }).formulaVersion).toBe(
      ROI_FORMULA_VERSION
    );
  });
});