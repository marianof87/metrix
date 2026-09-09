/**
 * metrix · lib/api.ts
 * Helpers para Route Handlers (respuestas JSON consistentes y manejo de errores).
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OutcomeError } from "@/domain/shared/outcome";

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return jsonError("Invalid input", 400, error.flatten());
  }
  if (error instanceof OutcomeError) {
    // OutcomeError es un error de dominio honesto (OBJ-2): 400 con causa, no 500.
    return jsonError(error.message, 400);
  }
  if (error instanceof Error) {
    const status = error.name.includes("Domain") || error.name.includes("Service") ? 400 : 500;
    const message = error.name.includes("Domain") || error.name.includes("Service")
      ? error.message
      : "Internal server error";
    return jsonError(message, status);
  }
  return jsonError("Internal server error", 500);
}

/**
 * Lee y parsea el body JSON de una petición.
 * Discriminated union: si `ok` es false, `error` está garantizado (TS lo infiere).
 */
export async function readJsonBody(request: Request): Promise<
  | { ok: true; data: unknown }
  | { ok: false; error: NextResponse }
> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return { ok: false, error: jsonError("Invalid JSON body", 400) };
  }
}