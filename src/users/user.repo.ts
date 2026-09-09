/**
 * metrix · users/user.repo.ts
 * Repositorio Prisma para UserRecord.
 * Patrón idéntico a scenarios/scenario.repo.ts: puerto (interface) + implementación
 * + alias de puerto para inyección de dependencias en tests.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DuplicateEmailError } from "./auth.service";

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepo {
  create(data: { email: string; name: string | null; passwordHash: string }): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}

export class PrismaUserRepo implements UserRepo {
  async create(data: { email: string; name: string | null; passwordHash: string }): Promise<UserRecord> {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      // P2002 = unique constraint failed. En User la única unique es email.
      // Red de seguridad: AuthService.register ya pre-chequea con findByEmail.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await prisma.user.findUnique({ where: { email } });
    return row;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row;
  }
}

// Alias para inyección de dependencias fácil en tests (patrón ScenarioRepoPort).
export type UserRepoPort = UserRepo;