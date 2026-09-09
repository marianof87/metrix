"use client";

/**
 * metrix · components/LoginForm.tsx
 * Formulario de login (Fase 5b). POST /api/v1/auth/login; en 200 redirige a
 * `next` (default "/") y refresca. Errores de API se muestran tal cual en un
 * elemento con role="alert" (el servidor devuelve "Credenciales inválidas").
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        setError(typeof data.error === "string" ? data.error : "No se pudo iniciar sesión.");
        setSubmitting(false);
        return;
      }
      router.push(next || "/");
      router.refresh();
    } catch {
      setSubmitting(false);
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <label htmlFor="login-email" className="mb-1 block text-xs font-medium text-zinc-500">
          Correo
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1 block text-xs font-medium text-zinc-500">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Ingresando..." : "Iniciar sesión"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}