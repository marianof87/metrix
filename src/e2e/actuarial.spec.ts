/**
 * metrix · e2e/actuarial.spec.ts
 * E2E tests for the actuarial calculator module.
 *
 * Test 1 – Happy path: fill all required fields → result panel visible → save.
 * Test 2 – Edge case: annualRatePct = 100 → Zod rejects client-side → error shown, no result.
 */

import { test, expect } from "@playwright/test";

test.describe("Actuarial calculator", () => {
  test.describe.configure({ mode: "serial" });

  test("happy path: fill valid inputs, calculate, and save", async ({
    page,
  }) => {
    await page.goto("/actuarial");

    await page.getByLabel("Capital inicial").fill("800000");
    await page.getByLabel("Tasa nominal anual").fill("6");
    await page.getByLabel("Períodos por año").fill("12");
    await page.getByLabel("Años").fill("20");
    await page.getByLabel("Aporte por período (opcional)").fill("500");

    // Calculate and wait for the API response.
    const calcResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/actuarial") && r.status() === 200
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

  test("edge case: annualRatePct = 100 → Zod error, no result panel", async ({
    page,
  }) => {
    await page.goto("/actuarial");

    await page.getByLabel("Capital inicial").fill("10000");
    // 100 / 100 = 1.0 → fails .lt(1) → Zod rejects before API call.
    await page.getByLabel("Tasa nominal anual").fill("100");
    await page.getByLabel("Períodos por año").fill("12");
    await page.getByLabel("Años").fill("10");

    await page.getByRole("button", { name: "Calcular" }).click();

    // Zod error text rendered by CalculatorForm under the annual rate field.
    await expect(page.getByText("Number must be less than 1")).toBeVisible();

    // Result panel must NOT appear.
    await expect(page.locator("section[aria-label='Resultado']")).toHaveCount(0);
  });
});
