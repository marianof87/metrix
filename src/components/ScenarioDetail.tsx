"use client";

/**
 * metrix · components/ScenarioDetail.tsx
 * Detalle de un escenario del historial:
 *  - inputs y outputs como pares clave/valor (reutiliza ResultPanel + helpers).
 *  - auditoría: GET /api/v1/scenarios/{id} → { scenario, audits }.
 *  - "Re-ejecutar": POST /api/v1/scenarios/{id}/re-run (sin body) → 201
 *    { scenario, reRunOf } y refresca la lista vía onReRun.
 *
 * Exporta además helpers compartidos con ScenarioList (badge de estado, fechas).
 */

import { useCallback, useEffect, useState } from "react";
import ResultPanel from "./ResultPanel";
import type {
  ScenarioRecord,
  AuditEntryRecord,
  ScenarioStatus,
  ScenarioModule,
} from "@/scenarios/types";

// --- Helpers compartidos con ScenarioList ---

const MODULE_LABELS: Record<ScenarioModule, string> = {
  quadratic: "Cuadrática",
  pricing: "Precios",
  roi: "ROI",
  actuarial: "Actuario",
};

const STATUS_STYLES: Record<ScenarioStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  COMPUTED: "bg-blue-100 text-blue-700",
  SAVED: "bg-green-100 text-green-700",
  RE_RUN: "bg-violet-100 text-violet-700",
};

export function moduleLabel(module: string): string {
  return MODULE_LABELS[module as ScenarioModule] ?? module;
}

export function formatDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) {
    return String(iso);
  }
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function shortHash(hash: string): string {
  if (!hash) return "—";
  return hash.length > 8 ? `${hash.slice(0, 8)}…` : hash;
}

export function StatusBadge({ status }: { status: ScenarioStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}

// --- Tipos de la respuesta de la API ---

interface DetailResponse {
  scenario: ScenarioRecord;
  audits: AuditEntryRecord[];
}

interface ReRunResponse {
  scenario: ScenarioRecord;
  reRunOf: string;
}

interface ScenarioDetailProps {
  scenarioId: string;
  onReRun?: () => void;
}

function currencyFrom(inputs: Record<string, unknown>): string | undefined {
  return typeof inputs.currency === "string" && inputs.currency !== ""
    ? inputs.currency
    : undefined;
}

export default function ScenarioDetail({ scenarioId, onReRun }: ScenarioDetailProps) {
  const [scenario, setScenario] = useState<ScenarioRecord | null>(null);
  const [audits, setAudits] = useState<AuditEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReRunning, setIsReRunning] = useState(false);
  const [reRunMessage, setReRunMessage] = useState<string | null>(null);
  const [reRunError, setReRunError] = useState<string | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/scenarios/${id}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<DetailResponse> & {
        error?: string;
      };
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "No se pudo cargar el detalle."
        );
        setScenario(null);
        setAudits([]);
        return;
      }
      setScenario(data.scenario ?? null);
      setAudits(data.audits ?? []);
    } catch {
      setError("No se pudo conectar con el servidor. Intente nuevamente.");
      setScenario(null);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDetail(scenarioId);
  }, [scenarioId, loadDetail]);

  const handleReRun = useCallback(async () => {
    if (!scenario) return;
    setIsReRunning(true);
    setReRunMessage(null);
    setReRunError(null);
    try {
      const res = await fetch(`/api/v1/scenarios/${scenario.id}/re-run`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ReRunResponse> & {
        error?: string;
      };
      if (!res.ok) {
        setReRunError(
          typeof data.error === "string" ? data.error : "No se pudo re-ejecutar."
        );
        return;
      }
      setReRunMessage("Re-ejecutado — nuevo registro RE_RUN creado");
      onReRun?.();
    } catch {
      setReRunError("No se pudo conectar con el servidor. Intente nuevamente.");
    } finally {
      setIsReRunning(false);
    }
  }, [scenario, onReRun]);

  if (loading) {
    return (
      <section
        aria-label="Detalle del escenario"
        className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <p role="status" className="text-sm text-zinc-600">
          Cargando detalle…
        </p>
      </section>
    );
  }

  if (error || !scenario) {
    return (
      <section
        aria-label="Detalle del escenario"
        className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <p role="alert" className="text-sm text-red-700">
          {error ?? "No se encontró el escenario."}
        </p>
      </section>
    );
  }

  const currency = currencyFrom(scenario.inputs);

  return (
    <section
      aria-label={`Detalle del escenario ${shortHash(scenario.inputHash)}`}
      className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          {moduleLabel(scenario.module)}
          <span className="ml-2">
            <StatusBadge status={scenario.status} />
          </span>
        </h3>
        <span className="text-xs text-zinc-500">
          Creado {formatDate(scenario.createdAt)}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-zinc-500">ID</dt>
          <dd className="truncate font-mono text-xs text-zinc-800" title={scenario.id}>
            {scenario.id}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-zinc-500">Versión de fórmula</dt>
          <dd className="text-zinc-800">{scenario.formulaVersion}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-zinc-500">Input hash</dt>
          <dd
            className="max-w-52 truncate font-mono text-xs text-zinc-800"
            title={scenario.inputHash}
          >
            {scenario.inputHash}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-zinc-500">Actualizado</dt>
          <dd className="text-zinc-800">{formatDate(scenario.updatedAt)}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <ResultPanel title="Inputs" result={scenario.inputs} currency={currency} />
      </div>

      <div className="mt-2">
        <ResultPanel title="Resultados" result={scenario.outputs} currency={currency} />
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-zinc-700">Auditoría</h4>
        {audits.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">Sin auditoría registrada.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {audits.map((audit) => (
              <li
                key={audit.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
              >
                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
                  {audit.action}
                </span>
                <span className="text-zinc-600">
                  {audit.fromStatus ?? "—"} → {audit.toStatus}
                </span>
                <span className="ml-auto text-xs text-zinc-400">
                  {formatDate(audit.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleReRun()}
          disabled={isReRunning}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isReRunning ? "Re-ejecutando…" : "Re-ejecutar"}
        </button>
        {reRunMessage && (
          <span role="status" className="text-sm font-medium text-green-700">
            {reRunMessage}
          </span>
        )}
        {reRunError && (
          <span role="alert" className="text-sm font-medium text-red-700">
            {reRunError}
          </span>
        )}
      </div>
    </section>
  );
}