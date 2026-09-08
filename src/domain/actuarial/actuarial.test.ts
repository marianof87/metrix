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

  describe("casos borde adicionales: zeros en inputs y probabilidades límite", () => {
    it("principal = 0 con rate > 0 → compuesto 0 y PV 0", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0.05,
        periodsPerYear: 4,
        years: 3,
      });
      expect(r.compoundAmount).toBe(0);
      expect(r.compoundInterest).toBe(0);
      expect(r.presentValueDiscount).toBe(0);
    });

    it("rate = 0 → compuesto = principal, tasa efectiva 0, PV = principal", () => {
      const r = calculateActuarial({
        principal: 500,
        annualRatePct: 0,
        periodsPerYear: 12,
        years: 5,
      });
      expect(r.compoundAmount).toBe(500);
      expect(r.compoundInterest).toBe(0);
      expect(r.effectiveAnnualRatePct).toBe(0);
      expect(r.presentValueDiscount).toBe(500);
    });

    it("contribution = 0 explícito → FV anualidad 0", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0.05,
        periodsPerYear: 12,
        years: 1,
        contributionPerPeriod: 0,
      });
      expect(r.futureValueAnnuity).toBe(0);
    });

    it("years decimal: compuesto fraccional (1000, 10% anual, 0.5 años → ≈1048.81)", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.1,
        periodsPerYear: 1,
        years: 0.5,
      });
      expect(approxEq(r.compoundAmount, 1048.81, 1e-2)).toBe(true);
    });

    it("capitalización diaria (n=365): 1000 al 5% un año → ≈1051.27", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.05,
        periodsPerYear: 365,
        years: 1,
      });
      expect(approxEq(r.compoundAmount, 1051.27, 1e-2)).toBe(true);
    });

    it("tasa efectiva trimestral (12% nominal, n=4 → ≈12.55%)", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.12,
        periodsPerYear: 4,
        years: 1,
      });
      expect(approxEq(r.effectiveAnnualRatePct, 0.12551, 1e-4)).toBe(true);
    });

    it("valor presente mensual (1000, 5%, n=12, 3 años → ≈860.98)", () => {
      const r = calculateActuarial({
        principal: 1000,
        annualRatePct: 0.05,
        periodsPerYear: 12,
        years: 3,
      });
      expect(approxEq(r.presentValueDiscount, 860.98, 1e-2)).toBe(true);
    });

    it("FV anualidad con decimales (100/mes, 10% anual, 1 año → ≈1256.56)", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0.1,
        periodsPerYear: 12,
        years: 1,
        contributionPerPeriod: 100,
      });
      expect(approxEq(r.futureValueAnnuity ?? 0, 1256.56, 1e-2)).toBe(true);
    });

    it("years = 0 con contribution → FV anualidad 0 y compuesto = principal", () => {
      const r = calculateActuarial({
        principal: 100,
        annualRatePct: 0.05,
        periodsPerYear: 12,
        years: 0,
        contributionPerPeriod: 50,
      });
      expect(r.futureValueAnnuity).toBe(0);
      expect(r.compoundAmount).toBe(100);
    });

    it("mortalityProbability = 0 → expectedPayout 0 y netPremium = premium", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 1,
        years: 1,
        mortality: { age: 40, premium: 90, coverage: 10000, mortalityProbability: 0 },
      });
      expect(r.mortality?.expectedPayout).toBe(0);
      expect(r.mortality?.netPremium).toBe(90);
    });

    it("mortalityProbability = 1 → expectedPayout = coverage (pago pleno)", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 1,
        years: 1,
        mortality: { age: 40, premium: 90, coverage: 10000, mortalityProbability: 1 },
      });
      expect(r.mortality?.expectedPayout).toBe(10000);
      expect(r.mortality?.netPremium).toBe(-9910);
    });

    it("tabla básica en age = 0 → q = 0.01", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 1,
        years: 1,
        mortality: { age: 0, premium: 100, coverage: 5000 },
      });
      expect(r.mortality?.expectedPayout).toBe(50);
    });

    it("tabla básica satura q en 1 para edades extremas", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 1,
        years: 1,
        mortality: { age: 1000000, premium: 100, coverage: 200 },
      });
      expect(r.mortality?.expectedPayout).toBe(200);
    });

    it("con rate/principal 0 y mortalidad, todos los valores son finitos (sin NaN/Infinity)", () => {
      const r = calculateActuarial({
        principal: 0,
        annualRatePct: 0,
        periodsPerYear: 1,
        years: 1,
        mortality: { age: 1000, premium: 0, coverage: 1000, mortalityProbability: 1 },
      });
      const values = [
        r.compoundAmount,
        r.compoundInterest,
        r.effectiveAnnualRatePct,
        r.presentValueDiscount,
        r.futureValueAnnuity ?? 0,
        ...(r.mortality
          ? [r.mortality.premiumPv, r.mortality.expectedPayout, r.mortality.netPremium ?? 0]
          : []),
      ];
      for (const v of values) {
        expect(Number.isFinite(v)).toBe(true);
      }
    });

    it("principal/rate/periodsPerYear negativos → error", () => {
      expect(() =>
        calculateActuarial({ principal: -1, annualRatePct: 0.05, periodsPerYear: 1, years: 1 })
      ).toThrow(ActuarialDomainError);
      expect(() =>
        calculateActuarial({ principal: 100, annualRatePct: -0.05, periodsPerYear: 1, years: 1 })
      ).toThrow(ActuarialDomainError);
      expect(() =>
        calculateActuarial({ principal: 100, annualRatePct: 0.05, periodsPerYear: -1, years: 1 })
      ).toThrow(ActuarialDomainError);
    });

    it("breakdown refleja contributionPerPeriod provisto u omitido", () => {
      const withC = calculateActuarial({
        principal: 100,
        annualRatePct: 0.05,
        periodsPerYear: 2,
        years: 1,
        contributionPerPeriod: 10,
      });
      expect(withC.breakdown.contributionPerPeriod).toBe(10);
      const withoutC = calculateActuarial({
        principal: 100,
        annualRatePct: 0.05,
        periodsPerYear: 2,
        years: 1,
      });
      expect(withoutC.breakdown.contributionPerPeriod).toBeUndefined();
      expect(withoutC.futureValueAnnuity).toBeUndefined();
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