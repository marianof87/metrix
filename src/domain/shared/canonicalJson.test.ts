import { describe, it, expect } from "vitest";
import { canonicalJson } from "./canonicalJson";

describe("domain/shared/canonicalJson", () => {
  it("serializa objetos con claves en distinto orden al mismo JSON", () => {
    const a = { a: 1, b: 2, c: 3 };
    const b = { c: 3, b: 2, a: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("ordena claves anidadas recursivamente", () => {
    const a = { x: { z: 1, y: 2 } };
    const b = { x: { y: 2, z: 1 } };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"x":{"y":2,"z":1}}');
  });

  it("preserva el orden de los arrays (no los ordena)", () => {
    const a = [3, 1, 2];
    expect(canonicalJson(a)).toBe("[3,1,2]");
  });

  it("maneja valores primitivos y null", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson("hola")).toBe('"hola"');
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson(true)).toBe("true");
  });
});