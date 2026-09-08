/**
 * metrix · domain/shared/decimal.ts
 * Aritmética decimal segura para evitar errores de punto flotante (0.1 + 0.2 ≠ 0.3).
 * Dominio PURO: sin imports de framework.
 */

/**
 * Redondea un número a un número fijo de decimales (default 10).
 * Evita el ruido de punto flotante en resultados de fórmulas.
 */
export function round(value: number, decimals = 10): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Suma segura de dos números con redondeo final.
 */
export function add(a: number, b: number, decimals = 10): number {
  return round(a + b, decimals);
}

/**
 * Resta segura.
 */
export function sub(a: number, b: number, decimals = 10): number {
  return round(a - b, decimals);
}

/**
 * Multiplicación segura.
 */
export function mul(a: number, b: number, decimals = 10): number {
  return round(a * b, decimals);
}

/**
 * División segura. Lanza si el divisor es 0 (o muy cercano a 0).
 */
export function div(a: number, b: number, decimals = 10): number {
  if (b === 0) {
    throw new Error("Division by zero");
  }
  return round(a / b, decimals);
}

/**
 * Potencia segura.
 */
export function pow(a: number, b: number, decimals = 10): number {
  return round(a ** b, decimals);
}

/**
 * Compara dos números con tolerancia epsilon.
 */
export function approxEq(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}
