import { NextResponse } from "next/server";
import { ScenarioService } from "@/scenarios/scenario.service";
import { readJsonBody, jsonError, jsonOk } from "@/lib/api";
import { saveScenarioSchema } from "@/lib/validation";

const service = new ScenarioService();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scopeId = url.searchParams.get("scopeId") ?? "default";
  const module = url.searchParams.get("module") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  try {
    const records = await service.list({
      scopeId,
      module: (module as "quadratic" | "pricing" | "roi" | "actuarial") ?? undefined,
      status: (status as "DRAFT" | "COMPUTED" | "SAVED" | "RE_RUN") ?? undefined,
    });
    return jsonOk({ scenarios: records });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error listing scenarios", 400);
  }
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;
  const parsed = saveScenarioSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }
  try {
    const { scopeId, module, inputs } = parsed.data;
    const record = await service.save(scopeId, module, inputs);
    return jsonOk({ scenario: record }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Error saving scenario", 400);
  }
}