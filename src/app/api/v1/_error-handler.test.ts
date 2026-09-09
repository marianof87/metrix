/**
 * metrix · app/api/v1/_error-handler.test.ts
 * Verificación de contrato: los route handlers existen y exponen las firmas esperadas.
 * Tests de seguridad (sin stack trace) se hacen en E2E.
 */

import { describe, it, expect } from "vitest";

// Importar los route handlers tal como hace api.contract.test.ts
import { POST as quadraticPost } from "@/app/api/v1/quadratic/route";
import { POST as pricingPost } from "@/app/api/v1/pricing/route";

describe("app/api/v1 _error-handler (contrato de exportación)", () => {
  it("handlers de quadratic y pricing están exportados", () => {
    expect(quadraticPost).toBeDefined();
    expect(pricingPost).toBeDefined();
  });

  it("handlers son funciones POST", () => {
    expect(typeof quadraticPost).toBe("function");
    expect(typeof pricingPost).toBe("function");
  });
});