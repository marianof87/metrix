import { describe, it, expect, beforeEach } from "vitest";
import { ScenarioService, ScenarioServiceError, computeInputHash } from "./scenario.service";
import { InMemoryScenarioRepo } from "./__mocks__/inMemoryScenarioRepo";
import { QuadraticDomainError } from "@/domain/quadratic/quadratic";

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

  describe("idempotencia save (política D5) — variantes", () => {
    it("create con el mismo input devuelve el mismo registro (no duplica)", async () => {
      const a = await service.create("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const b = await service.create("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(b.id).toBe(a.id);
      expect(repo.records.length).toBe(1);
    });

    it("save con el mismo input en otro scopeId NO dedupe (registro nuevo por scope)", async () => {
      const one = await service.save("scope-a", "pricing", { baseCost: 50, desiredMarginPct: 0.3 });
      const two = await service.save("scope-b", "pricing", { baseCost: 50, desiredMarginPct: 0.3 });
      expect(two.id).not.toBe(one.id);
      expect(repo.records.length).toBe(2);
    });

    it("save con keys en distinto orden → mismo inputHash, no duplica", async () => {
      const one = await service.save("scope-1", "actuarial", {
        principal: 100,
        annualRatePct: 0.05,
        periodsPerYear: 12,
        years: 1,
      });
      const two = await service.save("scope-1", "actuarial", {
        years: 1,
        periodsPerYear: 12,
        annualRatePct: 0.05,
        principal: 100,
      });
      expect(two.id).toBe(one.id);
      expect(repo.records.length).toBe(1);
    });
  });

  describe("reRun conserva el registro original", () => {
    it("save tras reRun devuelve el SAVED original y conserva el RE_RUN", async () => {
      const saved = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const rerun = await service.reRun("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(rerun.id).not.toBe(saved.id);
      const savedAgain = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(savedAgain.id).toBe(saved.id);
      expect(savedAgain.status).toBe("SAVED");
      await expect(repo.findById(rerun.id)).resolves.toMatchObject({ status: "RE_RUN" });
      expect(repo.records.length).toBe(2);
    });

    it("reRun en otro scopeId crea RE_RUN sin tocar el SAVED del scope original", async () => {
      const saved = await service.save("scope-a", "roi", { initialInvestment: 100, finalValue: 120 });
      const rerun = await service.reRun("scope-b", "roi", { initialInvestment: 100, finalValue: 120 });
      expect(rerun.status).toBe("RE_RUN");
      expect(rerun.scopeId).toBe("scope-b");
      const original = await repo.findById(saved.id);
      expect(original?.status).toBe("SAVED");
    });
  });

  describe("BUG D4/D5: save tras RE_RUN — inmutabilidad", () => {
    it("save tras reRun sin SAVED previo crea NUEVO SAVED y preserva RE_RUN (D4)", async () => {
      const rerun = await service.reRun("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(rerun.status).toBe("RE_RUN");
      const rerunId = rerun.id;

      const saved = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });

      const all = await service.list({ scopeId: "scope-1" });
      expect(all.length).toBe(2); // ★ RED: hoy 1 (reusa y muta)
      expect(saved.status).toBe("SAVED");
      expect(saved.id).not.toBe(rerunId); // ★ RED: hoy mismo id
      const preserved = await repo.findById(rerunId);
      expect(preserved?.status).toBe("RE_RUN"); // ★ RED: hoy "SAVED"
      expect(repo.records.length).toBe(2);
    });

    it("save tras reRun CON SAVED existente dedupea SAVED y preserva RE_RUN (D5)", async () => {
      const saved = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const rerun = await service.reRun("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      expect(rerun.id).not.toBe(saved.id);
      expect(repo.records.length).toBe(2);

      const savedAgain = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });

      expect(savedAgain.id).toBe(saved.id); // antirregresión: dedupe
      expect(savedAgain.status).toBe("SAVED");
      expect(repo.records.length).toBe(2); // antirregresión
      expect(repo.records.filter((r) => r.status === "SAVED").length).toBe(1);
      const rerunPreserved = await repo.findById(rerun.id);
      expect(rerunPreserved?.status).toBe("RE_RUN");
    });

    it("save tras COMPUTED reutiliza registro (DRAFT/COMPUTED→SAVED) — no duplica", async () => {
      const draft = await service.create("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const computed = await service.computeScenario(draft.id);
      expect(computed.status).toBe("COMPUTED");
      expect(computed.id).toBe(draft.id);

      const saved = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });

      expect(saved.id).toBe(draft.id); // antirregresión: reutiliza
      expect(saved.status).toBe("SAVED");
      expect(repo.records.length).toBe(1);
      const audits = await service.getAudits(saved.id);
      expect(audits.map((a) => a.action)).toEqual(["CREATE", "COMPUTE", "SAVE"]);
      expect(audits[2].fromStatus).toBe("COMPUTED");
    });

    it("auditoría tras reRun→save: SAVED nuevo es DRAFT→SAVED y no existe RE_RUN→SAVED", async () => {
      const rerun = await service.reRun("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const rerunAuditsBefore = await service.getAudits(rerun.id);
      expect(rerunAuditsBefore.map((a) => a.action)).toEqual(["RE_RUN"]);
      expect(rerunAuditsBefore[0].fromStatus).toBe("DRAFT");
      expect(rerunAuditsBefore[0].toStatus).toBe("RE_RUN");

      const saved = await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });

      const savedAudits = await service.getAudits(saved.id);
      // ★ RED: hoy false — el audit es RE_RUN→SAVED en el mismo id
      expect(
        savedAudits.some((a) => a.fromStatus === "DRAFT" && a.toStatus === "SAVED" && a.action === "SAVE")
      ).toBe(true);
      // ★ RED: hoy true — existe transición ilegal
      expect(savedAudits.some((a) => a.fromStatus === "RE_RUN" && a.toStatus === "SAVED")).toBe(false);
      expect(savedAudits.some((a) => a.action === "RE_RUN")).toBe(false); // SAVED no debe tener RE_RUN

      const rerunAuditsAfter = await service.getAudits(rerun.id);
      expect(rerunAuditsAfter.map((a) => a.action)).toEqual(["RE_RUN"]); // RE_RUN intacto
      const allIllegal = repo.audits.filter((a) => a.fromStatus === "RE_RUN" && a.toStatus === "SAVED");
      expect(allIllegal.length).toBe(0); // ★ RED: hoy 1
    });

    it("inmutabilidad: RE_RUN original no tocado tras save posterior (outputs/id/updatedAt)", async () => {
      const rerun = await service.reRun("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      const before = await repo.findById(rerun.id);
      const beforeOutputs = JSON.stringify(before!.outputs);
      const beforeUpdatedAt = before!.updatedAt.getTime();
      const beforeId = before!.id;
      // delay para detectar mutación de updatedAt por updateStatus
      await new Promise((r) => setTimeout(r, 6));

      await service.save("scope-1", "quadratic", { a: 1, b: -3, c: 2 });

      const after = await repo.findById(beforeId);
      expect(after).not.toBeNull();
      expect(after!.id).toBe(beforeId);
      expect(after!.status).toBe("RE_RUN"); // ★ RED: hoy SAVED
      expect(JSON.stringify(after!.outputs)).toBe(beforeOutputs); // ★ RED: hoy outputs recalculados
      expect(after!.updatedAt.getTime()).toBe(beforeUpdatedAt); // ★ RED: hoy timestamp nuevo
      expect(after!.inputHash).toBe(before!.inputHash);
    });
  });

  describe("errores de módulo e inputs", () => {
    it("save con inputs inválidos para el módulo propaga el error de dominio (a=0)", async () => {
      await expect(
        service.save("scope-1", "quadratic", { a: 0, b: 1, c: 1 })
      ).rejects.toThrow(QuadraticDomainError);
      // El DRAFT queda persistido pero nunca se guarda como SAVED.
      expect(repo.records.filter((r) => r.status === "SAVED").length).toBe(0);
    });

    it("computeScenario con inputs inválidos para el módulo lanza error de dominio", async () => {
      const draft = await service.create("scope-1", "quadratic", { a: 0, b: 1, c: 1 });
      await expect(service.computeScenario(draft.id)).rejects.toThrow(QuadraticDomainError);
    });

    it("computeScenario con módulo desconocido → ScenarioServiceError", async () => {
      await repo.create({
        scopeId: "scope-1",
        module: "nope" as never,
        inputHash: "h",
        formulaVersion: "v",
        inputs: {},
      });
      await expect(service.computeScenario("scenario-1")).rejects.toThrow("Unsupported module");
    });
  });

  describe("getById y list filtros", () => {
    it("getById devuelve el registro que existe", async () => {
      const saved = await service.save("scope-1", "quadratic", { a: 1, b: 0, c: 0 });
      const found = await service.getById(saved.id);
      expect(found.id).toBe(saved.id);
      expect(found.status).toBe("SAVED");
    });

    it("list sin filtros devuelve todos los scopes y estados", async () => {
      await service.save("scope-1", "quadratic", { a: 1, b: 0, c: 0 });
      await service.reRun("scope-2", "pricing", { baseCost: 10, desiredMarginPct: 0.1 });
      const all = await service.list();
      expect(all.length).toBe(2);
    });

    it("list filtra por status", async () => {
      await service.save("scope-1", "quadratic", { a: 1, b: 0, c: 0 });
      await service.reRun("scope-1", "quadratic", { a: 1, b: 0, c: 0 });
      const savedList = await service.list({ scopeId: "scope-1", status: "SAVED" });
      expect(savedList.length).toBe(1);
      expect(savedList[0].status).toBe("SAVED");
      const rerunList = await service.list({ scopeId: "scope-1", status: "RE_RUN" });
      expect(rerunList.length).toBe(1);
      expect(rerunList[0].status).toBe("RE_RUN");
    });

    it("list con scopeId + module + status combinados", async () => {
      await service.save("scope-1", "quadratic", { a: 1, b: 0, c: 0 });
      await service.save("scope-1", "pricing", { baseCost: 10, desiredMarginPct: 0.1 });
      await service.save("scope-2", "quadratic", { a: 1, b: 0, c: 0 });
      const list = await service.list({ scopeId: "scope-1", module: "quadratic", status: "SAVED" });
      expect(list.length).toBe(1);
      expect(list[0].module).toBe("quadratic");
    });
  });

  describe("computeInputHash", () => {
    it("es determinista y depende del módulo", () => {
      const h = computeInputHash("quadratic", { a: 1, b: -3, c: 2 });
      expect(h).toMatch(/^[a-f0-9]{64}$/);
      expect(computeInputHash("quadratic", { a: 1, b: -3, c: 2 })).toBe(h);
      expect(computeInputHash("pricing", { a: 1, b: -3, c: 2 })).not.toBe(h);
      expect(computeInputHash("quadratic", { a: 1, b: -3, c: 3 })).not.toBe(h);
    });

    it("computeScenario repetido mantiene COMPUTED y audita cada ejecución", async () => {
      const s = await service.create("scope-1", "quadratic", { a: 1, b: -3, c: 2 });
      await service.computeScenario(s.id);
      const again = await service.computeScenario(s.id);
      expect(again.status).toBe("COMPUTED");
      const audits = await service.getAudits(s.id);
      expect(audits.map((a) => a.action)).toEqual(["CREATE", "COMPUTE", "COMPUTE"]);
    });
  });
});