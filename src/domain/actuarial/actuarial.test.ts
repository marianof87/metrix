import { describe, it, expect } from "vitest";
import { calculateActuarial, ActuarialDomainError, ACTUARIAL_FORMULA_VERSION } from "./actuarial";
import { approxEq } from "../shared/decimal";

describe("domain/actuarial", () => {
  describe("interés compuesto", () => {
    it("A = P(1+r/n)^(nt) — P=1000, 5% anual, capitalización anual, 1 año → 1050", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.05,
        periodsPerYear: 1,
        years: 1,
      });
      expect(r.compoundAmount).toBe(1050);
      expect(r.compoundInterest).toBe(50);
    });

    it("capitalización mensual: P=1000, 12% anual, 1 año → ≈ 1126.83", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.12,
        periodsPerYear: 12,
        years: 1,
      });
      expect(approxEq(r.compoundAmount, 1126.83, 1e-2)).toBe(true);
    });
  });

  describe("tasa efectiva y valor presente", () => {
    it("tasa efectiva = (1+r/n)^n - 1 — 12% nominal mensual → 12.68%", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.12,
        periodsPerYear: 12,
        years: 1,
      });
      expect(approxEq(r.effectiveAnnualRatePct, 0.1268, 1e-3)).toBe(true);
    });

    it("valor presente: PV de 1000 a 10% anual, 2 años ≈ 826.45", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.1,
        periodsPerYear: 1,
        years: 2,
      });
      expect(approxEq(r.presentValueDiscount, 826.45, 1e-2)).toBe(true);
    });
  });

  describe("anualidad", () => {
    it("FV anualidad: aporte 100/mes, 12% anual, 1 año → ≈ 1268.25", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0.12,
        periodsPerYear: 12,
        years: 1,
        contributionPerPeriod: 100,
      });
      expect(r.futureValueAnnuity).not.toBeUndefined();
      // FV = 100 * ((1.01)^12 - 1)/0.01 ≈ 1268.25
      expect(approxEq(r.futureValueAnnuity ?? 0, 1268.25, 1e-2)).toBe(true);
    });

    it("FV anualidad con rate=0 → C * n * t", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 12,
        years: 1,
        contributionPerPeriod: 50,
      });
      expect(r.futureValueAnnuity).toBe(600);
    });
  });

  describe("prima simple", () => {
    it("prima con probabilidad explícita → expectedPayout = coverage * q, netPremium = premium - payout", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 1,
        years: 1,
        mortality: {
          age: 40,
          premium: 90,
          coverage: 10000,
          mortalityProbability: 0.005,
        },
      });
      expect(r.mortality?.expectedPayout).toBe(50);
      expect(r.mortality?.netPremium).toBe(40);
      expect(r.mortality?.premiumPv).toBe(90);
    });

    it("prima con tabla básica por defecto usa q = 0.01*(1+age/1000)", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 1,
        years: 1,
        mortality: { age: 1000, premium: 100, coverage: 100 },
      });
      // q = min(1, 0.01*(1+1)) = 0.02 → payout = 2
      expect(r.mortality?.expectedPayout).toBe(2);
    });
  });

  describe("casos borde §6.2", () => {
    it("annualRatePct = 1 → error (tasa > 100% fuera de rango)", () => {
      expect(() =>
        calculateActuarial({ principal: 1000, annualRatePct: 1, periodsPerYear: 1, years: 1 })
      ).toThrow(ActuarialDomainError);
    });

    it("periodsPerYear = 0 → error (división por cero)", () => {
      expect(() =>
        calculateActuarial({ principal: 1000, annualRatePct: 0.05, periodsPerYear: 0, years: 1 })
      ).toThrow(ActuarialDomainError);
    });

    it("years = 0 → compuesto = principal", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.05,
        periodsPerYear: 12,
        years: 0,
      });
      expect(r.compoundAmount).toBe(1000);
      expect(r.compoundInterest).toBe(0);
    });

    it("principal = 0 con aportes → compuesto 0, FV de anualidad sí", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0.05,
        periodsPerYear: 12,
        years: 5,
        contributionPerPeriod: 10,
      });
      expect(r.compoundAmount).toBe(0);
      expect(r.futureValueAnnuity).toBeGreaterThan(0);
    });

    it("contribution negativa → error", () => {
      expect(() =>
        calculateActuarial({
          principal: 1000,
          annualRatePct: 0.05,
          periodsPerYear: 12,
          years: 1,
          contributionPerPeriod: -10,
        })
      ).toThrow(ActuarialDomainError);
    });

    it("mortalityProbability fuera de [0,1] → error", () => {
      expect(() =>
        calculateActuarial({
          principal: 0,
          annualRatePct: 0,
          periodsPerYear: 1,
          years: 1,
          mortality: { age: 40, premium: 90, coverage: 10000, mortalityProbability: 1.5 },
        })
      ).toThrow(ActuarialDomainError);
    });

    it("contribution NaN o principal NaN → error", () => {
      expect(() =>
        calculateActuarial({
          principal: 1000,
          annualRatePct: 0.05,
          periodsPerYear: 12,
          years: 1,
          contributionPerPeriod: Number.NaN,
        })
      ).toThrow(ActuarialDomainError);
      expect(() =>
        calculateActuarial({
          principal: Number.NaN,
          annualRatePct: 0.05,
          periodsPerYear: 12,
          years: 1,
        })
      ).toThrow(ActuarialDomainError);
    });

    it("mortality con age/premium/coverage negativos → error", () => {
      expect(() =>
        calculateActuarial({
          principal: 0,
          annualRatePct: 0,
          periodsPerYear: 1,
          years: 1,
          mortality: { age: -1, premium: 90, coverage: 10000 },
        })
      ).toThrow(ActuarialDomainError);
      expect(() =>
        calculateActuarial({
          principal: 0,
          annualRatePct: 0,
          periodsPerYear: 1,
          years: 1,
          mortality: { age: 40, premium: -90, coverage: 10000 },
        })
      ).toThrow(ActuarialDomainError);
      expect(() =>
        calculateActuarial({
          principal: 0,
          annualRatePct: 0,
          periodsPerYear: 1,
          years: 1,
          mortality: { age: 40, premium: 90, coverage: -10000 },
        })
      ).toThrow(ActuarialDomainError);
    });

    it("annualRatePct NaN o years NaN → error", () => {
      expect(() =>
        calculateActuarial({
          principal: 100,
          annualRatePct: Number.NaN,
          periodsPerYear: 1,
          years: 1,
        })
      ).toThrow(ActuarialDomainError);
      expect(() =>
        calculateActuarial({
          principal: 100,
          annualRatePct: 0.05,
          periodsPerYear: 1,
          years: Number.NaN,
        })
      ).toThrow(ActuarialDomainError);
    });
  });

  it("expone la versión de fórmula congelada", () => {
    expect(
      calculateActuarial({
        principal: 100,
        annualRatePct: 0.05,
        periodsPerYear: 1,
        years: 1,
      }).formulaVersion
    ).toBe(ACTUARIAL_FORMULA_VERSION);
  });
});