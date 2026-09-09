import { AuthService, DuplicateEmailError } from "@/users/auth.service";
import { PrismaUserRepo } from "@/users/user.repo";
import { readJsonBody, jsonError, jsonOk } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { setSessionCookie } from "@/lib/auth";

const auth = new AuthService(new PrismaUserRepo());

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;

  const parsed = registerSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }

  try {
    const { email, name, password } = parsed.data;
    const { user, token } = await auth.register(email, name, password);
    const res = jsonOk({ user }, { status: 201 });
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return jsonError(error.message, 409);
    }
    throw error;
  }
}