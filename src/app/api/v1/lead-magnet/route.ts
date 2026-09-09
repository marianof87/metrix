import { NextResponse } from "next/server";
import {
  optimizarPrecio,
  buildProfitCurve,
  LEAD_MAGNET_FORMULA_VERSION,
} from "@/domain/leadmagnet/leadmagnet";
import { leadMagnetInputSchema } from "@/lib/validation";
import { readJsonBody, handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.statusCode ?? 500 });
    const parsed = leadMagnetInputSchema.safeParse(body.data);
    if (!parsed.success) {
      return jsonError("Invalid input", 400, parsed.error.flatten());
    }
    try {
      const resultado = optimizarPrecio(parsed.data);
      const curva = buildProfitCurve(parsed.data, resultado);
      return NextResponse.json({
        formulaVersion: LEAD_MAGNET_FORMULA_VERSION,
        precioOptimo: resultado.precioOptimo,
        gananciaMaxima: resultado.gananciaMaxima,
        estrategiaSugerida: resultado.estrategiaSugerida,
        curva,
      });
    } catch (error: any) {
      console.error("lead-magnet handler error:", error);
      return NextResponse.json(
        { error: error.message ?? "Error interno del servidor" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("lead-magnet handler outer error:", error);
    return NextResponse.json(
      { error: error.message ?? "Error interno del servidor" },
      { status: 500 }
    );
  }
}