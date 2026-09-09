/**
 * metrix · scenarios/types.ts
 * Tipos de nivel aplicación para el contrato universal ScenarioRecord.
 */

export type ScenarioModule = "quadratic" | "pricing" | "roi" | "actuarial";

export type ScenarioStatus = "DRAFT" | "COMPUTED" | "SAVED" | "RE_RUN";

export interface ScenarioRecord {
  id: string;
  userId: string;
  module: ScenarioModule;
  version: number;
  inputHash: string;
  formulaVersion: string;
  status: ScenarioStatus;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEntryRecord {
  id: string;
  scenarioId: string;
  fromStatus: ScenarioStatus | null;
  toStatus: ScenarioStatus;
  action: "CREATE" | "COMPUTE" | "SAVE" | "RE_RUN";
  detail?: string | null;
  createdAt: Date;
}