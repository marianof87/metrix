import { cookies } from "next/headers";
import Link from "next/link";
import { SESSION_COOKIE_NAME } from "@/lib/auth.config";
import { verifyJwt } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function AuthNav() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyJwt(token) : null;

  if (session) {
    return (
      <div className="ml-auto flex items-center gap-3 text-sm">
        <span className="text-zinc-600">{session.email}</span>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <Link
        href="/login"
        aria-label="Login"
        className="rounded outline-none transition hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300"
      >
        Iniciar sesión
      </Link>
      <Link
        href="/register"
        className="rounded outline-none transition hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300"
      >
        Registrarse
      </Link>
    </div>
  );
}
