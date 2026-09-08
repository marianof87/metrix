"use client";

/**
 * metrix · components/ResultPanel.tsx
 * Renderiza el resultado de un cálculo como pares clave/valor.
 *
 * Recibe `result` en la forma `{ formulaVersion, ...rest }` (el `formulaVersion`
 * se muestra como etiqueta y el resto como tabla).
 *
 * Formato:
 *  - números: hasta 6 decimales, eliminando ceros finales.
 *  - booleanos: "Sí" / "No".
 *  - objetos anidados: sub-lista (p. ej. `breakdown`).
 *  - arrays de muestras (quadratic `samples`): tabla x → y.
 *  - raíces (quadratic `roots`): según kind real / double / complex.
 *  - campos de moneda: formato con Intl.NumberFormat si `currency` viene, si no símbolo "$".
 *  - campos de porcentaje: según su naturaleza (ratio ×100 o ya en %) con sufijo "%".
 */

interface ResultPanelProps {
  title: string;
  result: Record<string, unknown> | null;
  currency?: string;
}

/** Claves cuyo valor ya viene en % (50 = 50%). */
const INTRINSIC_PERCENT_KEYS = new Set([
  "roiPct",
  "roiAnnualizedPct",
  "internalRateOfReturn",
]);

/** Claves cuyo valor es un ratio (0.3 = 30%): se multiplica por 100. */
const RATIO_PERCENT_KEYS = new Set([
  "marginPct",
  "effectiveAnnualRatePct",
  "percentMargin",
]);

/** Claves de monto monetario. */
const MONEY_KEYS = new Set([
  "suggestedPrice",
  "priceWithDiscount",
  "priceWithTax",
  "finalPrice",
  "grossMargin",
  "totalRevenue",
  "totalCost",
  "netGain",
  "npv",
  "compoundAmount",
  "compoundInterest",
  "futureValueAnnuity",
  "presentValueDiscount",
  "initialInvestment",
  "principal",
  "contributionPerPeriod",
  "baseCost",
  "addedValue",
  "finalValue",
]);

export function trimNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const rounded = Math.round(value * 1e6) / 1e6;
  // Hasta 6 decimales, eliminando ceros finales.
  const fixed = rounded.toFixed(6).replace(/\.?0+$/, "");
  return fixed === "" || fixed === "-0" ? "0" : fixed;
}

function numberToPercent(n: number): string {
  return `${trimNumber(n)}%`;
}

function money(n: number, currency?: string): string {
  if (currency) {
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency,
      }).format(n);
    } catch {
      // moneda inválida → fallback genérico
    }
  }
  return `$${trimNumber(n)}`;
}

export function formatValue(key: string, value: unknown, currency?: string): string {
  if (typeof value === "number") {
    if (INTRINSIC_PERCENT_KEYS.has(key)) {
      return numberToPercent(value);
    }
    if (RATIO_PERCENT_KEYS.has(key)) {
      return numberToPercent(value * 100);
    }
    if (MONEY_KEYS.has(key)) {
      return money(value, currency);
    }
    return trimNumber(value);
  }
  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }
  if (value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

/** Renderiza una fila clave/valor con recursión para objetos y arrays simples. */
function renderRow(key: string, value: unknown, currency?: string) {
  if (key === "roots" && value && typeof value === "object" && !Array.isArray(value)) {
    return renderRoots(value as Record<string, unknown>);
  }
  if (key === "samples" && Array.isArray(value)) {
    return renderSamples(value as { x: number; y: number }[]);
  }
  if (Array.isArray(value)) {
    return renderArray(key, value, currency);
  }
  if (value && typeof value === "object") {
    return renderObject(key, value as Record<string, unknown>, currency);
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-1.5 last:border-0">
      <dt className="text-sm capitalize text-zinc-500">{prettifyKey(key)}</dt>
      <dd className="text-right text-sm font-medium text-zinc-900">
        {formatValue(key, value, currency)}
      </dd>
    </div>
  );
}

export function prettifyKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.toLowerCase();
}

function renderObject(key: string, obj: Record<string, unknown>, currency?: string) {
  return (
    <div className="py-1">
      <dt className="text-sm font-medium capitalize text-zinc-700">{prettifyKey(key)}</dt>
      <dd className="mt-1 rounded-lg bg-zinc-50 p-3 pl-4">
        <dl className="space-y-0">
          {Object.entries(obj)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => (
              <div key={k}>
                {renderNestedRow(k, v, currency)}
              </div>
            ))}
        </dl>
      </dd>
    </div>
  );
}

function renderNestedRow(key: string, value: unknown, currency?: string) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return renderObject(key, value as Record<string, unknown>, currency);
  }
  if (Array.isArray(value)) {
    return renderArray(key, value, currency);
  }
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <dt className="text-xs capitalize text-zinc-500">{prettifyKey(key)}</dt>
      <dd className="text-right text-sm text-zinc-800">
        {formatValue(key, value, currency)}
      </dd>
    </div>
  );
}

function renderSamples(samples: { x: number; y: number }[]) {
  return (
    <div className="py-1">
      <dt className="text-sm font-medium capitalize text-zinc-700">Tabla de valores</dt>
      <dd className="mt-1 overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-1.5 font-medium">x</th>
              <th className="px-3 py-1.5 font-medium">f(x)</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-3 py-1 tabular-nums">{trimNumber(s.x)}</td>
                <td className="px-3 py-1 tabular-nums">{trimNumber(s.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </dd>
    </div>
  );
}

function renderRoots(roots: Record<string, unknown>) {
  const kind = roots.kind;
  let content: string;
  if (kind === "real") {
    content = `x₁ = ${trimNumber(roots.x1 as number)} · x₂ = ${trimNumber(roots.x2 as number)}`;
  } else if (kind === "double") {
    content = `x = ${trimNumber(roots.x as number)} (raíz doble)`;
  } else {
    const x1 = roots.x1 as { real: number; imaginary: number };
    const x2 = roots.x2 as { real: number; imaginary: number };
    const sign1 = x1.imaginary < 0 ? "−" : "+";
    const sign2 = x2.imaginary < 0 ? "−" : "+";
    content = `x₁ = ${trimNumber(x1.real)} ${sign1} ${trimNumber(Math.abs(x1.imaginary))}i · x₂ = ${trimNumber(x2.real)} ${sign2} ${trimNumber(Math.abs(x2.imaginary))}i`;
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-1.5 last:border-0">
      <dt className="text-sm capitalize text-zinc-500">raíces</dt>
      <dd className="text-right text-sm font-medium text-zinc-900">{content}</dd>
    </div>
  );
}

function renderArray(key: string, arr: unknown[], currency?: string) {
  // Flujos de caja (roi breakdown.cashFlows): { period, amount }[]
  if (arr.every((it) => it && typeof it === "object" && !Array.isArray(it))) {
    return (
      <div className="py-1">
        <dt className="text-sm font-medium capitalize text-zinc-700">{prettifyKey(key)}</dt>
        <dd className="mt-1 space-y-0.5">
          {arr.map((item, i) => {
            const obj = item as Record<string, unknown>;
            return (
              <div key={i} className="rounded bg-zinc-50 px-3 py-1 text-sm">
                {Object.entries(obj)
                  .map(([k, v]) => `${prettifyKey(k)}: ${formatValue(k, v, currency)}`)
                  .join(" · ")}
              </div>
            );
          })}
        </dd>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-1.5 last:border-0">
      <dt className="text-sm capitalize text-zinc-500">{prettifyKey(key)}</dt>
      <dd className="text-right text-sm font-medium text-zinc-900">
        [{arr.map((v, i) => formatValue(key, v, currency)).join(", ")}]
      </dd>
    </div>
  );
}

export default function ResultPanel({ title, result, currency }: ResultPanelProps) {
  if (!result) {
    return null;
  }
  const { formulaVersion, ...rest } = result;
  const entries = Object.entries(rest).filter(
    ([, v]) => v !== undefined && v !== null
  );

  return (
    <section
      aria-label={title}
      className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {typeof formulaVersion === "string" && formulaVersion !== "" && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
            {formulaVersion}
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin resultados.</p>
      ) : (
        <dl className="space-y-0.5">
          {entries.map(([key, value]) => (
            <div key={key} className="mb-1 last:mb-0">
              {renderRow(key, value, currency)}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
