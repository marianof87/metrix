/**
 * metrix · e2e/quadratic.spec.ts
 * E2E tests for the quadratic calculator module.
 *
 * Test 1 – Happy path: fill valid coefficients → result panel visible → save.
 * Test 2 – Edge case: a = 0 → API rejects it → alert shown, no result panel.
 */

import { test, expect } from "@playwright/test";

test.describe("Quadratic calculator", () => {
  test.describe.configure({ mode: "serial" });

  test("happy path: fill valid coefficients, calculate, and save", async ({
    page,
  }) => {
    await page.goto("/quadratic");

    // Fill the three required coefficients with distinct coprime values.
    await page.getByLabel("Coeficiente a").fill("777");
    await page.getByLabel("Coeficiente b").fill("-3333");
    await page.getByLabel("Coeficiente c").fill("5555");

    // Calculate and wait for the API response.
    const calcResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/quadratic") && r.status() === 200
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

  test("edge case: a = 0 is rejected by API → alert shown, no result panel", async ({
    page,
  }) => {
    await page.goto("/quadratic");

    // a = 0 passes Zod client-side (0 is finite) but the API rejects it.
    await page.getByLabel("Coeficiente a").fill("0");
    await page.getByLabel("Coeficiente b").fill("4");
    await page.getByLabel("Coeficiente c").fill("5");

    // Calculate — the API returns an error response.
    await page.getByRole("button", { name: "Calcular" }).click();

    // Error alert is displayed.
    await expect(page.getByRole("alert")).toBeVisible();

    // Result panel must NOT appear.
    await expect(page.locator("section[aria-label='Resultado']")).toHaveCount(0);
  });

  test("gráfico cartesiano en vivo: escribir coeficientes muestra el gráfico", async ({
    page,
  }) => {
    await page.goto("/quadratic");

    // Sin coeficientes → placeholder del gráfico.
    await expect(page.getByTestId("quadratic-chart-empty")).toBeVisible();

    // Escribir a=1, b=-4, c=4 → el gráfico reemplaza el placeholder.
    await page.getByLabel("Coeficiente a").fill("1");
    await page.getByLabel("Coeficiente b").fill("-4");
    await page.getByLabel("Coeficiente c").fill("4");

    await expect(page.getByTestId("quadratic-chart-empty")).toHaveCount(0);
    await expect(page.getByTestId("quadratic-chart")).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
  });
});
