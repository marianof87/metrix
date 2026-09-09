import { PrismaUserRepo } from "@/users/user.repo";
import { jsonError, jsonOk } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getAuthSession(request);
  if (!session) {
    return jsonError("No autorizado", 401);
  }

  // MINOR-2: sesión huérfana (JWT válido pero usuario ya no existe en BD) → 401.
  const record = await new PrismaUserRepo().findById(session.userId);
  if (!record) {
    return jsonError("No autorizado", 401);
  }

  return jsonOk({ user: { id: record.id, email: record.email, name: record.name } });
}