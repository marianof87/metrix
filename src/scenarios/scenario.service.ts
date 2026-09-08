/**
 * metrix · scenarios/scenario.service.ts
 * Servicio de aplicación: orquesta el dominio puro + persistencia.
 *
 * Transiciones de estado:
 *   DRAFT → COMPUTED (calcular sin guardar)
 *   DRAFT → SAVED    (guardar directamente)
 *   COMPUTED → SAVED (guardar)
 *   SAVED → RE_RUN   (re-ejecutar: crea NUEVO registro con status RE_RUN — política D4)
 *
 * Idempotencia: clave scopeId+module+inputHash evita duplicados al re-ejecutar
 * el mismo escenario (política D5: solo se guarda bajo acción explícita "Guardar").
 */

import { canonicalJson } from "@/domain/shared/canonicalJson";
import { sha256Hex } from "@/domain/shared/hash";
import { solveQuadratic } from "@/domain/quadratic/quadratic";
import { calculatePricing } from "@/domain/pricing/pricing";
import { calculateRoi } from "@/domain/roi/roi";
import { calculateActuarial } from "@/domain/actuarial/actuarial";
import { ScenarioRepoPort, PrismaScenarioRepo } from "./scenario.repo";
import { ScenarioModule, ScenarioStatus, ScenarioRecord } from "./types";

export class ScenarioServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioServiceError";
  }
}

export type ComputeFn = (inputs: Record<string, unknown>) => Record<string, unknown>;

const moduleComputers: Record<ScenarioModule, ComputeFn> = {
  quadratic: (inputs) => solveQuadratic(inputs as never) as unknown as Record<string, unknown>,
  pricing: (inputs) => calculatePricing(inputs as never) as unknown as Record<string, unknown>,
  roi: (inputs) => calculateRoi(inputs as never) as unknown as Record<string, unknown>,
  actuarial: (inputs) => calculateActuarial(inputs as never) as unknown as Record<string, unknown>,
};

/**
 * Calcula el inputHash canónico (orden de claves indiferente).
 */
export function computeInputHash(module: ScenarioModule, inputs: Record<string, unknown>): string {
  return sha256Hex(`${module}:${canonicalJson(inputs)}`);
}

export class ScenarioService {
  constructor(private readonly repo: ScenarioRepoPort = new PrismaScenarioRepo()) {}

  private async compute(record: ScenarioRecord): Promise<Record<string, unknown>> {
    const fn = moduleComputers[record.module];
    if (!fn) {
      throw new ScenarioServiceError(`Unsupported module: ${record.module}`);
    }
    return fn(record.inputs);
  }

  /**
   * Crea un escenario DRAFT. No computa ni guarda outputs aún.
   */
  async create(
    scopeId: string,
    module: ScenarioModule,
    inputs: Record<string, unknown>,
    opts: { forceNew?: boolean } = {}
  ): Promise<ScenarioRecord> {
    const inputHash = computeInputHash(module, inputs);
    if (!opts.forceNew) {
      const existing = await this.repo.findByUniqueKey(scopeId, module, inputHash);
      if (existing) {
        // Ya existe (mismo input). Política D4/D5: devolver el existente sin duplicar.
        return existing;
      }
    }
    const record = await this.repo.create({
      scopeId,
      module,
      inputHash,
      formulaVersion: this.formulaVersionFor(module),
      inputs,
    });
    await this.repo.createAudit({
      scenarioId: record.id,
      fromStatus: null,
      toStatus: "DRAFT",
      action: "CREATE",
    });
    return record;
  }

  /**
   * Computa un escenario (transición DRAFT/COMPUTED → COMPUTED) sin guardar.
   */
  async computeScenario(id: string): Promise<ScenarioRecord> {
    const record = await this.repo.findById(id);
    if (!record) throw new ScenarioServiceError(`Scenario not found: ${id}`);
    const outputs = await this.compute(record);
    const from = record.status;
    const updated = await this.repo.updateStatus(id, "COMPUTED", outputs);
    await this.repo.createAudit({
      scenarioId: id,
      fromStatus: from,
      toStatus: "COMPUTED",
      action: "COMPUTE",
    });
    return updated;
  }

  /**
   * Guarda un escenario bajo acción explícita (política D5).
   * Si el inputHash ya existe en estado SAVED, no duplica y devuelve el existente.
   */
  async save(scopeId: string, module: ScenarioModule, inputs: Record<string, unknown>): Promise<ScenarioRecord> {
    const inputHash = computeInputHash(module, inputs);
    // Dedupe por estado: si ya existe un SAVED con este input, no duplicar.
    const existingSaved = await this.repo.findByUniqueKey(scopeId, module, inputHash, "SAVED");
    if (existingSaved) {
      return existingSaved;
    }
    // Puede existir un DRAFT/COMPUTED/RE_RUN con el mismo input; si no es SAVED
    // se reutiliza (sin duplicar su estado), salvo que sea RE_RUN (se conserva).
    const existing = await this.repo.findByUniqueKey(scopeId, module, inputHash);
    if (existing && existing.status !== "RE_RUN") {
      const outputs = await this.compute(existing);
      const from = existing.status;
      const record = await this.repo.updateStatus(existing.id, "SAVED", outputs);
      await this.repo.createAudit({
        scenarioId: record.id,
        fromStatus: from,
        toStatus: "SAVED",
        action: "SAVE",
      });
      return record;
    }
    // No existe SAVED: si el único existente es RE_RUN, NO se reutiliza
    // (auditoría inmutable, D4): se crea un registro nuevo SAVED.
    let record: ScenarioRecord;
    if (existing && existing.status === "RE_RUN") {
      record = await this.create(scopeId, module, inputs, { forceNew: true });
    } else {
      record = existing ?? (await this.create(scopeId, module, inputs));
    }
    if (record.status !== "SAVED") {
      const outputs = await this.compute(record);
      const from = record.status;
      record = await this.repo.updateStatus(record.id, "SAVED", outputs);
      await this.repo.createAudit({
        scenarioId: record.id,
        fromStatus: from,
        toStatus: "SAVED",
        action: "SAVE",
      });
    }
    return record;
  }

  /**
   * Re-ejecuta un escenario SAVED desde historial: computa de nuevo y crea
   * un NUEVO registro RE_RUN (política D4: auditoría completa).
   * @returns el nuevo registro RE_RUN (o el existente si ya se re-ejecutó con el mismo input).
   */
  async reRun(scopeId: string, module: ScenarioModule, inputs: Record<string, unknown>): Promise<ScenarioRecord> {
    const inputHash = computeInputHash(module, inputs);
    // Dedupe por estado: si ya existe un RE_RUN con este input, no duplicar.
    const existingRerun = await this.repo.findByUniqueKey(scopeId, module, inputHash, "RE_RUN");
    if (existingRerun) {
      return existingRerun;
    }
    // Creamos un registro nuevo con status RE_RUN directamente.
    let record = await this.repo.create({
      scopeId,
      module,
      inputHash,
      formulaVersion: this.formulaVersionFor(module),
      inputs,
    });
    const outputs = await this.compute(record);
    record = await this.repo.updateStatus(record.id, "RE_RUN", outputs);
    await this.repo.createAudit({
      scenarioId: record.id,
      fromStatus: "DRAFT",
      toStatus: "RE_RUN",
      action: "RE_RUN",
    });
    return record;
  }

  private formulaVersionFor(module: ScenarioModule): string {
    switch (module) {
      case "quadratic":
        return "quadratic-v1";
      case "pricing":
        return "pricing-v1";
      case "roi":
        return "roi-v1";
      case "actuarial":
        return "actuarial-v1";
      default:
        return "unknown";
    }
  }

  async list(params: { scopeId?: string; module?: ScenarioModule; status?: ScenarioStatus } = {}) {
    return this.repo.list(params);
  }

  async getById(id: string): Promise<ScenarioRecord> {
    const record = await this.repo.findById(id);
    if (!record) throw new ScenarioServiceError(`Scenario not found: ${id}`);
    return record;
  }

  async getAudits(scenarioId: string) {
    return this.repo.listAudits(scenarioId);
  }
}

// Exporta también el repo concreto para test de integración.
export { PrismaScenarioRepo };