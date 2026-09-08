"use client";

/**
 * metrix · components/LeadModal.tsx
 * Modal de captura de lead para la descarga del informe PDF.
 * Port del modal-captura-lead de la app Angular de referencia.
 */

import { useState } from "react";
import { leadSchema, type LeadInputSchema } from "@/lib/validation";

interface LeadModalProps {
  onClose: () => void;
  onRegistrado: (lead: LeadInputSchema) => void;
}

const ERROR_NOMBRE = "El nombre y apellido son obligatorios.";
const ERROR_EMPRESA = "La empresa o rubro es obligatoria.";
const ERROR_WHATSAPP = "Ingresá un WhatsApp válido.";
const ERROR_EMAIL = "Ingresá un email laboral válido.";
const ERROR_FALLBACK = "Ingresá un email laboral válido.";

const ERROR_POR_CAMPO: Record<string, string> = {
  nombre: ERROR_NOMBRE,
  empresa: ERROR_EMPRESA,
  whatsapp: ERROR_WHATSAPP,
  email: ERROR_EMAIL,
};

export default function LeadModal({ onClose, onRegistrado }: LeadModalProps) {
  const [values, setValues] = useState({ nombre: "", empresa: "", whatsapp: "", email: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleChange = (campo: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [campo]: value }));
    setFieldErrors((prev) => {
      if (!(campo in prev)) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const parsed = leadSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const errors: Record<string, string> = {};
      for (const [k, messages] of Object.entries(flat.fieldErrors)) {
        if (messages && messages.length > 0) {
          errors[k] = ERROR_POR_CAMPO[k] ?? ERROR_FALLBACK;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status !== 201) {
        setSubmitError(
          typeof data.error === "string"
            ? data.error
            : "No se pudo registrar tu contacto."
        );
        setEnviando(false);
        return;
      }
      setEnviando(false);
      onRegistrado(parsed.data as LeadInputSchema);
    } catch {
      setEnviando(false);
      setSubmitError("No se pudo registrar tu contacto.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!enviando) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 id="titulo-modal" className="text-lg font-semibold">
            Descargá tu informe personalizado
          </h2>
          <button
            type="button"
            className="text-xl leading-none text-zinc-400 transition hover:text-zinc-600"
            onClick={() => {
              if (!enviando) onClose();
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="mb-5 text-sm text-zinc-600">
          Completá tus datos y te enviamos el informe en PDF junto con un diagnóstico
          gratuito de 30 minutos.
        </p>

        <form data-testid="lm-lead-form" onSubmit={handleSubmit} noValidate className="space-y-3">
          <div>
            <label htmlFor="lead-nombre" className="mb-1 block text-xs font-medium text-zinc-500">
              Nombre y Apellido
            </label>
            <input
              id="lead-nombre"
              data-testid="lead-nombre"
              type="text"
              autoComplete="name"
              placeholder="Ej: Ana Pérez"
              value={values.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              aria-invalid={fieldErrors.nombre ? true : undefined}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
            {fieldErrors.nombre && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.nombre}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-empresa" className="mb-1 block text-xs font-medium text-zinc-500">
              Empresa / Rubro
            </label>
            <input
              id="lead-empresa"
              data-testid="lead-empresa"
              type="text"
              autoComplete="organization"
              placeholder="Ej: Textil Sur"
              value={values.empresa}
              onChange={(e) => handleChange("empresa", e.target.value)}
              aria-invalid={fieldErrors.empresa ? true : undefined}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
            {fieldErrors.empresa && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.empresa}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-whatsapp" className="mb-1 block text-xs font-medium text-zinc-500">
              WhatsApp
            </label>
            <input
              id="lead-whatsapp"
              data-testid="lead-whatsapp"
              type="tel"
              autoComplete="tel"
              placeholder="Ej: +54 9 351 555-1234"
              value={values.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              aria-invalid={fieldErrors.whatsapp ? true : undefined}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
            {fieldErrors.whatsapp && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.whatsapp}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-email" className="mb-1 block text-xs font-medium text-zinc-500">
              Email laboral
            </label>
            <input
              id="lead-email"
              data-testid="lead-email"
              type="email"
              autoComplete="email"
              placeholder="Ej: ana@empresa.com"
              value={values.email}
              onChange={(e) => handleChange("email", e.target.value)}
              aria-invalid={fieldErrors.email ? true : undefined}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando}
            data-testid="leads-submit"
            className="w-full rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Registrando..." : "Descargar Informe en PDF"}
          </button>
        </form>

        {submitError && (
          <p role="alert" data-testid="leads-error" className="mt-3 text-sm text-red-600">
            {submitError}
          </p>
        )}

        <p className="mt-4 text-xs text-zinc-400">
          Tus datos solo se usan para enviarte el informe y ofrecerte el diagnóstico.
        </p>
      </div>
    </div>
  );
}