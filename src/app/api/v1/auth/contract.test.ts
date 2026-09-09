/**
 * metrix · api auth contract tests (integration, BD real)
 * CA 5b: registra, loguea, desloguea y verifica sesión via cookies JWT.
 * Patrón idéntico a src/app/api/v1/scenarios/scenarios.contract.test.ts
 * - BD SQLite real prisma/dev.db (DATABASE_URL=file:./prisma/dev.db)
 * - fileParallelism:false (ver vitest.config.ts) — no correr en paralelo
 * - datos únicos prefijo "f5-auth-" + cleanup deleteMany por email startsWith
 * - Set-Cookie inspection via res.headers.get("set-cookie") || getSetCookie()
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { SignJWT } from "jose";
// f5b: EXISTE EN RED — rutas aún no implementadas (siguiente fase BUILD)
import { POST as registerPost } from "@/app/api/v1/auth/register/route";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as logoutPost } from "@/app/api/v1/auth/logout/route";
import { GET as meGet } from "@/app/api/v1/auth/me/route";
// f5b: EXISTE EN RED — helpers ya existentes pero rutas usan validation nueva
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth.config";

const PREFIX = "f5-auth-";

function getSetCookie(res: Response): string {
  const h = res.headers.get("set-cookie") ?? "";
  // NextResponse en node usa getSetCookie()
  const all = typeof (res.headers as any).getSetCookie === "function"
    ? (res.headers as any).getSetCookie().join("\n")
    : h;
  return all;
}

async function callRegister(body: unknown) {
  return registerPost(
    new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as any
  );
}
async function callLogin(body: unknown) {
  return loginPost(
    new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as any
  );
}
async function callLogout(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  return logoutPost(new Request("http://localhost/api/v1/auth/logout", { method: "POST", headers }) as any);
}
async function callMe(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  return meGet(new Request("http://localhost/api/v1/auth/me", { headers }) as any);
}

function extractCookie(res: Response): string | null {
  const all = getSetCookie(res);
  // extrae "metrix-session=...." hasta ';'
  const m = all.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;\\n]+)`));
  return m ? `${SESSION_COOKIE_NAME}=${m[1]}` : null;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
});

describe("api/v1/auth — contract (BD real)", () => {
  // Limpieza fina por test para no contaminar entre 401/409
  beforeEach(async () => {
    // no-op: los emails son únicos por test con Date.now()
  });

  describe("POST /register", () => {
    it("201 {user:{id,email,name}} + Set-Cookie metrix-session, sin passwordHash", async () => {
      const email = `${PREFIX}reg-ok-${Date.now()}@metrix.test`;
      const res = await callRegister({ email, name: "Ana", password: "S3cur3P@ss!" });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.id).toBeDefined();
      expect(data.user.email).toBe(email);
      expect(data.user.name).toBe("Ana");
      expect((data.user as any).passwordHash).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain("S3cur3P@ss!");
      const cookie = getSetCookie(res);
      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(cookie).toMatch(/Path=\//i);
      expect(cookie).toMatch(/HttpOnly/i);
      // persistencia real: hash en BD ≠ plaintext
      const stored = await prisma.user.findUnique({ where: { email } });
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toBe("S3cur3P@ss!");
    });

    it("400 email inválido (Zod)", async () => {
      const res = await callRegister({ email: "not-an-email", password: "S3cur3P@ss!" });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("400 password corta (<8) (Zod)", async () => {
      const res = await callRegister({ email: `${PREFIX}short-${Date.now()}@metrix.test`, password: "short" });
      expect(res.status).toBe(400);
    });

    it("409 email duplicado → {error} sin Set-Cookie de sesión nueva", async () => {
      const email = `${PREFIX}dup-${Date.now()}@metrix.test`;
      const first = await callRegister({ email, password: "S3cur3P@ss!" });
      expect(first.status).toBe(201);
      const second = await callRegister({ email, password: "OtherPass123!" });
      expect(second.status).toBe(409);
      const data = await second.json();
      expect(data.error).toMatch(/existe|duplicado|already|conflict/i);
    });
  });

  describe("POST /login", () => {
    it("200 {user} + Set-Cookie tras register", async () => {
      const email = `${PREFIX}login-ok-${Date.now()}@metrix.test`;
      const pass = "MySecret123!";
      await callRegister({ email, password: pass });
      const res = await callLogin({ email, password: pass });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe(email);
      expect((data.user as any).passwordHash).toBeUndefined();
      expect(getSetCookie(res)).toContain(`${SESSION_COOKIE_NAME}=`);
    });

    it("401 password incorrecta → {error} genérico", async () => {
      const email = `${PREFIX}login-badpass-${Date.now()}@metrix.test`;
      await callRegister({ email, password: "Correct123!" });
      const res = await callLogin({ email, password: "Wrong123!" });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/credenciales inválidas|invalid credentials/i);
    });

    it("401 email inexistente → 401 con MISMO mensaje genérico (no enumera)", async () => {
      const emailExist = `${PREFIX}login-exist-${Date.now()}@metrix.test`;
      await callRegister({ email: emailExist, password: "Correct123!" });
      const badPassRes = await callLogin({ email: emailExist, password: "Wrong123!" });
      const noUserRes = await callLogin({ email: `${PREFIX}noexist-${Date.now()}@metrix.test`, password: "Wrong123!" });
      expect(badPassRes.status).toBe(401);
      expect(noUserRes.status).toBe(401);
      const badData = await badPassRes.json();
      const noData = await noUserRes.json();
      expect(badData.error).toBe(noData.error); // ★ anti-enumeración
    });
  });

  describe("POST /logout", () => {
    it("200 + Set-Cookie expirada (Max-Age=0) + Location '/'", async () => {
      const email = `${PREFIX}logout-${Date.now()}@metrix.test`;
      const reg = await callRegister({ email, password: "S3cur3P@ss!" });
      const cookie = extractCookie(reg)!;
      expect(cookie).not.toBeNull();
      const res = await callLogout(cookie);
      expect(res.status).toBe(200);
      const sc = getSetCookie(res);
      expect(sc).toContain(SESSION_COOKIE_NAME);
      expect(/Max-Age=0/i.test(sc) || /Expires=Thu, 01 Jan 1970/i.test(sc)).toBe(true);
      // contrato especifica header Location "/"
      expect(res.headers.get("location") ?? res.headers.get("Location")).toMatch(/\//);
    });
  });

  describe("GET /me", () => {
    it("200 {user} con sesión válida (tras login)", async () => {
      const email = `${PREFIX}me-ok-${Date.now()}@metrix.test`;
      const reg = await callRegister({ email, name: "Me", password: "S3cur3P@ss!" });
      const cookie = extractCookie(reg)!;
      const res = await callMe(cookie);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe(email);
      expect((data.user as any).passwordHash).toBeUndefined();
    });

    it("401 sin cookie", async () => {
      const res = await callMe();
      expect(res.status).toBe(401);
    });

    it("401 con cookie basura 'not-a-jwt…'", async () => {
      const res = await callMe(`${SESSION_COOKIE_NAME}=not-a-jwt-value`);
      expect(res.status).toBe(401);
    });

    it("401 con JWT válido firmado con OTRO secret (jose directo)", async () => {
      // firma con secret distinto al AUTH_SECRET que usa @/lib/auth
      const otherSecret = new TextEncoder().encode("other-secret-not-auth-secret-32chars-long-xyz");
      const otherToken = await new SignJWT({ userId: "u-other", email: `${PREFIX}other@metrix.test` })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(otherSecret);
      const res = await callMe(`${SESSION_COOKIE_NAME}=${otherToken}`);
      expect(res.status).toBe(401);
    });

    it("401 con JWT válido pero usuario inexistente en BD (sesión huérfana)", async () => {
      // usa el secret real (signJwt) pero con userId que no existe
      const token = await signJwt({ userId: "00000000-0000-0000-0000-000000000000", email: `${PREFIX}ghost@metrix.test` });
      const res = await callMe(`${SESSION_COOKIE_NAME}=${token}`);
      expect(res.status).toBe(401);
    });
  });
});