import { NextResponse } from "next/server";
import { calculateActuarial } from "@/domain/actuarial/actuarial";
import { actuarialInputSchema } from "@/lib/validation";
import { readJsonBody, handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;
  const parsed = actuarialInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }
  try {
    const result = calculateActuarial(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}