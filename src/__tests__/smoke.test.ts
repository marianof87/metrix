import { describe, it, expect } from "vitest";

// Smoke test de la Fase 0 (CA0): verifica que el tooling base del monorepo responde.
describe("smoke", () => {
  it("el tooling base del proyecto está operativo", () => {
    expect(1 + 1).toBe(2);
  });
});
