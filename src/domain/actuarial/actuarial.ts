/**
 * metrix · domain/actuarial/actuarial.ts
 * Módulo actuario (alcance finito, Fórmula v1: 'actuarial-v1').
 * Dominio PURO: sin imports de framework.
 *
 * Alcance (blueprint §3.5):
 * - Interés compuesto: A = P(1 + r/n)^(n·t)
 * - Interés ganado: A - P
 * - Anualidad (aporte periódico): FV de una anualidad ordinaria
 * - Tasa efectiva anual: (1 + r/n)^n - 1
 * - Valor presente con descuento
 * - Prima simple con expectativa de pago (solo si se provee mortality)
 */

import { round, div, sub, mul, pow } from "../shared/decimal";

export const ACTUARIAL_FORMULA_VERSION = "actuarial-v1";

export interface MortalityInput {
  age: number;
  premium: number;
  coverage: number;
  survivalTableId?: string;
  /** probabilidad de fallecimiento en el período (0..1). Si no se da, usa tabla básica. */
  mortalityProbability?: number;
}

export interface ActuarialInputs {
  principal: number;
  /** tasa nominal anual en tanto por uno (0.05 = 5%) */
  annualRatePct: number;
  /** frecuencia de capitalización (1, 2, 4, 12, ...) */
  periodsPerYear: number;
  years: number;
  /** aporte periódico opcional (misma frecuencia que periodsPerYear) */
  contributionPerPeriod?: number;
  mortality?: MortalityInput;
}

export interface ActuarialResult {
  formulaVersion: string;
  compoundAmount: number;
  compoundInterest: number;
  futureValueAnnuity?: number;
  effectiveAnnualRatePct: number;
  presentValueDiscount: number;
  mortality?: {
    premiumPv: number;
    expectedPayout: number;
    netPremium?: number;
  };
  breakdown: {
    principal: number;
    annualRatePct: number;
    periodsPerYear: number;
    years: number;
    contributionPerPeriod?: number;
  };
}

export class ActuarialDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActuarialDomainError";
  }
}

/**
 * Calcula los valores del módulo actuario.
 * @throws ActuarialDomainError si hay inputs inválidos.
 */
export function calculateActuarial(inputs: ActuarialInputs): ActuarialResult {
  const { principal, annualRatePct, periodsPerYear, years } = inputs;

  if (!Number.isFinite(principal) || principal < 0) {
    throw new ActuarialDomainError("principal must be a finite non-negative number");
  }
  if (
    !Number.isFinite(annualRatePct) ||
    annualRatePct < 0 ||
    annualRatePct >= 1
  ) {
    throw new ActuarialDomainError("annualRatePct must satisfy 0 <= rate < 1");
  }
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new ActuarialDomainError("periodsPerYear must be a positive finite number");
  }
  if (!Number.isFinite(years) || years < 0) {
    throw new ActuarialDomainError("years must be a finite non-negative number");
  }

  // Interés compuesto: A = P(1 + r/n)^(n·t)
  const n = periodsPerYear;
  const r = annualRatePct;
  const t = years;
  const compoundAmount = round(mul(principal, pow(1 + r / n, n * t)));
  const compoundInterest = round(sub(compoundAmount, principal));

  // Anualidad ordinaria (aportes al final de cada período):
  // FV = C * [((1 + r/n)^(n·t) - 1) / (r/n)]
  let futureValueAnnuity: number | undefined;
  if (inputs.contributionPerPeriod !== undefined) {
    const c = inputs.contributionPerPeriod;
    if (!Number.isFinite(c) || c < 0) {
      throw new ActuarialDomainError(
        "contributionPerPeriod must be a finite non-negative number"
      );
    }
    if (r === 0) {
      futureValueAnnuity = round(c * n * t);
    } else {
      const base = pow(1 + r / n, n * t);
      futureValueAnnuity = round(mul(c, div(base - 1, r / n)));
    }
  }

  // Tasa efectiva anual: (1 + r/n)^n - 1
  const effectiveAnnualRatePct = round(pow(1 + r / n, n) - 1);

  // Valor presente con descuento: PV = FV / (1 + r/n)^(n·t)
  const presentValueDiscount = round(div(principal, pow(1 + r / n, n * t)));

  const result: ActuarialResult = {
    formulaVersion: ACTUARIAL_FORMULA_VERSION,
    compoundAmount,
    compoundInterest,
    futureValueAnnuity,
    effectiveAnnualRatePct,
    presentValueDiscount,
    breakdown: {
      principal,
      annualRatePct,
      periodsPerYear,
      years,
      contributionPerPeriod: inputs.contributionPerPeriod,
    },
  };

  // Sub-módulo de prima simple (solo si se provee mortality)
  if (inputs.mortality) {
    const m = inputs.mortality;
    if (!Number.isFinite(m.age) || m.age < 0) {
      throw new ActuarialDomainError("mortality.age must be a finite non-negative number");
    }
    if (!Number.isFinite(m.coverage) || m.coverage < 0) {
      throw new ActuarialDomainError("mortality.coverage must be a finite non-negative number");
    }
    if (!Number.isFinite(m.premium) || m.premium < 0) {
      throw new ActuarialDomainError("mortality.premium must be a finite non-negative number");
    }

    // Probabilidad de fallecimiento: tabla básica por defecto (aproximación plana) o provista.
    let q: number;
    if (m.mortalityProbability !== undefined) {
      if (!Number.isFinite(m.mortalityProbability) || m.mortalityProbability < 0 || m.mortalityProbability > 1) {
        throw new ActuarialDomainError(
          "mortality.mortalityProbability must satisfy 0 <= q <= 1"
        );
      }
      q = m.mortalityProbability;
    } else {
      // Tabla básica: q(age) = 0.01 * (1 + age / 1000) — una aproximación sencilla para v1.
      q = Math.min(1, 0.01 * (1 + m.age / 1000));
    }

    const expectedPayout = round(mul(m.coverage, q));
    const premiumPv = round(m.premium);
    const netPremium = round(sub(premiumPv, expectedPayout));

    result.mortality = {
      premiumPv,
      expectedPayout,
      netPremium,
    };
  }

  return result;
}