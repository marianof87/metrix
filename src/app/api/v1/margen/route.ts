import { NextResponse } from "next/server";
import { calcularMargenReal } from "@/domain/margen/margen";
import { toMargenOutcomes } from "@/domain/margen/outcome";
import { margenInputSchema } from "@/lib/validation";
import { readJsonBody, handleApiError, jsonError } from "@/lib/api";

/**
 * POST /api/v1/margen — Fase 2 (OBJ-2: honestidad antes que precisión)
 * Devuelve { outcomes: Outcome[], formulaVersion } en lugar del shape plano.
 * Los números sueltos (margenRealUnitario, comisionAbs, etc.) ya no se exponen.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;
  const parsed = margenInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }
  try {
    const resultado = calcularMargenReal(parsed.data);
    const outcomes = toMargenOutcomes(resultado, parsed.data);
    return NextResponse.json({ outcomes, formulaVersion: resultado.formulaVersion });
  } catch (error) {
    return handleApiError(error);
  }
}