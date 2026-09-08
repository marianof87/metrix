/**
 * metrix · scenarios/scenario.repo.ts
 * Repositorio Prisma para ScenarioRecord y AuditEntry.
 * Capa de aplicación: traduce registros de BD (JSON strings) a objetos tipados.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ScenarioModule, ScenarioStatus, ScenarioRecord, AuditEntryRecord } from "./types";

function toScenarioRecord(row: {
  id: string;
  scopeId: string;
  module: string;
  version: number;
  inputHash: string;
  formulaVersion: string;
  status: string;
  inputs: string;
  outputs: string;
  createdAt: Date;
  updatedAt: Date;
}): ScenarioRecord {
  return {
    id: row.id,
    scopeId: row.scopeId,
    module: row.module as ScenarioModule,
    version: row.version,
    inputHash: row.inputHash,
    formulaVersion: row.formulaVersion,
    status: row.status as ScenarioStatus,
    inputs: JSON.parse(row.inputs) as Record<string, unknown>,
    outputs: JSON.parse(row.outputs) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAuditEntry(row: {
  id: string;
  scenarioId: string;
  fromStatus: string | null;
  toStatus: string;
  action: string;
  detail: string | null;
  createdAt: Date;
}): AuditEntryRecord {
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    fromStatus: row.fromStatus as ScenarioStatus | null,
    toStatus: row.toStatus as ScenarioStatus,
    action: row.action as AuditEntryRecord["action"],
    detail: row.detail,
    createdAt: row.createdAt,
  };
}

export interface CreateScenarioInput {
  scopeId: string;
  module: ScenarioModule;
  version?: number;
  inputHash: string;
  formulaVersion: string;
  inputs: Record<string, unknown>;
}

export interface ScenarioRepo {
  create(data: CreateScenarioInput): Promise<ScenarioRecord>;
  findById(id: string): Promise<ScenarioRecord | null>;
  findByUniqueKey(scopeId: string, module: ScenarioModule, inputHash: string): Promise<ScenarioRecord | null>;
  list(params: {
    scopeId?: string;
    module?: ScenarioModule;
    status?: ScenarioStatus;
  }): Promise<ScenarioRecord[]>;
  updateStatus(
    id: string,
    status: ScenarioStatus,
    outputs: Record<string, unknown>
  ): Promise<ScenarioRecord>;
  createAudit(entry: {
    scenarioId: string;
    fromStatus: ScenarioStatus | null;
    toStatus: ScenarioStatus;
    action: AuditEntryRecord["action"];
    detail?: string;
  }): Promise<AuditEntryRecord>;
  listAudits(scenarioId: string): Promise<AuditEntryRecord[]>;
}

export class PrismaScenarioRepo implements ScenarioRepo {
  async create(data: CreateScenarioInput): Promise<ScenarioRecord> {
    const row = await prisma.scenarioRecord.create({
      data: {
        scopeId: data.scopeId,
        module: data.module,
        version: data.version ?? 1,
        inputHash: data.inputHash,
        formulaVersion: data.formulaVersion,
        status: "DRAFT",
        inputs: JSON.stringify(data.inputs),
        outputs: JSON.stringify({}),
      },
    });
    return toScenarioRecord(row);
  }

  async findById(id: string): Promise<ScenarioRecord | null> {
    const row = await prisma.scenarioRecord.findUnique({ where: { id } });
    return row ? toScenarioRecord(row) : null;
  }

  async findByUniqueKey(
    scopeId: string,
    module: ScenarioModule,
    inputHash: string
  ): Promise<ScenarioRecord | null> {
    const row = await prisma.scenarioRecord.findUnique({
      where: { scopeId_module_inputHash: { scopeId, module, inputHash } },
    });
    return row ? toScenarioRecord(row) : null;
  }

  async list(params: {
    scopeId?: string;
    module?: ScenarioModule;
    status?: ScenarioStatus;
  }): Promise<ScenarioRecord[]> {
    const rows = await prisma.scenarioRecord.findMany({
      where: {
        scopeId: params.scopeId,
        module: params.module,
        status: params.status,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toScenarioRecord);
  }

  async updateStatus(
    id: string,
    status: ScenarioStatus,
    outputs: Record<string, unknown>
  ): Promise<ScenarioRecord> {
    const row = await prisma.scenarioRecord.update({
      where: { id },
      data: {
        status,
        outputs: JSON.stringify(outputs),
      },
    });
    return toScenarioRecord(row);
  }

  async createAudit(entry: {
    scenarioId: string;
    fromStatus: ScenarioStatus | null;
    toStatus: ScenarioStatus;
    action: AuditEntryRecord["action"];
    detail?: string;
  }): Promise<AuditEntryRecord> {
    const row = await prisma.auditEntry.create({
      data: {
        scenarioId: entry.scenarioId,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        action: entry.action,
        detail: entry.detail ?? null,
      },
    });
    return toAuditEntry(row);
  }

  async listAudits(scenarioId: string): Promise<AuditEntryRecord[]> {
    const rows = await prisma.auditEntry.findMany({
      where: { scenarioId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toAuditEntry);
  }
}

// Exporta un tipo para inyección de dependencias fácil en tests.
export type ScenarioRepoPort = ScenarioRepo;