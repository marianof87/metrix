/**
 * metrix · domain/roi/roi.ts
 * Calculadora de ROI. Fórmula v1: 'roi-v1'.
 * Dominio PURO: sin imports de framework.
 *
 * Variantes:
 * - Simple: roiPct = (VF - I0) / I0 * 100
 * - Anualizado: (VF/I0)^(1/n) - 1
 * - Por flujo de caja: payback (periodos hasta recuperar I0), NPV (con tasa), TIR.
 */

import { round, div, sub, pow, approxEq } from "../shared/decimal";
import { calculateIrr, npv, IRRNonConvergenceError } from "./irr";

export const ROI_FORMULA_VERSION = "roi-v1";

export interface CashFlow {
  period: number;
  amount: number;
}

export interface RoiInputs {
  /** inversión inicial I0 (positivo en money; se trata como desembolso) */
  initialInvestment: number;
  /** valor final VF — variante simple */
  finalValue?: number;
  /** flujos de caja después del periodo 0 (para payback/NPV/IRR) */
  cashFlows?: CashFlow[];
  /** número de periodos (para anualización) */
  periods?: number;
  /** tasa de descuento en tanto por uno (para NPV) */
  discountRatePct?: number;
}

export interface RoiResult {
  formulaVersion: string;
  roiPct?: number;
  roiAnnualizedPct?: number;
  netGain?: number;
  paybackPeriod?: number;
  npv?: number;
  internalRateOfReturn?: number;
  breakdown: {
    initialInvestment: number;
    finalValue?: number;
    cashFlows?: CashFlow[];
    periods?: number;
  };
}

export class RoiDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoiDomainError";
  }
}

/**
 * Calcula el ROI.
 * @throws RoiDomainError si hay inputs inválidos; IRRNonConvergenceError si la TIR no converge.
 */
export function calculateRoi(inputs: RoiInputs): RoiResult {
  const { initialInvestment } = inputs;

  if (!Number.isFinite(initialInvestment) || initialInvestment < 0) {
    throw new RoiDomainError("initialInvestment must be a finite non-negative number");
  }
  if (approxEq(initialInvestment, 0)) {
    throw new RoiDomainError("initialInvestment must be > 0 to compute ROI");
  }

  const breakdown: RoiResult["breakdown"] = {
    initialInvestment,
  };

  const result: RoiResult = {
    formulaVersion: ROI_FORMULA_VERSION,
    breakdown,
  };

  // --- Variante simple (finalValue) ---
  if (inputs.finalValue !== undefined) {
    const vf = inputs.finalValue;
    if (!Number.isFinite(vf)) {
      throw new RoiDomainError("finalValue must be finite");
    }
    breakdown.finalValue = vf;
    result.netGain = round(sub(vf, initialInvestment));
    result.roiPct = round(div(sub(vf, initialInvestment), initialInvestment) * 100);

    if (inputs.periods !== undefined && inputs.periods > 0) {
      breakdown.periods = inputs.periods;
      // (VF/I0)^(1/n) - 1, en %
      result.roiAnnualizedPct = round((pow(vf / initialInvestment, 1 / inputs.periods) - 1) * 100);
    }
  }

  // --- Variante por flujo de caja ---
  if (inputs.cashFlows && inputs.cashFlows.length > 0) {
    const flows: CashFlow[] = [...inputs.cashFlows]
      .sort((a, b) => a.period - b.period)
      .map((f) => ({ period: f.period, amount: f.amount }));
    breakdown.cashFlows = flows;

    // Payback: periodos hasta que la suma acumulada ≥ I0
    let cumulative = 0;
    let paybackPeriod: number | undefined;
    for (const f of flows) {
      cumulative += f.amount;
      if (cumulative >= initialInvestment && paybackPeriod === undefined) {
        paybackPeriod = f.period;
      }
    }
    result.paybackPeriod = paybackPeriod;

    // NPV con tasa de descuento (si se provee)
    if (inputs.discountRatePct !== undefined) {
      if (!Number.isFinite(inputs.discountRatePct) || inputs.discountRatePct < 0) {
        throw new RoiDomainError("discountRatePct must be a finite non-negative number");
      }
      const rate = inputs.discountRatePct;
      // Flujos: t=0 → -I0; luego los flujos por periodo (asumimos periodos 1..n consecutivos)
      const cashFlowSeries: number[] = [-initialInvestment];
      for (let p = 1; p <= flows.length; p += 1) {
        const flow = flows.find((f) => f.period === p)?.amount ?? 0;
        cashFlowSeries.push(flow);
      }
      result.npv = round(npv(cashFlowSeries, rate));
    }

    // TIR con los flujos completos (I0 en t=0)
    const cashFlowSeriesIrr: number[] = [-initialInvestment];
    for (const f of flows) {
      cashFlowSeriesIrr.push(f.amount);
    }
    try {
      const tir = calculateIrr(cashFlowSeriesIrr);
      result.internalRateOfReturn = Number.isFinite(tir) ? round(tir * 100) : tir;
    } catch (e) {
      if (e instanceof IRRNonConvergenceError) {
        // TIR no definida; el plan establece error controlado, no NaN.
        throw e;
      }
      throw e;
    }
  }

  return result;
}