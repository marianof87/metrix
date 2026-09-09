import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión · metrix",
  description: "Accede a tu cuenta en metrix",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = typeof nextParam === "string" ? nextParam : "/";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-xl font-bold tracking-tight text-zinc-900">
        Iniciar sesión
      </h1>
      <LoginForm next={next} />
    </div>
  );
}
