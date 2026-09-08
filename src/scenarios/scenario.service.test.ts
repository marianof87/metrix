import { describe, it, expect, beforeEach } from "vitest";
import { ScenarioService, ScenarioServiceError } from "./scenario.service";
import { InMemoryScenarioRepo } from "./__mocks__/inMemoryScenarioRepo";

describe("scenario.service (unit, in-memory repo)", () => {
  let repo: InMemoryScenarioRepo;
  let service: ScenarioService;

  beforeEach(() => {
    repo = new InMemoryScenarioRepo();
    service = new ScenarioService(repo);
  });

  describe("create + compute", () => {
    it("crea un registro DRAFT con inputHash estable", async () => {
      const s = await service.create("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(s.status).toBe("DRAFT");
      expect(s.inputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(s.module).toBe("quadratic");
    });

    it("el inputHash no depende del orden de claves del input", async () => {
      const a = await service.create("scope-1", "pricing", { baseCost: 100, desiredMarginPct: 0.2 });
      const b = await service.create("scope-1", "pricing", { desiredMarginPct: 0.2, baseCost: 100 });
      expect(a.inputHash).toBe(b.inputHash);
      // No duplica
      expect(repo.records.length).toBe(1);
    });

    it("computa un escenario DRAFT → COMPUTED con outputs y audit trail", async () => {
      const s = await service.create("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const computed = await service.computeScenario(s.id);
      expect(computed.status).toBe("COMPUTED");
      expect(computed.outputs).toHaveProperty("roots");
      expect(computed.outputs).toHaveProperty("formulaVersion", "quadratic-v1");
      const audits = await service.getAudits(s.id);
      expect(audits.map((a) => a.action)).toEqual(["CREATE", "COMPUTE"]);
      expect(audits[1].fromStatus).toBe("DRAFT");
      expect(audits[1].toStatus).toBe("COMPUTED");
    });
  });

  describe("save (política D5)", () => {
    it("guarda un escenario bajo acción explícita → SAVED con outputs inmutables", async () => {
      const s = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(s.status).toBe("SAVED");
      const audits = await service.getAudits(s.id);
      expect(audits.map((a) => a.action)).toEqual(["CREATE", "SAVE"]);
    });

    it("guardar el mismo input dos veces no duplica (dedupe por inputHash)", async () => {
      const one = await service.save("scope-1", "pricing", { baseCost: 50, desiredMarginPct: 0.3 });
      const two = await service.save("scope-1", "pricing", { baseCost: 50, desiredMarginPct: 0.3 });
      expect(two.id).toBe(one.id);
      expect(repo.records.filter((r) => r.status === "SAVED").length).toBe(1);
    });
  });

  describe("re-run (política D4)", () => {
    it("re-ejecutar desde historial crea un NUEVO registro RE_RUN (auditoría completa)", async () => {
      const original = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const rerun = await service.reRun("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(rerun.id).not.toBe(original.id);
      expect(rerun.status).toBe("RE_RUN");
      expect(rerun.outputs).toHaveProperty("roots");
      const originalAudits = await service.getAudits(original.id);
      expect(originalAudits.map((a) => a.action)).toEqual(["CREATE", "SAVE"]);
      const rerunAudits = await service.getAudits(rerun.id);
      expect(rerunAudits.map((a) => a.action)).toEqual(["RE_RUN"]);
    });

    it("re-ejecutar el mismo input dos veces no duplica el RE_RUN", async () => {
      const one = await service.reRun("scope-1", "roi", { initialInvestment: 100, finalValue: 120 });
      const two = await service.reRun("scope-1", "roi", { initialInvestment: 100, finalValue: 120 });
      expect(two.id).toBe(one.id);
      expect(repo.records.filter((r) => r.status === "RE_RUN").length).toBe(1);
    });
  });

  describe("list + errors", () => {
    it("lista escenarios filtrables por module", async () => {
      await service.save("scope-1", "quadratic", { a: 1, b: 0, c: 0 });
      await service.save("scope-1", "pricing", { baseCost: 10, desiredMarginPct: 0.1 });
      const list = await service.list({ scopeId: "scope-1" });
      expect(list.length).toBe(2);
      const quadratics = await service.list({ scopeId: "scope-1", module: "quadratic" });
      expect(quadratics.length).toBe(1);
    });

    it("getById lanza si no existe", async () => {
      await expect(service.getById("nope")).rejects.toThrow(ScenarioServiceError);
    });

    it("computeScenario lanza si no existe", async () => {
      await expect(service.computeScenario("nope")).rejects.toThrow(ScenarioServiceError);
    });
  });
});