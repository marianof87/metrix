/**
 * metrix · e2e/auth.spec.ts
 * Fase 5b — RED: flujo auth E2E
 * ESTE ARCHIVO DEBE FALLAR hasta que existan:
 *  - src/app/login/page.tsx + src/components/LoginForm.tsx
 *  - src/app/register/page.tsx + src/components/RegisterForm.tsx
 *  - src/components/AuthNav.tsx + integración en src/app/layout.tsx
 *  - src/middleware.ts (protección /historial)
 *
 * Flujo:
 *  1) /historial sin sesión → redirect /login
 *  2) /register crear usuario único → queda logueado (nav muestra email) → /historial carga
 *  3) logout → nav muestra /login → /historial redirige a /login
 *  4) /login con password mal → mensaje de error visible
 */
import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("auth: /historial sin sesión redirige a /login?next=/historial", async ({ page }) => {
  await page.goto("/historial");
  await expect(page).toHaveURL(/\/login\?next=%2Fhistorial/);
  await expect(page.getByRole("heading", { name: /iniciar sesión|login/i })).toBeVisible({ timeout: 5000 });
});

test("auth: /register crea usuario único, queda logueado y puede ver /historial", async ({ page }) => {
  const uniq = Date.now();
  const email = `f5-auth-e2e-${uniq}@metrix.test`;
  const password = "S3cur3P@ss!";

  await page.goto("/register");
  // Los forms deben exponer labels accesibles (recomendado: "Correo", "Contraseña", "Nombre")
  await page.getByLabel(/correo|email/i).fill(email);
  // name es opcional pero el form lo expone
  const nameInput = page.getByLabel(/nombre|name/i);
  if (await nameInput.count() > 0) await nameInput.fill("E2E User");
  await page.getByLabel(/contraseña|password/i).fill(password);
  await page.getByRole("button", { name: /crear cuenta|registrarse|register/i }).click();

  // Tras register exitoso: redirect a "/" o "/historial" y nav muestra email + botón logout
  await expect(page).toHaveURL(/\//, { timeout: 10000 });
  // AuthNav (server) debe mostrar email
  await expect(page.getByText(email)).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("button", { name: /cerrar sesión|logout|salir/i })).toBeVisible();
  // /historial ahora debe cargar sin redirect (middleware permite)
  await page.goto("/historial");
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /historial/i })).toBeVisible({ timeout: 5000 });
});

test("auth: logout limpia sesión — nav muestra /login y /historial vuelve a proteger", async ({ page }) => {
  // Precondición: usuario logueado (re-crea uno fresco para aislar)
  const uniq = Date.now();
  const email = `f5-auth-logout-${uniq}@metrix.test`;
  await page.goto("/register");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill("S3cur3P@ss!");
  const nameInput = page.getByLabel(/nombre|name/i);
  if (await nameInput.count() > 0) await nameInput.fill("Logout User");
  await page.getByRole("button", { name: /crear cuenta|registrarse|register/i }).click();
  await expect(page.getByText(email)).toBeVisible({ timeout: 5000 });

  // Logout: AuthNav expone form POST /api/v1/auth/logout (botón)
  await page.getByRole("button", { name: /cerrar sesión|logout|salir/i }).click();
  // Tras logout: puede redirigir a "/" pero nav ya no muestra email
  await expect(page.getByRole("link", { name: /iniciar sesión|login/i })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("link", { name: /registrarse|register/i })).toBeVisible();
  // /historial debe volver a redirigir
  await page.goto("/historial");
  await expect(page).toHaveURL(/\/login\?next=%2Fhistorial/);
});

test("auth: /login con password mal muestra error visible (no redirige)", async ({ page }) => {
  const uniq = Date.now();
  const email = `f5-auth-badlogin-${uniq}@metrix.test`;
  const pass = "Correct123!";
  // Crear usuario primero
  await page.goto("/register");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill(pass);
  await page.getByRole("button", { name: /crear cuenta|registrarse|register/i }).click();
  await expect(page.getByText(email)).toBeVisible({ timeout: 5000 });
  // Logout para probar login
  await page.getByRole("button", { name: /cerrar sesión|logout|salir/i }).click();
  await expect(page.getByRole("link", { name: /login/i })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña|password/i).fill("Wrong123!");
  await page.getByRole("button", { name: /iniciar sesión|login|entrar/i }).click();
  // Mensaje de error accesible: role="alert" o texto "credenciales inválidas"
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/credenciales inválidas|invalid credentials/i)).toBeVisible();
  // Sigue en /login, no logueado
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(email)).toHaveCount(0);
});