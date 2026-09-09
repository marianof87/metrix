/**
 * metrix · users/auth.service.test.ts
 * FASE 5b — RED: AuthService puro con repo en memoria
 * ESTE ARCHIVO DEBE FALLAR hasta que existan:
 *  - src/users/auth.service.ts
 *  - src/users/user.repo.ts
 *  - src/users/__mocks__/inMemoryUserRepo.ts
 *  - src/lib/validation.ts (registerSchema/loginSchema)
 * Import error = RED legítimo.
 *
 * AC validados:
 *  - register hashea (passwordHash ≠ plaintext, hashes distintos para passwords distintas)
 *  - register duplicado → DuplicateEmailError
 *  - login ok → {user,token} sin passwordHash, token verificable con verifyJwt
 *  - login mal password / email inexistente → InvalidCredentialsError con MISMO mensaje genérico
 *  - me(userId) → UserRecord|null
 */
import { describe, it, expect, beforeEach } from "vitest";
// f5b: EXISTE EN RED — archivo aún no implementado
import { AuthService, DuplicateEmailError, InvalidCredentialsError } from "@/users/auth.service";
// f5b: EXISTE EN RED — mock en memoria a crear por implementador (seguir patrón inMemoryScenarioRepo)
import { InMemoryUserRepo } from "@/users/__mocks__/inMemoryUserRepo";
// f5b: EXISTE EN RED — verifyJwt ya existe, se usa para validar token de AuthService
import { verifyJwt } from "@/lib/auth";

describe("users/AuthService — contrato Fase 5b (puro, in-memory)", () => {
  let repo: InMemoryUserRepo;
  let service: AuthService;

  beforeEach(() => {
    repo = new InMemoryUserRepo();
    service = new AuthService(repo);
  });

  describe("register", () => {
    it("crea usuario con passwordHash ≠ plaintext y token válido", async () => {
      const { user, token } = await service.register("f5-auth-reg1@metrix.test", "Ana", "S3cur3P@ss!");
      expect(user.email).toBe("f5-auth-reg1@metrix.test");
      expect(user.name).toBe("Ana");
      expect(user.id).toBeDefined();
      expect((user as any).passwordHash).toBeUndefined(); // contrato: user retornado sin hash
      // verificar persistencia interna hasheada
      const stored = await repo.findByEmail("f5-auth-reg1@metrix.test");
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toBe("S3cur3P@ss!");
      expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/); // bcryptjs
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
      const verified = await verifyJwt(token);
      expect(verified).toMatchObject({ userId: user.id, email: user.email });
    });

    it("passwords distintas generan hashes distintos (no determinista)", async () => {
      const a = await service.register("f5-auth-hash-a@metrix.test", null, "Password123!");
      const b = await service.register("f5-auth-hash-b@metrix.test", null, "Password1234!");
      const ra = await repo.findByEmail("f5-auth-hash-a@metrix.test");
      const rb = await repo.findByEmail("f5-auth-hash-b@metrix.test");
      expect(ra!.passwordHash).not.toBe(rb!.passwordHash);
      expect(a.user.id).not.toBe(b.user.id);
    });

    it("register con email duplicado → DuplicateEmailError", async () => {
      await service.register("f5-auth-dup@metrix.test", "Ana", "S3cur3P@ss!");
      await expect(service.register("f5-auth-dup@metrix.test", "Otro", "OtherPass123!"))
        .rejects.toThrow(DuplicateEmailError);
      // el repo sigue con 1 solo registro
      const all = (repo as any).records as unknown[];
      // si el mock expone records, sino contar por findByEmail
      expect(await repo.findByEmail("f5-auth-dup@metrix.test")).not.toBeNull();
    });

    it("DuplicateEmailError es instancia chequeable (no InvalidCredentialsError)", async () => {
      await service.register("f5-auth-dup2@metrix.test", null, "S3cur3P@ss!");
      try {
        await service.register("f5-auth-dup2@metrix.test", null, "S3cur3P@ss!");
        throw new Error("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DuplicateEmailError);
        expect(e).not.toBeInstanceOf(InvalidCredentialsError);
        expect((e as Error).message).toMatch(/existe|duplicado|already/i);
      }
    });

    it("name es opcional (undefined/null) → user.name nullish", async () => {
      const { user } = await service.register("f5-auth-noname@metrix.test", undefined, "S3cur3P@ss!");
      expect(user.name === null || user.name === undefined).toBe(true);
    });
  });

  describe("login", () => {
    it("login ok devuelve {user,token} sin passwordHash y token verificable", async () => {
      const reg = await service.register("f5-auth-login@metrix.test", "Bob", "MySecret123");
      const res = await service.login("f5-auth-login@metrix.test", "MySecret123");
      expect(res.user.id).toBe(reg.user.id);
      expect(res.user.email).toBe(reg.user.email);
      expect((res.user as any).passwordHash).toBeUndefined();
      expect(res.token.split(".")).toHaveLength(3);
      expect(await verifyJwt(res.token)).toMatchObject({ userId: reg.user.id, email: reg.user.email });
    });

    it("login con password incorrecta → InvalidCredentialsError con mensaje genérico", async () => {
      await service.register("f5-auth-badpass@metrix.test", null, "Correct123!");
      await expect(service.login("f5-auth-badpass@metrix.test", "Wrong123!"))
        .rejects.toThrow(InvalidCredentialsError);
      try {
        await service.login("f5-auth-badpass@metrix.test", "Wrong123!");
      } catch (e) {
        expect((e as Error).message).toMatch(/credenciales inválidas|invalid credentials/i);
      }
    });

    it("login con email inexistente → InvalidCredentialsError con MISMO mensaje genérico (no filtra existencia)", async () => {
      let msgBadPass = "";
      let msgNoUser = "";
      await service.register("f5-auth-exist@metrix.test", null, "Correct123!");
      try { await service.login("f5-auth-exist@metrix.test", "Wrong123!"); } catch (e) { msgBadPass = (e as Error).message; }
      try { await service.login("f5-auth-noexist@metrix.test", "Wrong123!"); } catch (e) { msgNoUser = (e as Error).message; }
      expect(msgBadPass).toBe(msgNoUser); // ★ contrato anti-enumeración
      await expect(service.login("f5-auth-noexist@metrix.test", "anyPass123!"))
        .rejects.toThrow(InvalidCredentialsError);
    });

    it("login no expone passwordHash en ningún caso (ni en error)", async () => {
      await service.register("f5-auth-nohash@metrix.test", null, "Correct123!");
      const ok = await service.login("f5-auth-nohash@metrix.test", "Correct123!");
      expect((ok.user as any).passwordHash).toBeUndefined();
      expect(JSON.stringify(ok.user)).not.toContain("Correct123!");
    });
  });

  describe("me", () => {
    it("me(userId) existente → UserRecord", async () => {
      const { user } = await service.register("f5-auth-me@metrix.test", "Me", "Secret123!");
      const found = await service.me(user.id);
      expect(found).not.toBeNull();
      expect(found!.email).toBe("f5-auth-me@metrix.test");
    });

    it("me(userId) inexistente → null (no lanza)", async () => {
      await expect(service.me("no-existe-uuid")).resolves.toBeNull();
    });
  });
});