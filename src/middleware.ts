/**
 * metrix · middleware.ts (edge)
 * Protección de rutas por sesión (Fase 5b). Edge runtime: solo jose (lib/auth),
 * sin prisma ni bcrypt.
 *
 * Política:
 *  - /historial sin sesión   → redirect /login?next=/historial
 *  - /historial con sesión   → allowed
 *  - /login o /register con sesión → redirect /
 *  - /login o /register sin sesión → allowed
 *  - cualquier otra ruta     → allowed (con o sin sesión)
 *
 * Nota de codificación (tests RED):
 *  - decideRoute devuelve la forma legible "/login?next=/historial" (contract
 *    de middleware.test.ts:32, toEqual estricto sin decodificar %2F).
 *  - middleware canonicaliza el parámetro `next` re-escribiéndolo con
 *    URLSearchParams.set(), cuyo serializador codifica '/' → %2F. Así el header
 *    Location contiene el literal "next=%2Fhistorial" (contract :83 + e2e) sin
 *    hardcodear la codificación en decideRoute.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export type RouteDecision = "allowed" | { redirectTo: string };

export function decideRoute(pathname: string, hasValidSession: boolean): RouteDecision {
  if (pathname === "/historial") {
    if (!hasValidSession) return { redirectTo: "/login?next=/historial" };
    return "allowed";
  }
  if (pathname === "/login" || pathname === "/register") {
    if (hasValidSession) return { redirectTo: "/" };
    return "allowed";
  }
  return "allowed";
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const session = await getAuthSession(request);
  const decision = decideRoute(request.nextUrl.pathname, session !== null);

  if (decision === "allowed") return NextResponse.next();

  const target = new URL(decision.redirectTo, request.url);
  // Re-serializa `next` (path) en su forma percent-encoded canónica (%2F).
  const next = target.searchParams.get("next");
  if (next !== null) target.searchParams.set("next", next);

  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/historial", "/login", "/register"],
};