import { NextResponse } from "next/server";
import { calculateRoi } from "@/domain/roi/roi";
import { roiInputSchema } from "@/lib/validation";
import { readJsonBody, handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;
  const parsed = roiInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }
  try {
    const result = calculateRoi(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}