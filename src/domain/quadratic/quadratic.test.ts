import { describe, it, expect } from "vitest";
import {
  solveQuadratic,
  QuadraticDomainError,
  QUADRATIC_FORMULA_VERSION,
} from "./quadratic";
import { approxEq } from "../shared/decimal";

describe("domain/quadratic", () => {
  describe("casos base §3.2", () => {
    it("Δ > 0 → dos raíces reales (f(x)=x²-5x+6 → raíces 2 y 3)", () => {
      const r = solveQuadratic({ a: 1, b: -5, c: 6 });
      expect(r.hasReals).toBe(true);
      expect(r.roots?.kind).toBe("real");
      if (r.roots && r.roots.kind === "real") {
        expect(approxEq(r.roots.x1, 3)).toBe(true);
        expect(approxEq(r.roots.x2, 2)).toBe(true);
      }
      expect(r.discriminant).toBe(1);
    });

    it("Δ = 0 → raíz doble (f(x)=x²-4x+4 → raíz 2, multiplicity double)", () => {
      const r = solveQuadratic({ a: 1, b: -4, c: 4 });
      expect(r.discriminant).toBe(0);
      expect(r.roots?.kind).toBe("double");
      if (r.roots?.kind === "double") {
        expect(approxEq(r.roots.x, 2)).toBe(true);
      }
    });

    it("Δ < 0 → sin raíces reales, reporta complejas (f(x)=x²+1)", () => {
      const r = solveQuadratic({ a: 1, b: 0, c: 1 });
      expect(r.hasReals).toBe(false);
      expect(r.roots?.kind).toBe("complex");
      if (r.roots?.kind === "complex") {
        expect(r.roots.x1.real).toBe(0);
        expect(approxEq(r.roots.x1.imaginary, 1)).toBe(true);
        expect(r.roots.x2.imaginary).toBe(-1);
      }
    });
  });

  describe("vértice, eje, concavidad, intersección", () => {
    it("vértice y eje de simetría (f(x)=x²-4x+4 → vértice x=2)", () => {
      const r = solveQuadratic({ a: 1, b: -4, c: 4 });
      expect(approxEq(r.axisOfSymmetry, 2)).toBe(true);
      expect(approxEq(r.vertex.x, 2)).toBe(true);
      expect(r.vertex.y).toBe(0);
    });

    it("concavidad: a>0 abre hacia arriba", () => {
      expect(solveQuadratic({ a: 1, b: 0, c: 0 }).opensUp).toBe(true);
    });

    it("concavidad: a<0 abre hacia abajo (f(x)=-x²)", () => {
      expect(solveQuadratic({ a: -1, b: 0, c: 0 }).opensUp).toBe(false);
    });

    it("intersección con eje Y = c", () => {
      expect(solveQuadratic({ a: 2, b: 3, c: -7 }).yIntercept).toBe(-7);
    });
  });

  describe("coeficientes decimales y negativos", () => {
    it("raíces decimales (f(x)=0.5x²-1.5x+1 → Δ=0.25, raíces 2 y 1)", () => {
      const r = solveQuadratic({ a: 0.5, b: -1.5, c: 1 });
      expect(r.hasReals).toBe(true);
      if (r.roots?.kind === "real") {
        expect(approxEq(r.roots.x1, 2)).toBe(true);
        expect(approxEq(r.roots.x2, 1)).toBe(true);
      }
    });

    it("a negativo con raíces reales (f(x)=-x²+4x-3 → raíces 1 y 3)", () => {
      const r = solveQuadratic({ a: -1, b: 4, c: -3 });
      expect(r.hasReals).toBe(true);
      if (r.roots?.kind === "real") {
        const roots = [r.roots.x1, r.roots.x2];
        expect(roots.some((x) => approxEq(x, 1))).toBe(true);
        expect(roots.some((x) => approxEq(x, 3))).toBe(true);
      }
    });
  });

  describe("casos borde §6.2", () => {
    it("a=0 → error controlado, nunca NaN", () => {
      expect(() => solveQuadratic({ a: 0, b: 1, c: 1 })).toThrow(QuadraticDomainError);
    });

    it("a muy cercano a 0 → inestabilidad numérica manejada (no lanza si es exactamente 0)", () => {
      // a=1e-15 con b=1: resoluble, discriminant > 0
      const r = solveQuadratic({ a: 1e-15, b: 1, c: 0 });
      expect(r.hasReals).toBe(true);
    });

    it("coeficientes muy grandes no producen Infinity", () => {
      const r = solveQuadratic({ a: 1e15, b: -2e15, c: 1e15 });
      expect(Number.isFinite(r.discriminant)).toBe(true);
    });

    it("tabla de valores opcional genera muestras en el dominio dado", () => {
      const r = solveQuadratic({
        a: 1,
        b: 0,
        c: 0,
        sampleStart: -2,
        sampleEnd: 2,
        sampleStep: 1,
      });
      expect(r.samples?.length).toBe(5);
      expect(r.domain).toEqual({ xMin: -2, xMax: 2 });
    });
  });

  describe("casos borde adicionales: discriminante y precisión", () => {
    it("Δ < 0 con raíces complejas conjugadas (f(x)=x²+2x+5 → -1 ± 2i)", () => {
      const r = solveQuadratic({ a: 1, b: 2, c: 5 });
      expect(r.hasReals).toBe(false);
      expect(r.discriminant).toBe(-16);
      expect(r.roots?.kind).toBe("complex");
      if (r.roots?.kind === "complex") {
        expect(r.roots.x1).toEqual({ real: -1, imaginary: 2 });
        expect(r.roots.x2).toEqual({ real: -1, imaginary: -2 });
      }
    });

    it("Δ = 0 con raíz doble decimal (f(x)=4x²-4x+1 → 0.5)", () => {
      const r = solveQuadratic({ a: 4, b: -4, c: 1 });
      expect(r.discriminant).toBe(0);
      expect(r.roots?.kind).toBe("double");
      if (r.roots?.kind === "double") {
        expect(approxEq(r.roots.x, 0.5)).toBe(true);
      }
      expect(approxEq(r.vertex.x, 0.5)).toBe(true);
      expect(r.vertex.y).toBe(0);
    });

    it("coeficientes decimales con raíz doble (f(x)=1.5x²-6x+6 → 2)", () => {
      const r = solveQuadratic({ a: 1.5, b: -6, c: 6 });
      expect(r.discriminant).toBe(0);
      if (r.roots?.kind === "double") {
        expect(approxEq(r.roots.x, 2)).toBe(true);
      }
    });

    it("complejas con a<0 y opensUp false (f(x)=-x²-2x-5 → -1 ± 2i)", () => {
      const r = solveQuadratic({ a: -1, b: -2, c: -5 });
      expect(r.opensUp).toBe(false);
      expect(r.hasReals).toBe(false);
      if (r.roots?.kind === "complex") {
        expect(r.roots.x1.real).toBe(-1);
        expect(approxEq(r.roots.x1.imaginary, 2)).toBe(true);
        expect(r.roots.x2.imaginary).toBe(-2);
      }
    });

    it("complejas con coeficientes decimales (f(x)=0.5x²-2x+5 → 2 ± 2.4495i)", () => {
      const r = solveQuadratic({ a: 0.5, b: -2, c: 5 });
      expect(r.hasReals).toBe(false);
      if (r.roots?.kind === "complex") {
        expect(r.roots.x1.real).toBe(2);
        expect(approxEq(r.roots.x1.imaginary, 2.44949, 1e-4)).toBe(true);
      }
    });

    it("coeficientes grandes con raíz doble exacta (f(x)=1e6x²-2e6x+1e6 → 1)", () => {
      const r = solveQuadratic({ a: 1e6, b: -2e6, c: 1e6 });
      expect(Number.isFinite(r.discriminant)).toBe(true);
      expect(r.roots?.kind).toBe("double");
      if (r.roots?.kind === "double") {
        expect(r.roots.x).toBe(1);
      }
      expect(r.vertex).toEqual({ x: 1, y: 0 });
    });

    it("a finito y c muy pequeño: Δ≈b² y raíz despreciable ≈ 0 (f(x)=x²-3x+2e-12)", () => {
      const r = solveQuadratic({ a: 1, b: -3, c: 2e-12 });
      expect(r.discriminant).toBe(9);
      expect(r.hasReals).toBe(true);
      if (r.roots?.kind === "real") {
        expect(approxEq(r.roots.x1, 3)).toBe(true);
        expect(approxEq(r.roots.x2, 0)).toBe(true);
      }
    });

    it("raíz doble de un cuadrado perfecto (f(x)=x²-6x+9 → 3)", () => {
      const r = solveQuadratic({ a: 1, b: -6, c: 9 });
      expect(r.discriminant).toBe(0);
      if (r.roots?.kind === "double") {
        expect(r.roots.x).toBe(3);
      }
      expect(r.vertex.y).toBe(0);
      expect(r.yIntercept).toBe(9);
    });

    it("y-intercept decimal y concavidad (f(x)=2x²+3x-1.5)", () => {
      const r = solveQuadratic({ a: 2, b: 3, c: -1.5 });
      expect(r.opensUp).toBe(true);
      expect(approxEq(r.yIntercept, -1.5)).toBe(true);
    });
  });

  describe("tabla de valores opcional (variantes de dominio)", () => {
    it("range invertido (sampleStart > sampleEnd) se ordena", () => {
      const r = solveQuadratic({
        a: 1,
        b: 0,
        c: 0,
        sampleStart: 2,
        sampleEnd: -2,
        sampleStep: 1,
      });
      expect(r.domain).toEqual({ xMin: -2, xMax: 2 });
      expect(r.samples?.length).toBe(5);
      expect(r.samples?.[0]).toEqual({ x: -2, y: 4 });
      expect(r.samples?.[4]).toEqual({ x: 2, y: 4 });
    });

    it("sampleStep = 0 no genera muestras (paso inválido se ignora)", () => {
      const r = solveQuadratic({ a: 1, b: 0, c: 0, sampleStart: 0, sampleEnd: 3, sampleStep: 0 });
      expect(r.samples).toBeUndefined();
      expect(r.domain).toBeUndefined();
    });

    it("sampleStart sin sampleEnd no genera muestras", () => {
      const r = solveQuadratic({ a: 1, b: 0, c: 0, sampleStart: 0 });
      expect(r.samples).toBeUndefined();
      expect(r.domain).toBeUndefined();
    });
  });

  it("expone la versión de fórmula congelada", () => {
    expect(solveQuadratic({ a: 1, b: 0, c: 0 }).formulaVersion).toBe(QUADRATIC_FORMULA_VERSION);
  });
});
