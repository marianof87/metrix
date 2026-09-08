"use client";

/**
 * metrix · components/CalculatorForm.tsx
 * Componente cliente reutilizable para los formularios de cada módulo.
 *
 * - Valida los inputs en cliente con el schema Zod ANTES de llamar a la API.
 * - Botón "Calcular": POST al endpoint del módulo y muestra el resultado.
 * - Botón "Guardar": POST /api/v1/scenarios con { scopeId: "default", module, inputs }
 *   y muestra "Escenario guardado" (política D5: solo se guarda bajo acción explícita).
 * - Soporta grupos dinámicos (p. ej. flujos de caja del ROI) con "Añadir"/"Quitar".
 */

import { useCallback, useMemo, useState } from "react";
import type { ZodType } from "zod";
import ResultPanel from "./ResultPanel";
import { isPercentField, parseField } from "./parseField";
import {
  quadraticInputSchema,
  pricingInputSchema,
  roiInputSchema,
  actuarialInputSchema,
} from "@/lib/validation";

export type ModuleId = "quadratic" | "pricing" | "roi" | "actuarial";

/**
 * Esquemas de validación compartidos. Se importan DIRECTAMENTE en el cliente
 * (mismo contrato que la API). No se pueden pasar desde un Server Component
 * por prop (un schema Zod no es serializable en el payload RSC), por eso se
 * resuelven acá por módulo.
 */
const SCHEMAS: Record<ModuleId, ZodType<any, any, any>> = {
  quadratic: quadraticInputSchema,
  pricing: pricingInputSchema,
  roi: roiInputSchema,
  actuarial: actuarialInputSchema,
};

export interface FieldDef {
  name: string;
  label: string;
  type: "number" | "text";
  placeholder?: string;
  help?: string;
  required?: boolean;
  /** sufijo visual (p. ej. "%", "€") junto al input */
  suffix?: string;
  /** autocompletar semántico opcional */
  autoComplete?: string;
}

export interface DynamicGroupDef {
  name: string;
  label: string;
  fields: FieldDef[];
  addLabel: string;
  removeLabel: string;
}

interface CalculatorFormProps {
  title: string;
  fields: FieldDef[];
  endpoint: string;
  module: ModuleId;
  dynamicGroups?: DynamicGroupDef[];
}

interface PrepareResult {
  ok: boolean;
  inputs: Record<string, unknown> | null;
  errors: Record<string, string[]>;
}

/** Acumula mensajes de error de Zod flatten bajo una clave de campo. */
function appendErrors(
  target: Record<string, string[]>,
  key: string,
  messages: string[]
) {
  target[key] = [...(target[key] ?? []), ...messages];
}

export default function CalculatorForm({
  title,
  fields,
  endpoint,
  module,
  dynamicGroups = [],
}: CalculatorFormProps) {
  // Estado de los inputs regulares: name → string
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, ""]))
  );

  // Estado de los grupos dinámicos: groupName → array de filas (campo→string)
  const [listValues, setListValues] = useState<Record<string, Record<string, string>[]>>(() =>
    Object.fromEntries(dynamicGroups.map((g) => [g.name, []]))
  );

  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | undefined>(undefined);

  // Construye el objeto de inputs crudo (string) para validación.
  const buildRawInputs = useCallback(
    (valuesMap: Record<string, string>, listsMap: Record<string, Record<string, string>[]>): Record<string, unknown> => {
      const inputs: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = valuesMap[f.name] ?? "";
        if (f.type === "text") {
          if (raw.trim() !== "") {
            inputs[f.name] = raw.trim();
          }
        } else {
          const parsed = parseField(f.name, raw);
          if (parsed !== undefined) {
            inputs[f.name] = parsed;
          }
        }
      }
      for (const g of dynamicGroups) {
        const rows = listsMap[g.name] ?? [];
        const mapped = rows
          .map((row) => {
            const obj: Record<string, unknown> = {};
            for (const f of g.fields) {
              const parsed = parseField(f.name, row[f.name] ?? "");
              if (parsed !== undefined) {
                obj[f.name] = parsed;
              }
            }
            return obj;
          })
          .filter((row) => Object.keys(row).length > 0);
        if (mapped.length > 0) {
          inputs[g.name] = mapped;
        } else if (rows.length > 0) {
          inputs[g.name] = mapped;
        }
      }
      return inputs;
    },
    [fields, dynamicGroups]
  );

  const prepare = useCallback(
    (valuesMap: Record<string, string>, listsMap: Record<string, Record<string, string>[]>): PrepareResult => {
      const raw = buildRawInputs(valuesMap, listsMap);
      const parsed = SCHEMAS[module].safeParse(raw);
      const errs: Record<string, string[]> = {};
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        if (flat.fieldErrors) {
          for (const [k, messages] of Object.entries(flat.fieldErrors)) {
            if (messages && messages.length > 0) {
              appendErrors(errs, k, messages);
            }
          }
        }
        if (flat.formErrors && flat.formErrors.length > 0) {
          appendErrors(errs, "_form", flat.formErrors);
        }
        return { ok: false, inputs: null, errors: errs };
      }
      return { ok: true, inputs: parsed.data as Record<string, unknown>, errors: errs };
    },
    [buildRawInputs, module]
  );

  const handleFieldChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setApiError(null);
    setSaveMessage(null);
  }, []);

  const handleListFieldChange = useCallback(
    (group: string, rowIndex: number, name: string, value: string) => {
      setListValues((prev) => {
        const groupRows = [...(prev[group] ?? [])];
        groupRows[rowIndex] = { ...groupRows[rowIndex], [name]: value };
        return { ...prev, [group]: groupRows };
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next[group];
        return next;
      });
      setApiError(null);
      setSaveMessage(null);
    },
    []
  );

  const addRow = useCallback((group: string) => {
    setListValues((prev) => ({
      ...prev,
      [group]: [...(prev[group] ?? []), {} as Record<string, string>],
    }));
  }, []);

  const removeRow = useCallback((group: string, rowIndex: number) => {
    setListValues((prev) => {
      const rows = [...(prev[group] ?? [])];
      rows.splice(rowIndex, 1);
      return { ...prev, [group]: rows };
    });
  }, []);

  const handleCalculate = useCallback(async () => {
    setApiError(null);
    setSaveMessage(null);
    const { ok, inputs, errors: errs } = prepare(values, listValues);
    setErrors(errs);
    if (!ok || !inputs) {
      return;
    }
    // Si el módulo es pricing, capturamos la moneda para el formateo del resultado.
    if (module === "pricing") {
      setCurrency(typeof inputs.currency === "string" ? inputs.currency : undefined);
    }
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiError(
          typeof data.error === "string" ? data.error : "Error al calcular el resultado."
        );
        setResult(null);
        return;
      }
      setResult(data as Record<string, unknown>);
    } catch {
      setApiError("No se pudo conectar con el servidor. Intente nuevamente.");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [prepare, values, listValues, endpoint, module]);

  const handleSave = useCallback(async () => {
    setApiError(null);
    setSaveMessage(null);
    const { ok, inputs, errors: errs } = prepare(values, listValues);
    setErrors(errs);
    if (!ok || !inputs) {
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scopeId: "default", module, inputs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiError(
          typeof data.error === "string"
            ? `No se pudo guardar: ${data.error}`
            : "No se pudo guardar el escenario."
        );
        return;
      }
      setSaveMessage("Escenario guardado");
    } catch {
      setApiError("No se pudo conectar con el servidor. Intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  }, [prepare, values, listValues, module]);

  const groupedFields = useMemo(() => {
    const dyn = new Set(dynamicGroups.map((g) => g.name));
    return {
      regular: fields.filter((f) => !dyn.has(f.name)),
      dynamic: dynamicGroups,
    };
  }, [fields, dynamicGroups]);

  const showErrors = (name: string) => errors[name] ?? [];

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleCalculate();
        }}
        noValidate
      >
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{title}</h2>
          {apiError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {apiError}
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {groupedFields.regular.map((field) => {
              const id = `field-${field.name}`;
              const hasError = showErrors(field.name).length > 0;
              return (
                <div
                  key={field.name}
                  className={field.type === "text" ? "sm:col-span-2" : ""}
                >
                  <label
                    htmlFor={id}
                    className="mb-1 block text-sm font-medium text-zinc-700"
                  >
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-red-500" aria-hidden="true">
                        *
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      id={id}
                      name={field.name}
                      type="text"
                      inputMode={field.type === "number" ? "decimal" : undefined}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      value={values[field.name] ?? ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      aria-invalid={hasError || undefined}
                      aria-describedby={
                        field.help || hasError
                          ? [
                              field.help ? `${id}-help` : "",
                              hasError ? `${id}-error` : "",
                            ]
                              .filter(Boolean)
                              .join(" ") || undefined
                          : undefined
                      }
                      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 ${
                        hasError
                          ? "border-red-400"
                          : "border-zinc-300"
                      }`}
                    />
                    {isPercentField(field.name) && (
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400"
                        aria-hidden="true"
                      >
                        %
                      </span>
                    )}
                    {!isPercentField(field.name) && field.suffix && (
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400"
                        aria-hidden="true"
                      >
                        {field.suffix}
                      </span>
                    )}
                  </div>
                  {field.help && (
                    <p id={`${id}-help`} className="mt-1 text-xs text-zinc-500">
                      {field.help}
                    </p>
                  )}
                  {hasError && (
                    <ul
                      id={`${id}-error`}
                      className="mt-1 space-y-0.5 text-xs text-red-600"
                      aria-live="polite"
                    >
                      {showErrors(field.name).map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grupos dinámicos */}
          {groupedFields.dynamic.map((group) => {
            const rows = listValues[group.name] ?? [];
            const hasError = showErrors(group.name).length > 0;
            return (
              <fieldset key={group.name} className="mt-5">
                <legend className="mb-2 text-sm font-medium text-zinc-700">
                  {group.label}
                </legend>
                {hasError && (
                  <ul className="mb-2 space-y-0.5 text-xs text-red-600" aria-live="polite">
                    {showErrors(group.name).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                )}
                {rows.length === 0 ? (
                  <p className="mb-2 text-xs text-zinc-500">
                    Sin filas. Agregue una para comenzar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                      >
                        {group.fields.map((field) => {
                          const id = `${group.name}-${rowIndex}-${field.name}`;
                          return (
                            <div key={field.name} className="min-w-40 flex-1">
                              <label
                                htmlFor={id}
                                className="mb-1 block text-xs font-medium text-zinc-600"
                              >
                                {field.label}
                              </label>
                              <div className="relative">
                                <input
                                  id={id}
                                  name={`${group.name}[${rowIndex}].${field.name}`}
                                  type="text"
                                  inputMode={
                                    field.type === "number" ? "decimal" : undefined
                                  }
                                  placeholder={field.placeholder}
                                  value={row[field.name] ?? ""}
                                  onChange={(e) =>
                                    handleListFieldChange(
                                      group.name,
                                      rowIndex,
                                      field.name,
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                                />
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => removeRow(group.name, rowIndex)}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:border-red-300 hover:text-red-600"
                          aria-label={`${group.removeLabel} fila ${rowIndex + 1}`}
                        >
                          {group.removeLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => addRow(group.name)}
                  className="mt-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                >
                  {group.addLabel}
                </button>
              </fieldset>
            );
          })}

          {errors["_form"] && (
            <ul className="mt-4 space-y-0.5 text-sm text-red-600" aria-live="polite">
              {errors["_form"].map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Calculando…" : "Calcular"}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="rounded-lg border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando…" : "Guardar"}
            </button>
            {saveMessage && (
              <span role="status" className="text-sm font-medium text-green-700">
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </form>

      <ResultPanel title="Resultado" result={result} currency={currency} />
    </div>
  );
}
