import { leadSchema } from "@/lib/validation";
import { readJsonBody, handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;
  const parsed = leadSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }
  try {
    const { nombre, empresa, whatsapp, email } = parsed.data;
    const lead = await prisma.lead.create({
      data: { nombre, empresa, whatsapp, email },
      select: { id: true, createdAt: true },
    });
    return jsonOk({ id: lead.id, createdAt: lead.createdAt }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}