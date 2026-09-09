import { NextResponse } from "next/server";
import { computeLeadMagnet } from "@/domain/leadmagnet/leadmagnet";
import { toLeadMagnetOutcome } from "@/domain/leadmagnet/outcome";
import { leadMagnetInputSchema } from "@/lib/validation";
import { readJsonBody, handleApiError, jsonError } from "@/lib/api";

/**
 * POST /api/v1/lead-magnet — Fase 4 (contrato honesto OBJ-2)
 * Devuelve { formulaVersion, outcomes: [Outcome], curva: {x,y}[] }
 * en lugar del shape legacy (precioOptimo, gananciaMaxima, estrategiaSugerida).
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;
  const parsed = leadMagnetInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }
  try {
    const result = computeLeadMagnet(parsed.data);
    if (!result) {
      return jsonError("Invalid input", 400);
    }
    const outcome = toLeadMagnetOutcome(result, parsed.data);
    if (!outcome) {
      return jsonError("Invalid input", 400);
    }
    return NextResponse.json({
      formulaVersion: "lead-magnet-v1",
      outcomes: [outcome],
      curva: result.profitCurve,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
