import { AuthService, InvalidCredentialsError } from "@/users/auth.service";
import { PrismaUserRepo } from "@/users/user.repo";
import { readJsonBody, jsonError, jsonOk } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { setSessionCookie } from "@/lib/auth";

const auth = new AuthService(new PrismaUserRepo());

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.error;

  const parsed = loginSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError("Invalid input", 400, parsed.error.flatten());
  }

  try {
    const { email, password } = parsed.data;
    const { user, token } = await auth.login(email, password);
    const res = jsonOk({ user }, { status: 200 });
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return jsonError(error.message, 401);
    }
    throw error;
  }
}