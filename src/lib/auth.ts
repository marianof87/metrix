/**
 * metrix · lib/auth.ts
 * Autenticación manual (sin NextAuth): JWT HS256 firmado con `jose` + cookie de sesión.
 * Fase 5a — T2. Contrato:
 *   - signJwt(payload) → JWT 3 partes, exp 7d
 *   - verifyJwt(token) → { userId, email, exp } | null (nunca lanza)
 *   - getAuthSession(Request) → { userId, email } | null (lee cookie "metrix-session")
 *   - setSessionCookie / clearSessionCookie mutan el NextResponse
 */

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import { AUTH_SECRET, JWT_EXPIRES_IN_SECONDS, SESSION_COOKIE_NAME } from "./auth.config";

export interface SessionPayload {
  userId: string;
  email: string;
}

export interface VerifiedJwtPayload extends SessionPayload {
  /** exp en segundos (epoch) — incluida para tests/consumidores que la necesiten. */
  exp?: number;
}

const secretKey = new TextEncoder().encode(AUTH_SECRET);
const ALG = "HS256";

/**
 * Firma un JWT HS256 con payload { userId, email } y expiración JWT_EXPIRES_IN_SECONDS (7d).
 */
export async function signJwt(payload: SessionPayload): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return new SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + JWT_EXPIRES_IN_SECONDS)
    .sign(secretKey);
}

/**
 * Verifica un JWT. Devuelve el payload { userId, email, exp } o null.
 * Nunca lanza: token malformado, firma inválida, otro secret o expirado → null.
 */
export async function verifyJwt(token: string): Promise<VerifiedJwtPayload | null> {
  if (typeof token !== "string" || token.length === 0 || token.split(".").length !== 3) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALG] });
    const { userId, email } = payload as { userId?: unknown; email?: unknown };
    if (typeof userId !== "string" || userId.length === 0) return null;
    if (typeof email !== "string" || email.length === 0) return null;
    const result: VerifiedJwtPayload = { userId, email };
    if (typeof payload.exp === "number") result.exp = payload.exp;
    return result;
  } catch {
    return null;
  }
}

/**
 * Lee la cookie "metrix-session" del header Cookie del Request y devuelve la
 * sesión { userId, email } si el JWT es válido; si no, null.
 * Ignora cualquier otra cookie.
 */
export async function getAuthSession(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const token = parseCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  if (!token) return null;

  const verified = await verifyJwt(token);
  if (!verified) return null;

  return { userId: verified.userId, email: verified.email };
}

/**
 * Pone la cookie de sesión en el response: HttpOnly; Path=/; SameSite=Lax.
 * Secure solo en producción (MINOR-1: en dev/Playwright http local no se emite).
 * La expiración queda a cargo del JWT (7d); la cookie se emite con el mismo
 * maxAge para persistencia en el navegador.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    // Usamos "strict" para asegurar que la cookie se envíe en TODAS las navegaciones
    // del mismo sitio, lo cual es crítico para que el middleware reconozca la sesión
    // al navegar desde "/" a "/historial" en el flujo E2E. "lax" solo envía la cookie
    // en navegaciones top-level con mismo origen, lo cual a veces falla en contextos de test.
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: JWT_EXPIRES_IN_SECONDS,
  });
}

/**
 * Expira la cookie de sesión (Max-Age=0 / Expires pasada).
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

/**
 * Parser mínimo de header Cookie: extrae el valor de una cookie por nombre.
 * Soporta valores con '=' interno (toma el primer '=' como separador).
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
  const wanted = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(wanted)) {
      return trimmed.slice(wanted.length);
    }
  }
  return null;
}