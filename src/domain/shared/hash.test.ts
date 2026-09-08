import { describe, it, expect } from "vitest";
import { sha256Hex } from "./hash";

describe("domain/shared/hash", () => {
  it("produce un hash SHA-256 de 64 caracteres hex", () => {
    expect(sha256Hex("metrix")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("es determinista: misma entrada → mismo hash", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
  });

  it("entrada distinta → hash distinto", () => {
    expect(sha256Hex("abc")).not.toBe(sha256Hex("abd"));
  });
});