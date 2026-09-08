/**
 * metrix · e2e/roi.spec.ts
 * E2E tests for the ROI calculator module.
 *
 * Test 1 – Happy path: fill investment + final value → result panel visible → save.
 * Test 2 – Edge case: periods = -5 → Zod rejects client-side → error shown, no result.
 */

import { test, expect } from "@playwright/test";

test.describe("ROI calculator", () => {
  test.describe.configure({ mode: "serial" });

  test("happy path: fill valid inputs, calculate, and save", async ({
    page,
  }) => {
    await page.goto("/roi");

    await page.getByLabel("Inversión inicial").fill("500000");
    await page.getByLabel("Valor final (opcional)").fill("750000");
    await page.getByLabel("Períodos (opcional)").fill("5");

    // Calculate and wait for the API response.
    const calcResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/roi") && r.status() === 200
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

  test("edge case: periods = -5 → Zod error, no result panel", async ({
    page,
  }) => {
    await page.goto("/roi");

    await page.getByLabel("Inversión inicial").fill("10000");
    // periods must be a positive integer; -5 fails .positive()
    await page.getByLabel("Períodos (opcional)").fill("-5");

    await page.getByRole("button", { name: "Calcular" }).click();

    // Zod error text rendered by CalculatorForm.
    await expect(
      page.getByText("Number must be greater than 0")
    ).toBeVisible();

    // Result panel must NOT appear.
    await expect(page.locator("section[aria-label='Resultado']")).toHaveCount(0);
  });
});
