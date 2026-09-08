"use client";

/**
 * metrix · components/ScenarioList.tsx
 * Lista de escenarios del historial (scopeId "default"), filtrable por módulo
 * y estado. Al montar hace GET /api/v1/scenarios?scopeId=default (con filtros
 * opcionales) y permite abrir el detalle de cada registro.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScenarioDetail, {
  formatDate,
  moduleLabel,
  shortHash,
  StatusBadge,
} from "./ScenarioDetail";
import type { ScenarioRecord } from "@/scenarios/types";

const MODULES: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos los módulos" },
  { value: "quadratic", label: "Cuadrática" },
  { value: "pricing", label: "Precios" },
  { value: "roi", label: "ROI" },
  { value: "actuarial", label: "Actuario" },
];

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos los estados" },
  { value: "DRAFT", label: "DRAFT" },
  { value: "COMPUTED", label: "COMPUTED" },
  { value: "SAVED", label: "SAVED" },
  { value: "RE_RUN", label: "RE_RUN" },
];

export default function ScenarioList() {
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>([]);
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const buildUrl = useCallback((module: string, status: string) => {
    const params = new URLSearchParams({ scopeId: "default" });
    if (module) params.set("module", module);
    if (status) params.set("status", status);
    return `/api/v1/scenarios?${params.toString()}`;
  }, []);

  const fetchList = useCallback(
    async (module: string, status: string) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildUrl(module, status), { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          scenarios?: ScenarioRecord[];
          error?: string;
        };
        if (seq !== requestSeq.current) {
          return; // respuesta obsoleta (cambió el filtro)
        }
        if (!res.ok) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "No se pudieron cargar los escenarios."
          );
          setScenarios([]);
          return;
        }
        setScenarios(data.scenarios ?? []);
      } catch {
        if (seq !== requestSeq.current) {
          return;
        }
        setError("No se pudo conectar con el servidor. Intente nuevamente.");
        setScenarios([]);
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
        }
      }
    },
    [buildUrl]
  );

  useEffect(() => {
    void fetchList(moduleFilter, statusFilter);
  }, [moduleFilter, statusFilter, fetchList]);

  // Guardamos el callback sin filtros para refrescar tras re-ejecutar.
  const refreshAll = useCallback(() => {
    void fetchList(moduleFilter, statusFilter);
  }, [fetchList, moduleFilter, statusFilter]);

  const selected = useMemo(
    () => scenarios.find((s) => s.id === selectedId) ?? null,
    [scenarios, selectedId]
  );

  return (
    <div>
      {/* Filtros */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="scenario-filter-module"
            className="mb-1 block text-sm font-medium text-zinc-700"
          >
            Módulo
          </label>
          <select
            id="scenario-filter-module"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          >
            {MODULES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="scenario-filter-status"
            className="mb-1 block text-sm font-medium text-zinc-700"
          >
            Estado
          </label>
          <select
            id="scenario-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estados de carga / error */}
      {loading && (
        <p role="status" className="mt-4 text-sm text-zinc-600">
          Cargando escenarios…
        </p>
      )}
      {!loading && error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Lista */}
      {!loading && !error && scenarios.length === 0 && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-zinc-700">Sin escenarios guardados</p>
          <p className="mt-1 text-sm text-zinc-500">
            Use un módulo (Cuadrática, Precios, ROI o Actuario), cargue los
            parámetros y presione <strong>Guardar</strong> para que aparezca acá.
          </p>
        </div>
      )}

      {!loading && !error && scenarios.length > 0 && (
        <ul className="mt-4 space-y-3" aria-label="Escenarios guardados">
          {scenarios.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {moduleLabel(s.module)}
                  </span>
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-zinc-500">
                    {formatDate(s.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 sm:inline">
                    {s.formulaVersion}
                  </span>
                  <span
                    className="font-mono text-xs text-zinc-500"
                    title={`${s.inputHash} · ${s.id}`}
                  >
                    {shortHash(s.inputHash)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-expanded={selectedId === s.id}
                    aria-controls={selectedId === s.id ? "scenario-detail" : undefined}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Detalle */}
      {selected && (
        <div id="scenario-detail">
          <ScenarioDetail
            scenarioId={selected.id}
            onReRun={() => void refreshAll()}
          />
        </div>
      )}
    </div>
  );
}