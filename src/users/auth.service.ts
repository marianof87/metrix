/**
 * metrix · users/auth.service.ts
 * Servicio de autenticación (Fase 5b). Puro: recibe un UserRepoPort (Prisma en
 * producción, InMemory en tests) y firma JWTs vía lib/auth.
 *
 * Contrato (tests RED):
 *  - register(email, name|null|undefined, password) → { user, token } sin passwordHash
 *    · normaliza email (trim + lowercase)
 *    · hashea con bcryptjs (cost 12)
 *    · email duplicado → DuplicateEmailError ("Ya existe un usuario con ese email")
 *    · token verificable con verifyJwt (payload { userId, email })
 *  - login(email, password) → { user, token }
 *    · password mal O email inexistente → InvalidCredentialsError con MISMO mensaje
 *      genérico "Credenciales inválidas" (anti-enumeración)
 *  - me(userId) → UserRecord | null
 */

import { hash, compare } from "bcryptjs";
import { signJwt } from "@/lib/auth";
import type { UserRecord, UserRepoPort } from "./user.repo";

/** Usuario público: NUNCA expone passwordHash. */
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
};

export class DuplicateEmailError extends Error {
  constructor(message = "Ya existe un usuario con ese email") {
    super(message);
    this.name = "DuplicateEmailError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = "Credenciales inválidas") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

function toPublicUser(record: UserRecord): PublicUser {
  return { id: record.id, email: record.email, name: record.name };
}

export class AuthService {
  constructor(private repo: UserRepoPort) {}

  async register(
    email: string,
    name: string | null | undefined,
    password: string
  ): Promise<{ user: PublicUser; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Pre-chequeo de duplicado: cubre el repo en memoria (sin unique constraint)
    // y evita hashear innecesariamente. En BD, PrismaUserRepo.create además captura
    // P2002 como red de seguridad (carrera entre dos registros concurrentes).
    const existing = await this.repo.findByEmail(normalizedEmail);
    if (existing) throw new DuplicateEmailError();

    const passwordHash = await hash(password, 12);
    const record = await this.repo.create({
      email: normalizedEmail,
      name: name ?? null,
      passwordHash,
    });

    const token = await signJwt({ userId: record.id, email: record.email });
    return { user: toPublicUser(record), token };
  }

  async login(email: string, password: string): Promise<{ user: PublicUser; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const record = await this.repo.findByEmail(normalizedEmail);
    // Anti-enumeración: mismo flujo y mismo mensaje para "no existe" y "password
    // incorrecta". compare() solo se ejecuta si existe el usuario.
    const passwordOk = record !== null && (await compare(password, record.passwordHash));
    if (!record || !passwordOk) throw new InvalidCredentialsError();

    const token = await signJwt({ userId: record.id, email: record.email });
    return { user: toPublicUser(record), token };
  }

  async me(userId: string): Promise<UserRecord | null> {
    return this.repo.findById(userId);
  }
}