"use client";

/**
 * metrix · components/LogoutButton.tsx
 * Botón de logout (Fase 5b). POST /api/v1/auth/logout (expira la cookie httpOnly),
 * luego redirige a "/" y refresca para que el AuthNav server re-renderice.
 */

import { useRouter } from "next/navigation";

const SESSION_COOKIE_NAME = "metrix-session";

export default function LogoutButton() {
  const router = useRouter();

  const handleClick = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      // Force client-side cookie clearance so the browser removes
      // metrix-session immediately, regardless of how fetch processes
      // the Set-Cookie header. This ensures AuthNav re-renders without
      // the old session on router.refresh().
      document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; samesite=Lax`;
      router.push("/");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded outline-none transition hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300"
    >
      Cerrar sesión
    </button>
  );
}