import { ScenarioService } from "@/scenarios/scenario.service";
import { jsonError, jsonOk } from "@/lib/api";

const service = new ScenarioService();

/**
 * POST /api/v1/scenarios/:id/re-run
 * Re-ejecuta el escenario del historial: computa con la fórmula vigente y crea
 * un nuevo registro RE_RUN (política D4 — auditoría completa).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const original = await service.getById(id);
    const scopeId = original.scopeId;
    const moduleParam = original.module;
    const inputs = original.inputs;

    const rerun = await service.reRun(scopeId, moduleParam, inputs);
    return jsonOk({ scenario: rerun, reRunOf: id }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error re-running scenario", 400);
  }
}