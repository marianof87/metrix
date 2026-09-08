import { describe, it, expect } from "vitest";
import { round, add, sub, mul, div, pow, approxEq } from "./decimal";

describe("domain/shared/decimal", () => {
  it("round elimina el ruido de punto flotante", () => {
    expect(round(0.1 + 0.2)).toBe(0.3);
    expect(round(1.005, 2)).toBe(1.01);
  });

  it("add suma con redondeo", () => {
    expect(add(0.1, 0.2)).toBe(0.3);
  });

  it("sub resta con redondeo", () => {
    expect(sub(0.3, 0.1)).toBe(0.2);
  });

  it("mul multiplica con redondeo", () => {
    expect(mul(0.1, 0.1)).toBe(0.01);
  });

  it("div divide con redondeo y lanza en divisor 0", () => {
    expect(div(1, 3, 4)).toBe(0.3333);
    expect(() => div(1, 0)).toThrow("Division by zero");
  });

  it("pow eleva con redondeo", () => {
    expect(pow(2, 10)).toBe(1024);
  });

  it("approxEq compara con tolerancia relativa", () => {
    expect(approxEq(1, 1.0000000001)).toBe(true);
    expect(approxEq(1, 2)).toBe(false);
    expect(approxEq(1e12, 1e12 + 1e3)).toBe(true);
  });

  it("round devuelve NaN/Infinity sin alterar (no lanza)", () => {
    expect(Number.isNaN(round(NaN))).toBe(true);
    expect(round(Infinity)).toBe(Infinity);
  });
});