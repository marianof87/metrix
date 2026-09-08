import { NextResponse } from "next/server";
import { ScenarioService } from "@/scenarios/scenario.service";
import { jsonError, jsonOk } from "@/lib/api";

const service = new ScenarioService();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const record = await service.getById(id);
    const audits = await service.getAudits(id);
    return jsonOk({ scenario: record, audits });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Scenario not found", 404);
  }
}