import { NextResponse } from "next/server";
import { calcularMargenReal } from "@/domain/margen/margen";
import { margenInputSchema } from "@/lib/validation";
import { readJsonBody, handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;
  const parsed = margenInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }
  try {
    const resultado = calcularMargenReal(parsed.data);
    return NextResponse.json(resultado);
  } catch (error) {
    return handleApiError(error);
  }
}