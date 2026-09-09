/**
 * metrix · scenarios/__mocks__/inMemoryScenarioRepo.ts
 * Fake de ScenarioRepo en memoria para tests unitarios del servicio.
 */

import { ScenarioRepoPort } from "../scenario.repo";
import { ScenarioRecord, ScenarioStatus, ScenarioModule, AuditEntryRecord } from "../types";

export class InMemoryScenarioRepo implements ScenarioRepoPort {
  records: ScenarioRecord[] = [];
  audits: AuditEntryRecord[] = [];
  private seq = 1;

  async create(data: {
    userId: string;
    module: ScenarioModule;
    version?: number;
    inputHash: string;
    formulaVersion: string;
    inputs: Record<string, unknown>;
  }): Promise<ScenarioRecord> {
    const now = new Date();
    const record: ScenarioRecord = {
      id: `scenario-${this.seq++}`,
      userId: data.userId,
      module: data.module,
      version: data.version ?? 1,
      inputHash: data.inputHash,
      formulaVersion: data.formulaVersion,
      status: "DRAFT",
      inputs: data.inputs,
      outputs: {},
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<ScenarioRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByUniqueKey(
    userId: string,
    module: ScenarioModule,
    inputHash: string,
    status?: ScenarioStatus
  ): Promise<ScenarioRecord | null> {
    // Devuelve el más reciente que cumpla (status opcional).
    const matches = this.records
      .filter((r) => r.userId === userId && r.module === module && r.inputHash === inputHash)
      .filter((r) => (status ? r.status === status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matches[0] ?? null;
  }

  async list(params: { userId?: string; module?: ScenarioModule; status?: ScenarioStatus } = {}): Promise<ScenarioRecord[]> {
    return this.records
      .filter((r) => (params.userId ? r.userId === params.userId : true))
      .filter((r) => (params.module ? r.module === params.module : true))
      .filter((r) => (params.status ? r.status === params.status : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateStatus(id: string, status: ScenarioStatus, outputs: Record<string, unknown>): Promise<ScenarioRecord> {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("not found");
    this.records[idx] = {
      ...this.records[idx],
      status,
      outputs,
      updatedAt: new Date(),
    };
    return this.records[idx];
  }

  async createAudit(entry: {
    scenarioId: string;
    fromStatus: ScenarioStatus | null;
    toStatus: ScenarioStatus;
    action: AuditEntryRecord["action"];
    detail?: string;
  }): Promise<AuditEntryRecord> {
    const audit: AuditEntryRecord = {
      id: `audit-${this.seq++}`,
      scenarioId: entry.scenarioId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      action: entry.action,
      detail: entry.detail ?? null,
      createdAt: new Date(),
    };
    this.audits.push(audit);
    return audit;
  }

  async listAudits(scenarioId: string): Promise<AuditEntryRecord[]> {
    return this.audits.filter((a) => a.scenarioId === scenarioId);
  }
}