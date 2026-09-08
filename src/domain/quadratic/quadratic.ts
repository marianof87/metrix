/**
 * metrix · domain/quadratic/quadratic.ts
 * Calculadora de funciones cuadráticas: f(x) = a·x² + b·x + c, con a ≠ 0.
 * Dominio PURO: sin imports de framework. Fórmula v1: 'quadratic-v1'.
 *
 * Cubre: discriminante, raíces (reales, dobles, complejas), vértice, eje de
 * simetría, concavidad, intersección con el eje Y y tabla de valores opcional.
 */

import { round, approxEq } from "../shared/decimal";

export const QUADRATIC_FORMULA_VERSION = "quadratic-v1";

export interface QuadraticInputs {
  a: number;
  b: number;
  c: number;
  /** opcional: dominio a evaluar para tabla de valores */
  sampleStart?: number;
  sampleEnd?: number;
  sampleStep?: number;
}

export interface ComplexRoot {
  real: number;
  imaginary: number;
}

export type QuadraticRoots =
  | { kind: "real"; x1: number; x2: number }
  | { kind: "double"; x: number }
  | { kind: "complex"; x1: ComplexRoot; x2: ComplexRoot };

export interface QuadraticResult {
  formulaVersion: string;
  a: number;
  b: number;
  c: number;
  discriminant: number;
  hasReals: boolean;
  roots: QuadraticRoots | null;
  vertex: { x: number; y: number };
  axisOfSymmetry: number;
  opensUp: boolean;
  yIntercept: number;
  samples?: { x: number; y: number }[];
  domain?: { xMin: number; xMax: number };
}

/**
 * Error de dominio para inputs matemáticamente inválidos (p. ej. a = 0).
 */
export class QuadraticDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuadraticDomainError";
  }
}

function evaluate(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}

/**
 * Resuelve la función cuadrática f(x) = a·x² + b·x + c.
 * @throws QuadraticDomainError si a === 0 (no es cuadrática).
 */
export function solveQuadratic(inputs: QuadraticInputs): QuadraticResult {
  const { a, b, c } = inputs;

  if (a === 0 || !Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
    throw new QuadraticDomainError("Quadratic requires a nonzero, finite coefficient a");
  }

  const discriminant = round(b * b - 4 * a * c);
  const axisOfSymmetry = round(-b / (2 * a));
  const vertexY = evaluate(a, b, c, axisOfSymmetry);
  const vertex = { x: axisOfSymmetry, y: round(vertexY) };
  const opensUp = a > 0;
  const yIntercept = round(c);

  let roots: QuadraticRoots | null = null;
  const hasReals = discriminant >= 0;

  if (approxEq(discriminant, 0)) {
    roots = { kind: "double", x: axisOfSymmetry };
  } else if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    const x1 = round((-b + sqrtD) / (2 * a));
    const x2 = round((-b - sqrtD) / (2 * a));
    roots = { kind: "real", x1, x2 };
  } else {
    const sqrtNeg = Math.sqrt(-discriminant);
    const realPart = -b / (2 * a);
    const imagPart = sqrtNeg / (2 * a);
    roots = {
      kind: "complex",
      x1: { real: round(realPart), imaginary: round(Math.abs(imagPart)) },
      x2: { real: round(realPart), imaginary: round(-Math.abs(imagPart)) },
    };
  }

  const result: QuadraticResult = {
    formulaVersion: QUADRATIC_FORMULA_VERSION,
    a,
    b,
    c,
    discriminant,
    hasReals,
    roots,
    vertex,
    axisOfSymmetry,
    opensUp,
    yIntercept,
  };

  // Tabla de valores opcional
  if (
    inputs.sampleStart !== undefined &&
    inputs.sampleEnd !== undefined &&
    inputs.sampleStep !== undefined &&
    inputs.sampleStep > 0
  ) {
    const { sampleStart, sampleEnd, sampleStep } = inputs;
    const xMin = Math.min(sampleStart, sampleEnd);
    const xMax = Math.max(sampleStart, sampleEnd);
    const samples: { x: number; y: number }[] = [];
    for (let x = xMin; x <= xMax + 1e-9; x += sampleStep) {
      samples.push({ x: round(x), y: round(evaluate(a, b, c, x)) });
    }
    result.samples = samples;
    result.domain = { xMin, xMax };
  }

  return result;
}
