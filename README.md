# metrix

Suite de simuladores de negocio: **ecuación cuadrática**, **precios**, **ROI** y
**actuarial**, con historial de escenarios guardados, auditoría inmutable y
re-ejecución con `RE_RUN`.

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Prisma + SQLite ·
Zod (contrato compartido) · Tailwind · Vitest · Playwright.

## Requisitos

- Node.js ≥ 20 (desarrollado con Node 24)
- npm

## Arranque rápido (< 10 min)

```bash
git clone <repo-url> metrix
cd metrix
npm install        # postinstall ejecuta `prisma generate`
cp .env.example .env   # DATABASE_URL=file:./prisma/dev.db
npm run prisma:push     # crea prisma/dev.db y sincroniza el schema
npm run dev              # http://localhost:3000
```

Abrir `http://localhost:3000` y usar los 4 módulos + Historial.

> La app funciona si `.env` no existe (valores por defecto), pero se recomienda
> copiar `.env.example` para crear la base SQLite con un solo comando.

## Uso

| Ruta | Módulo |
|---|---|
| `/quadratic` | Resolución de ecuación cuadrática con **gráfico cartesiano en vivo** |
| `/pricing` | Sugerencia de precio con margen, impuesto y descuento (fórmula v1) |
| `/lead-magnet` | Simulador de precios con escenario, curva de ganancia, captura de lead e informe PDF |
| `/roi` | ROI, payback e IRR sobre flujos de caja |
| `/actuarial` | Cálculo actuarial de capital con interés compuesto |
| `/historial` | Escenarios guardados: filtros, detalle, auditoría y "Re-ejecutar" |

Cada cálculo se guarda **solo** con el botón "Guardar" (política D5). Re-ejecutar
desde el historial crea un registro **RE_RUN** nuevo, preservando el original
(política D4). La clave de idempotencia es `scopeId + module + inputHash + status`,
así un `SAVED` y un `RE_RUN` del mismo input coexisten.

## API

- `POST /api/v1/{quadratic|pricing|roi|actuarial}` — calcular sin persistir
- `POST /api/v1/margen` — margen real por unidad, piso de precio, punto de equilibrio y traslado de suba (fórmula v1 `margen-v1`) — **respuesta en formato honesto `Outcome`** (OBJ-2)
- `POST /api/v1/lead-magnet` — optimizar precio y generar curva de ganancia (lead magnet)
- `POST /api/v1/leads` — persistir contacto para descarga de informe PDF
- `GET /api/v1/scenarios` — listar (`scopeId`, `module`, `status` como query)
- `POST /api/v1/scenarios` — guardar un escenario (`{ scopeId, module, inputs }`)
- `GET /api/v1/scenarios/[id]` — detalle + auditoría
- `POST /api/v1/scenarios/[id]/re-run` — re-ejecutar (crea `RE_RUN`)

Contrato OpenAPI: `src/app/api/v1/openapi/openapi.json` (margen pendiente de incorporar).

## Tests

```bash
npm test          # 175 tests Vitest (dominio, servicio, contratos API, componentes)
npm run test:e2e  # 12 tests Playwright (módulos, lead magnet, gráfico en vivo e historial)
npm run lint
npm run typecheck
npm run build
```

Suite actual: **206 tests Vitest — 203 verdes, 3 falls conocidos** (deuda técnica:
concurrencia en `scenario.service` y 500 de `/api/v1/lead-magnet` por mismatch de
exports → roadmap Fase 4 de Metrix AI).

## OBJ-2 — honestidad antes que precisión

Desde la Fase 2 de Metrix AI, **ninguna salida de producto es un número falso con
decimales**. Todo resultado se expresa como un `Outcome`:

```ts
interface Outcome {
  id: string;                    // hash canónico determinista del contenido
  range: [number, number];       // intervalo honesto [min, max]
  driver: string;                // la causa principal del resultado (castellano)
  action: string;                // una acción concreta, no un dato (castellano)
  confidence: "baja" | "media" | "alta";
}
```

- `POST /api/v1/margen` responde `{ outcomes: Outcome[], formulaVersion }`. La
  `confidence` es heurística determinística (Fase 1–4 sin infraestructura de
  medición): margen → `"alta"` (todos los drivers vienen del input del usuario);
  lead-magnet → `"media"`/`"baja"` (la demanda es estimada, nunca medida).
- Contrato OpenAPI: `src/app/api/v1/openapi/openapi.json` (schema `Outcome`).

## Estructura

```
src/
  domain/            # Dominio puro (fórmulas v1) + tests
  scenarios/         # Servicio + repositorio + auditoría
  lib/               # Zod validation, helpers API, Prisma
  app/api/v1/        # Route Handlers
  app/{modulos}/     # Páginas UI cliente
  components/        # CalculatorForm, ResultPanel, ScenarioList, ScenarioDetail
  e2e/               # Playwright specs
schema.prisma        # Schema Prisma (raíz, ver nota)
docs/                # Blueprint arquitectura y plan
```

Nota: `schema.prisma` vive en la raíz para que el CLI y el runtime resuelvan la
misma base SQLite (`prisma/dev.db`).

## Documentación

- `docs/METRIX_ARQUITECTURA_Y_PLAN.md` — blueprint completo: decisiones D1–D6,
  fórmulas v1, modelo de datos, protocolo de testing y fases CA0–CA8.