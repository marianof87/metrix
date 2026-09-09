/**
 * metrix · users/__mocks__/inMemoryUserRepo.ts
 * Fake de UserRepo en memoria para tests unitarios de AuthService.
 * Patrón idéntico a scenarios/__mocks__/inMemoryScenarioRepo.ts.
 * Contrato: findByEmail devuelve el existente si el email coincide normalizado
 * (trim + lowercase), igual que normaliza AuthService.register/login.
 */

import type { UserRecord, UserRepoPort } from "../user.repo";

export class InMemoryUserRepo implements UserRepoPort {
  records: UserRecord[] = [];
  private seq = 1;

  async create(data: { email: string; name: string | null; passwordHash: string }): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      id: `user-${this.seq++}`,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return this.records.find((r) => r.email === normalized) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }
}