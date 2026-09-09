/**
 * metrix · e2e/lead-magnet.spec.ts
 * E2E del lead magnet — Fase 4 RED (contrato honesto Outcome + curva técnica).
 * Flujo demo-scene (≤4 pasos): hero → calcular → métricas honestas + canvas → descargar → lead → éxito.
 */

import { test, expect } from "@playwright/test";

test.describe("Lead magnet — contrato honesto", () => {
  test.describe.configure({ mode: "serial" });

  test("flujo completo: simular escenario honesto, visualizar curva y registrar lead", async ({ page }) => {
    await page.goto("/lead-magnet");

    // 1. Hero
    await expect(page.getByRole("heading", { name: "Descubrí el precio óptimo de tu producto" })).toBeVisible();
    await expect(page.getByTestId("lm-empty")).toBeVisible();

    // 2. Calcular con defaults (-2, 120, -1000, 10, 100, costPerUnit 5) → 200 honesto
    const calcResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/lead-magnet") && r.request().method() === "POST"
    );
    await page.getByTestId("lm-calc").click();
    const calcRes = await calcResponse;
    expect(calcRes.status()).toBe(200);
    const calcJson = await calcRes.json();
    expect(calcJson.formulaVersion).toBe("lead-magnet-v1");
    expect(Array.isArray(calcJson.outcomes)).toBe(true);
    expect(calcJson.outcomes).toHaveLength(1);
    expect(Array.isArray(calcJson.curva)).toBe(true);

    // Métricas honestas en pantalla (OBJ-2)
    await expect(page.getByTestId("lm-empty")).toHaveCount(0);
    await expect(page.getByTestId("lm-range")).toBeVisible();
    await expect(page.getByTestId("lm-range")).toContainText(/27/);
    await expect(page.getByTestId("lm-range")).toContainText(/33/);
    await expect(page.getByTestId("lm-action")).toContainText(/fijar precio de lanzamiento en 30/i);
    await expect(page.getByTestId("lm-driver")).toContainText(/curvatura de la demanda/i);
    await expect(page.getByTestId("lm-confidence")).toContainText(/media|baja/i);
    await expect(page.getByTestId("lm-access")).toContainText(/contact-gated/i);
    // No números sueltos prohibidos
    await expect(page.getByText("$ 30")).toHaveCount(0);
    await expect(page.getByText("$ 800")).toHaveCount(0);
    await expect(page.getByText("Mantener el precio en el punto de equilibrio óptimo.")).toHaveCount(0);
    await expect(page.locator("canvas")).toBeVisible();

    // 3. Descargar informe → modal
    await page.getByTestId("lm-download").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Descargá tu informe personalizado")).toBeVisible();

    // 4. Completar lead → 201 + download + lm-success
    await page.getByTestId("lead-nombre").fill("Ana Pérez");
    await page.getByTestId("lead-empresa").fill("Textil Sur");
    await page.getByTestId("lead-whatsapp").fill("+5493515551234");
    await page.getByTestId("lead-email").fill("ana@e2e.com");

    const leadsResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/leads") && r.status() === 201
    );
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
    await page.getByTestId("leads-submit").click();
    await leadsResponse;
    await downloadPromise;
    await expect(page.getByTestId("lm-success")).toContainText("Informe generado", { timeout: 15000 });
  });
});