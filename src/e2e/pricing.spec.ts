/**
 * metrix · e2e/pricing.spec.ts
 * E2E tests for the pricing calculator module.
 *
 * Test 1 – Happy path: fill valid cost + margin → result panel visible → save.
 * Test 2 – Edge case: desiredMarginPct = 150 → Zod rejects client-side → error shown, no result.
 */

import { test, expect } from "@playwright/test";

test.describe("Pricing calculator", () => {
  test.describe.configure({ mode: "serial" });

  test("happy path: fill valid inputs, calculate, and save", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // Use values distinct from historial.spec.ts to avoid hash collisions.
    await page.getByLabel("Costo base").fill("999999");
    await page.getByLabel("Margen deseado").fill("25");

    // Calculate and wait for the API response.
    const calcResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/pricing") && r.status() === 200
    );
    await page.getByRole("button", { name: "Calcular" }).click();
    await calcResponse;

    // Result panel must appear with at least one formatted value.
    const panel = page.locator("section[aria-label='Resultado']");
    await expect(panel).toBeVisible();
    await expect(panel.locator("dd").first()).not.toHaveText("");

    // Save the scenario.
    const saveResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/scenarios") && r.status() === 201
    );
    await page.getByRole("button", { name: "Guardar" }).click();
    await saveResponse;
    await expect(page.getByText("Escenario guardado")).toBeVisible();
  });

  test("edge case: desiredMarginPct = 150 → Zod error, no result panel", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // 150 / 100 = 1.5 → fails .lt(1) → Zod rejects before API call.
    await page.getByLabel("Costo base").fill("100");
    await page.getByLabel("Margen deseado").fill("150");

    await page.getByRole("button", { name: "Calcular" }).click();

    // Zod error text rendered by CalculatorForm under the margin field.
    await expect(page.getByText("Number must be less than 1")).toBeVisible();

    // Result panel must NOT appear.
    await expect(page.locator("section[aria-label='Resultado']")).toHaveCount(0);
  });
});
