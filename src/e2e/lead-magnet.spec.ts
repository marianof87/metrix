/**
 * metrix · e2e/lead-magnet.spec.ts
 * E2E del lead magnet: simulador de precios, curva de ganancia y captura de lead.
 *
 * Flujo:
 *   1. Cargar /lead-magnet → hero visible.
 *   2. Calcular escenario con los defaults → métricas, estrategia y canvas.
 *   3. Descargar informe → modal → completar lead → mensaje de éxito.
 */

import { test, expect } from "@playwright/test";

test.describe("Lead magnet", () => {
  test.describe.configure({ mode: "serial" });

  test("flujo completo: simular escenario y registrar lead", async ({ page }) => {
    await page.goto("/lead-magnet");

    // Hero.
    await expect(
      page.getByRole("heading", {
        name: "Descubrí el precio óptimo de tu producto",
      })
    ).toBeVisible();

    // Sin resultado inicialmente.
    await expect(page.getByTestId("lm-empty")).toBeVisible();

    // Calcular escenario con los defaults (-2, 120, -1000, 10, 100).
    const calcResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/lead-magnet") && r.status() === 200
    );
    await page.getByTestId("lm-calc").click();
    await calcResponse;

    await expect(page.getByTestId("lm-empty")).toHaveCount(0);
    await expect(page.getByText("Precio óptimo sugerido")).toBeVisible();
    await expect(page.getByText("$ 30")).toBeVisible();
    await expect(page.getByText("$ 800")).toBeVisible();
    await expect(
      page.getByText("Mantener el precio en el punto de equilibrio óptimo.")
    ).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();

    // Descargar informe → modal.
    await page.getByTestId("lm-download").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Descargá tu informe personalizado")).toBeVisible();

    // Completar el lead y enviar.
    await page.getByTestId("lead-nombre").fill("Ana Pérez");
    await page.getByTestId("lead-empresa").fill("Textil Sur");
    await page.getByTestId("lead-whatsapp").fill("+5493515551234");
    await page.getByTestId("lead-email").fill("ana@e2e.com");

    const leadsResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/leads") && r.status() === 201
    );
    const downloadPromise = page
      .waitForEvent("download", { timeout: 10000 })
      .catch(() => null);
    await page.getByTestId("leads-submit").click();
    await leadsResponse;

    // El PDF se genera y descarga; el mensaje de éxito debe aparecer.
    await downloadPromise;
    await expect(page.getByTestId("lm-success")).toContainText("Informe generado", {
      timeout: 15000,
    });
  });
});