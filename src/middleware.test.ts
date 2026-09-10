/**
 * metrix · middleware.test.ts
 * Fase 5b — RED: middleware auth
 * ESTE ARCHIVO DEBE FALLAR hasta que exista src/middleware.ts
 * que exporte: middleware(request) + config.matcher + decideRoute(pathname, hasValidSession)
 *
 * Política:
 *  - /historial sin sesión → redirect /login?next=/historial
 *  - /historial con sesión → allowed
 *  - /login con sesión → redirect /
 *  - /register con sesión → redirect /
 *  - /login sin sesión → allowed
 *  - /register sin sesión → allowed
 *  - ruta no matcheada (/pricing) → allowed (con o sin sesión)
 *  - integración middleware(request) con cookie válida → next() sin redirect
 *    y sin cookie → redirect
 */
import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
// f5b: EXISTE EN RED — módulo aún no implementado
import { decideRoute, middleware, config } from "@/middleware";
// existente — para generar cookie válida en test de integración
import { signJwt } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth.config";

describe("middleware — decideRoute (pura, sin HTTP)", () => {
  it("config.matcher cubre /historial, /login y /register", () => {
    expect(config.matcher).toEqual(expect.arrayContaining(["/historial", "/login", "/register"]));
  });

  it("/historial sin sesión → redirect /login?next=/historial", () => {
    expect(decideRoute("/historial", false)).toEqual({ redirectTo: "/login?next=/historial" });
  });

  it("/historial con sesión válida → allowed", () => {
    expect(decideRoute("/historial", true)).toBe("allowed");
  });

  it("/login con sesión → redirect /", () => {
    expect(decideRoute("/login", true)).toEqual({ redirectTo: "/" });
  });

  it("/register con sesión → redirect /", () => {
    expect(decideRoute("/register", true)).toEqual({ redirectTo: "/" });
  });

  it("/login sin sesión → allowed", () => {
    expect(decideRoute("/login", false)).toBe("allowed");
  });

  it("/register sin sesión → allowed", () => {
    expect(decideRoute("/register", false)).toBe("allowed");
  });

  it("ruta no matcheada (/pricing) → allowed sin importar sesión", () => {
    expect(decideRoute("/pricing", false)).toBe("allowed");
    expect(decideRoute("/pricing", true)).toBe("allowed");
    expect(decideRoute("/", false)).toBe("allowed");
    expect(decideRoute("/api/v1/auth/me", true)).toBe("allowed");
  });
});

describe("middleware(request) — integración mínima (edge, jose)", () => {
  it("request a /historial con cookie válida (signJwt) → next() sin redirect", async () => {
    const token = await signJwt({ userId: "u-123", email: "ana@metrix.test" });
    const req = new NextRequest("http://localhost/historial", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    const res = await middleware(req as any);
    // NextResponse.next() no es redirect; implementación puede retornar NextResponse.next()
    // Chequeamos que NO sea redirect (status 307/308 o Location)
    const isRedirect = res instanceof NextResponse && [307, 308, 302, 301].includes(res.status);
    const location = res.headers.get("location") ?? res.headers.get("Location");
    expect(isRedirect && location?.includes("/login")).toBe(false);
  });

  it("request a /historial sin cookie → redirect a /login?next=/historial", async () => {
    const req = new NextRequest("http://localhost/historial");
    const res = await middleware(req as any);
    expect([307, 308, 302, 301]).toContain(res.status);
    const loc = res.headers.get("location") ?? res.headers.get("Location") ?? "";
    expect(loc).toContain("/login");
    expect(loc).toContain("next=%2Fhistorial");
  });
});