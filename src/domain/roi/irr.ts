/**
 * metrix · domain/roi/irr.ts
 * Solver numérico de TIR (Internal Rate of Return) por bisección.
 * Dominio PURO: sin imports de framework.
 *
 * TIR = tasa r tal que NPV(r) = Σ CF_t / (1+r)^t = 0 (flujos desde t=0).
 * El flujo en t=0 es típicamente la inversión inicial (negativo).
 *
 * Estrategia: búsqueda por bisección en [low, high] ampliando el rango si
 * no hay cambio de signo. Si no converge en maxIterations → IRRNonConvergenceError.
 */

export class IRRNonConvergenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IRRNonConvergenceError";
  }
}

export interface IrrOptions {
  /** tolerancia en rate (default 1e-7) */
  tolerance?: number;
  /** iteraciones máximas (default 200) */
  maxIterations?: number;
  /** rango inicial de búsqueda (default [-0.9999, 10]) */
  low?: number;
  high?: number;
}

/**
 * Calcula el NPV de unos flujos para una tasa r.
 * @param cashFlows flujos; cashFlows[0] es el flujo en t=0 (normalmente negativo).
 */
export function npv(cashFlows: number[], rate: number): number {
  let sum = 0;
  for (let t = 0; t < cashFlows.length; t += 1) {
    sum += cashFlows[t] / (1 + rate) ** t;
  }
  return sum;
}

/**
 * Calcula la TIR por bisección.
 * @throws IRRNonConvergenceError si no se encuentra cambio de signo o no converge.
 */
export function calculateIrr(cashFlows: number[], options: IrrOptions = {}): number {
  const tolerance = options.tolerance ?? 1e-7;
  const maxIterations = options.maxIterations ?? 200;
  let low = options.low ?? -0.9999;
  let high = options.high ?? 10;

  let fLow = npv(cashFlows, low);
  let fHigh = npv(cashFlows, high);

  // Expande el rango superior hasta encontrar cambio de signo (o límite).
  let guard = 0;
  while (fLow * fHigh > 0 && guard < 100) {
    high = high * 2 + 1;
    fHigh = npv(cashFlows, high);
    guard += 1;
  }

  // Si aun así no hay cambio de signo, no podemos resolver con bisección real.
  if (fLow * fHigh > 0) {
    // Caso especial: todos los flujos son ≥ 0 → TIR infinita/indefinida.
    if (cashFlows.every((cf) => cf >= 0)) {
      return Number.POSITIVE_INFINITY;
    }
    throw new IRRNonConvergenceError("IRR did not converge: no sign change on bracket");
  }

  let mid = 0;
  for (let i = 0; i < maxIterations; i += 1) {
    mid = (low + high) / 2;
    const fMid = npv(cashFlows, mid);
    if (Math.abs(fMid) < tolerance || Math.abs(high - low) < tolerance) {
      return mid;
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  throw new IRRNonConvergenceError("IRR did not converge within max iterations");
}