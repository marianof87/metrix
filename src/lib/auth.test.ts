/**
 * metrix · lib/auth.test.ts
 * Fase 5a — T2 RED: Auth lib (JWT HS256 7d + cookies)
 * ESTE ARCHIVO DEBE FALLAR hasta que existan src/lib/auth.ts y src/lib/auth.config.ts
 * Import error = RED legítimo (módulos aún no existen).
 *
 * Requisitos funcionales:
 * - cookie name "metrix-session" (D4)
 * - JWT HS256, exp 7d, payload { userId, email }
 * - signJwt → string ; verifyJwt(ok)→payload ; verifyJwt(expired)→null ; verifyJwt(otherSecret)→null
 * - getAuthSession(Request)→ {userId,email}|null leyendo Cookie header
 * - setSessionCookie(NextResponse, token) → Set-Cookie con Path=/; HttpOnly; SameSite=Lax
 * - clearSessionCookie(NextResponse) → Max-Age=0 o expires pasada
 * - determinista, sin red ni BD
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { signJwt, verifyJwt, getAuthSession, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { AUTH_SECRET } from "@/lib/auth.config";

const COOKIE_NAME = "metrix-session";

describe("lib/auth — contrato Fase 5a T2", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("AUTH_SECRET y constantes", () => {
    it("AUTH_SECRET está definido y es string no vacío", () => {
      expect(AUTH_SECRET).toBeDefined();
      expect(typeof AUTH_SECRET).toBe("string");
      expect(AUTH_SECRET.length).toBeGreaterThan(0);
    });

    it("cookie name es metrix-session (D4) — setSessionCookie lo usa", () => {
      const res = NextResponse.json({ ok: true });
      setSessionCookie(res as any, "dummy-token");
      const setCookie = (res.headers.get("set-cookie") ?? "") as string;
      // NextResponse puede usar getSetCookie() en runtime edge; soportamos ambos
      const allCookies: string = typeof (res.headers as any).getSetCookie === "function"
        ? (res.headers as any).getSetCookie().join("; ")
        : setCookie;
      expect(allCookies).toContain(`${COOKIE_NAME}=dummy-token`);
    });
  });

  describe("signJwt / verifyJwt — HS256 7d", () => {
    it("signJwt genera string JWT con 3 partes y verifyJwt devuelve payload { userId, email }", async () => {
      const payload = { userId: "u-123", email: "ana@metrix.test" };
      const token = await signJwt(payload);
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const verified = await verifyJwt(token);
      expect(verified).not.toBeNull();
      expect(verified).toMatchObject(payload);
    });

    it("verifyJwt verifica expiración 7d: token expirado → null (via fake timers)", async () => {
      // Congelamos tiempo en T0, firmamos, avanzamos 8 días (>7d) y verificamos
      const t0 = new Date("2026-01-01T00:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(t0);

      const token = await signJwt({ userId: "u-exp", email: "exp@metrix.test" });

      // Avanzar 8 días
      const t8 = new Date(t0.getTime() + 8 * 24 * 60 * 60 * 1000);
      vi.setSystemTime(t8);

      const expired = await verifyJwt(token);
      expect(expired).toBeNull();

      vi.useRealTimers();
    });

    it("verifyJwt estima exp ≈ 7d sin avanzar reloj (tolerancia ±60s)", async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await signJwt({ userId: "u-7d", email: "seven@metrix.test" });
      const payload: any = await verifyJwt(token);
      expect(payload).not.toBeNull();
      // decodificar exp sin verificar firma (solo para assert de duración)
      const [, b64] = token.split(".");
      const body = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
      const exp: number = body.exp;
      const expected = before + 7 * 24 * 60 * 60;
      expect(Math.abs(exp - expected)).toBeLessThan(90); // 60s + margen ejecución
      expect(payload.exp).toBe(exp);
    });

    it("verifyJwt con token firmado con OTRO secret → null", async () => {
      const token = await signJwt({ userId: "u-other", email: "other@metrix.test" });
      // 1) token tampered (último char) → firma inválida → null
      const tampered = token.slice(0, -1) + (token.slice(-1) === "a" ? "b" : "a");
      expect(await verifyJwt(tampered)).toBeNull();

      // 2) token re-firmado con otro secret usando HMAC manual (equivale a otro AUTH_SECRET)
      const [headerB64, payloadB64] = token.split(".");
      const otherSig = createHmac("sha256", "other-secret-not-auth-secret")
        .update(`${headerB64}.${payloadB64}`)
        .digest("base64url");
      const otherToken = `${headerB64}.${payloadB64}.${otherSig}`;
      expect(await verifyJwt(otherToken)).toBeNull();
    });

    it("verifyJwt con token malformado → null (no throw)", async () => {
      expect(await verifyJwt("not.a.jwt")).toBeNull();
      expect(await verifyJwt("")).toBeNull();
      expect(await verifyJwt("header.payload.")).toBeNull();
    });
  });

  describe("getAuthSession(Request) — lee cookie metrix-session", () => {
    it("con cookie válida → { userId, email }", async () => {
      const token = await signJwt({ userId: "u-sess", email: "sess@metrix.test" });
      const req = new Request("http://localhost/api", {
        headers: { cookie: `${COOKIE_NAME}=${token}` },
      });
      const session = await getAuthSession(req as any);
      expect(session).toEqual({ userId: "u-sess", email: "sess@metrix.test" });
    });

    it("sin cookie → null", async () => {
      const req = new Request("http://localhost/api");
      expect(await getAuthSession(req as any)).toBeNull();
    });

    it("con cookie malformada (JWT roto) → null", async () => {
      const req = new Request("http://localhost/api", {
        headers: { cookie: `${COOKIE_NAME}=not-a-jwt` },
      });
      expect(await getAuthSession(req as any)).toBeNull();
    });

    it("con cookie vacía → null", async () => {
      const req = new Request("http://localhost/api", {
        headers: { cookie: `${COOKIE_NAME}=` },
      });
      expect(await getAuthSession(req as any)).toBeNull();
    });

    it("ignora otras cookies y toma metrix-session", async () => {
      const token = await signJwt({ userId: "u-multi", email: "multi@metrix.test" });
      const req = new Request("http://localhost/api", {
        headers: { cookie: `other=xyz; ${COOKIE_NAME}=${token}; foo=bar` },
      });
      const session = await getAuthSession(req as any);
      expect(session).toEqual({ userId: "u-multi", email: "multi@metrix.test" });
    });
  });

  describe("setSessionCookie / clearSessionCookie — NextResponse", () => {
    it("setSessionCookie agrega Set-Cookie con metrix-session=<token>; Path=/; HttpOnly; SameSite=Lax", () => {
      const res = NextResponse.json({ ok: true });
      const token = "header.payload.sig";
      setSessionCookie(res as any, token);

      const header = res.headers.get("set-cookie") ?? "";
      const all = typeof (res.headers as any).getSetCookie === "function"
        ? (res.headers as any).getSetCookie().join("\n")
        : header;

      expect(all).toContain(`${COOKIE_NAME}=${token}`);
      expect(all).toContain("Path=/");
      expect(all).toMatch(/HttpOnly/i);
      expect(all).toMatch(/SameSite=Lax/i);
      // No debe expirar (sesión 7d manejada por JWT exp, no por cookie expiry inmediata)
      expect(all).not.toMatch(/Max-Age=0/i);
    });

    it("clearSessionCookie expira la cookie (Max-Age=0 o Expires pasada)", () => {
      const res = NextResponse.json({ ok: true });
      clearSessionCookie(res as any);

      const header = res.headers.get("set-cookie") ?? "";
      const all = typeof (res.headers as any).getSetCookie === "function"
        ? (res.headers as any).getSetCookie().join("\n")
        : header;

      expect(all).toContain(COOKIE_NAME);
      // Cualquiera de las dos estrategias de expiración es válida
      const hasMaxAge0 = /Max-Age=0/i.test(all);
      const hasExpired = /Expires=Thu, 01 Jan 1970/i.test(all) || /expires=.*1970/i.test(all);
      expect(hasMaxAge0 || hasExpired).toBe(true);
      expect(all).toMatch(/Path=\//i);
    });

    it("set + clear son idempotentes sobre el mismo response (no throw)", () => {
      const res = NextResponse.json({ ok: true });
      expect(() => setSessionCookie(res as any, "t1")).not.toThrow();
      expect(() => clearSessionCookie(res as any)).not.toThrow();
      expect(() => setSessionCookie(res as any, "t2")).not.toThrow();
    });
  });
});