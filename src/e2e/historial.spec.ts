/**
 * metrix · e2e/historial.spec.ts
 * CA6: flujo completo "Re-ejecutar desde Historial" desde la UI.
 *
 * Flujo:
 *   1. En la UI del módulo pricing → Guardar un escenario único.
 *   2. Ir a /historial → filtrar → encontrar el escenario por su shortHash.
 *   3. Ver detalle → auditoría (CREATE + SAVE) → Re-ejecutar.
 *   4. Verificar que aparece un NUEVO registro RE_RUN (mismo hash, id distinto).
 *   5. Dedupe: re-ejecutar de nuevo no duplica el RE_RUN (sigue siendo 1).
 *
 * El escenario se identifica por el SHA256 canónico (computeInputHash) para no
 * depender de IDs que desconocemos a priori.
 */

import { test, expect } from "@playwright/test";
import { computeInputHash } from "../scenarios/scenario.service";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  const uniq = Date.now();
  await page.goto("/register");
  await page.getByLabel(/correo|email/i).fill(`historial-user-${uniq}@metrix.test`);
  await page.getByLabel(/contraseña|password/i).fill("S3cur3P@ss!");
  await page.getByRole("button", { name: /crear cuenta|registrarse|register/i }).click();
  await expect(page).toHaveURL(/\//, { timeout: 10000 });
});

/** Valores únicos por corrida para no chocar con datos previos de la BD. */
const NOW = Date.now();
const BASE_COST = Math.floor(NOW / 1000);
const PRICING_INPUTS = {
  baseCost: BASE_COST,
  desiredMarginPct: 0.195, // 19.5 %
};

function shortHash(hash: string): string {
  return hash.length > 8 ? `${hash.slice(0, 8)}…` : hash;
}

test("historial: guardar → re-ejecutar → nuevo RE_RUN sin duplicar", async ({
  page,
}) => {
  // 1. Guardar el escenario desde la UI del módulo.
  await page.goto("/pricing");
  await page.getByLabel("Costo base").fill(String(PRICING_INPUTS.baseCost));
  await page.getByLabel("Margen deseado").fill("19.5");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Escenario guardado")).toBeVisible();

  // 2. Ir al historial y localizar el escenario por su hash.
  const hash = computeInputHash("pricing", PRICING_INPUTS);
  const expectedHashText = shortHash(hash);

  await page.goto("/historial");
  await expect(
    page.getByRole("status").filter({ hasText: "Cargando escenarios" })
  ).toHaveCount(0, { timeout: 5000 });
  await page.locator("ul[aria-label='Escenarios guardados'] li", {
    hasText: expectedHashText,
  }).waitFor();

  // 3. Abrir detalle y verificar auditoría CREATE + SAVE.
  const listItem = page
    .locator("ul[aria-label='Escenarios guardados'] li")
    .filter({ hasText: expectedHashText });
  await listItem.getByRole("button", { name: "Ver detalle" }).click();

  const detail = page.locator("section[aria-label^='Detalle del escenario']");
  await expect(detail.getByText("Auditoría")).toBeVisible();
  await expect(detail.getByText("CREATE", { exact: true })).toBeVisible();
  await expect(detail.getByText("SAVE", { exact: true })).toBeVisible();
  await expect(detail.getByText("DRAFT → SAVED", { exact: true })).toBeVisible();
  await expect(detail.getByText("Precios")).toBeVisible();

  // Re-ejecutar → mensaje de confirmación.
  await detail.getByRole("button", { name: "Re-ejecutar" }).click();
  await expect(
    detail.getByText("Re-ejecutado — nuevo registro RE_RUN creado")
  ).toBeVisible();

  // 4. El nuevo RE_RUN debe aparecer en la lista (mismo hash, estado RE_RUN).
  // El refresh de la lista conserva los filtros activos (todos) — usa los selects.
  await page.getByLabel("Estado").selectOption({ label: "RE_RUN" });
  const rerunItem = page
    .locator("ul[aria-label='Escenarios guardados'] li")
    .filter({ hasText: expectedHashText });
  await expect(rerunItem).toHaveCount(1, { timeout: 5000 });
  await expect(rerunItem.getByText("RE_RUN", { exact: true })).toBeVisible();
  await expect(rerunItem.getByText("Precios", { exact: true })).toBeVisible();

  // Verificar que el RE_RUN tiene id distinto al SAVED original:
  // abrir su detalle y ver acción de auditoría RE_RUN.
  await rerunItem.getByRole("button", { name: "Ver detalle" }).click();
  const rerunDetail = page.locator("section[aria-label^='Detalle del escenario']");
  // El h3 contiene la etiqueta del módulo + badge de estado RE_RUN.
  await expect(
    rerunDetail.locator("h3").getByText("RE_RUN", { exact: true })
  ).toBeVisible();
  // Solo un badge de auditoría RE_RUN (no el estado) debería existir en el ul.
  await expect(
    rerunDetail.locator("ul").getByText("RE_RUN", { exact: true })
  ).toHaveCount(1);

  // 5. Dedupe: re-ejecutar de nuevo el SAVED original no duplica el RE_RUN.
  // Volvemos al SAVED y re-ejecutamos; la lista RE_RUN sigue con 1 fila.
  await page.getByLabel("Estado").selectOption({ label: "SAVED" });
  const savedItem = page
    .locator("ul[aria-label='Escenarios guardados'] li")
    .filter({ hasText: expectedHashText });
  await expect(savedItem).toHaveCount(1);
  await savedItem.getByRole("button", { name: "Ver detalle" }).click();
  const savedDetail = page.locator("section[aria-label^='Detalle del escenario']");
  await savedDetail.getByRole("button", { name: "Re-ejecutar" }).click();
  await expect(
    savedDetail.getByText("Re-ejecutado — nuevo registro RE_RUN creado")
  ).toBeVisible();

  await page.getByLabel("Estado").selectOption({ label: "RE_RUN" });
  const rerunAfterDedupe = page
    .locator("ul[aria-label='Escenarios guardados'] li")
    .filter({ hasText: expectedHashText });
  await expect(rerunAfterDedupe).toHaveCount(1, { timeout: 5000 });
});

test("dedupe desde la UI: guardar el mismo input dos veces no duplica", async ({
  page,
}) => {
  const dedupeCost = BASE_COST + 5;
  const inputs = { baseCost: dedupeCost, desiredMarginPct: 0.1 };
  const hash = shortHash(computeInputHash("pricing", inputs));

  await page.goto("/pricing");
  await page.getByLabel("Costo base").fill(String(dedupeCost));
  await page.getByLabel("Margen deseado").fill("10");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Escenario guardado")).toBeVisible();

  // Guardar de nuevo con los mismos valores (misma sesión, misma página).
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Escenario guardado")).toBeVisible();

  await page.goto("/historial");
  await page.getByLabel("Estado").selectOption({ label: "SAVED" });
  const items = page
    .locator("ul[aria-label='Escenarios guardados'] li")
    .filter({ hasText: hash });
  await expect(items).toHaveCount(1, { timeout: 5000 });
});