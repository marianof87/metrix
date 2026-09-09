/**
 * metrix · lib/auth.config.ts
 * Configuración central de autenticación (Fase 5a — T2).
 * JWT HS256, cookie de sesión "metrix-session", expiración 7 días.
 */

export const SESSION_COOKIE_NAME = "metrix-session";
export const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 días

/**
 * Secret HMAC para firmar/verificar JWTs (HS256).
 * - En producción DEBE venir de process.env.AUTH_SECRET (string largo y aleatorio).
 * - En dev, si falta, se usa un fallback explícito (determinista para tests locales).
 * - En producción NO hay fallback: falla con error claro en lugar de operar inseguro.
 */
const DEV_FALLBACK_SECRET = "metrix-dev-only-secret-please-set-AUTH_SECRET-0123456789abcdef";

export const AUTH_SECRET: string = (() => {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is required in production. Set a long random string in your environment."
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    "[auth.config] AUTH_SECRET no está definido; usando fallback de desarrollo. " +
      "Configúralo en .env antes de producción."
  );
  return DEV_FALLBACK_SECRET;
})();