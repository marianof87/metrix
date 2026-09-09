# 📋 Plan Integral de Tests para metrix v1.0.0

> **Contexto**: 254 tests pasados (242 Vitest + 12 E2E). Objetivo: cerrar brechas críticas para producción.
> **Stack**: Next.js 15, React 19, TS, Prisma+SQLite, Zod, Vitest, Playwright.
> **Políticas**: D4 (RE_RUN preserva SAVED), D5 (guardado explícito), idempotencia `scopeId+module+inputHash+status`, auditoría append-only.

---

## 1. Validación de Entrada y Casos de Borde Matemática

| # | Test | Archivo | Inputs Exactos | Salida/Comportamiento Esperado | Técnica | Justificación |
|---|------|---------|----------------|--------------------------------|---------|---------------|
| 1.1 | `quadratic: a=0 → error validación` | `src/domain/quadratic/quadratic.test.ts` | `{a: 0, b: 2, c: 1}` | Lanza `ZodError` / `ValidationError` con mensaje "a no puede ser 0" | Boundary Value | Evita NaN; requisito explícito blueprint §3.2 |
| 1.2 | `quadratic: Δ>0 → 2 raíces reales` | `src/domain/quadratic/quadratic.test.ts` | `{a: 1, b: -3, c: 2}` | `roots: {x1: 2, x2: 1, multiplicity: null}` | Equivalence Partition | Cobertura rama principal |
| 1.3 | `quadratic: Δ=0 → raíz doble` | `src/domain/quadratic/quadratic.test.ts` | `{a: 1, b: 2, c: 1}` | `roots: {x1: -1, x2: -1, multiplicity: 'double'}` | Boundary Value | Caso degenerado crítico |
| 1.4 | `quadratic: Δ<0 → raíces complejas` | `src/domain/quadratic/quadratic.test.ts` | `{a: 1, b: 0, c: 1}` | `hasReals: false, roots: null` | Equivalence Partition | Reporte correcto de complejas |
| 1.5 | `quadratic: coeficientes decimales` | `src/domain/quadratic/quadratic.test.ts` | `{a: 0.5, b: -1.5, c: 1}` | Cálculo correcto con precisión ≤ 1e-10 | Property-based (float) | Precisión numérica |
| 1.6 | `quadratic: coeficientes negativos` | `src/domain/quadratic/quadratic.test.ts` | `{a: -2, b: 4, c: -2}` | `opensUp: false, vertex: {x: 1, y: 0}` | Equivalence Partition | Concavidad y vértice correctos |
| 1.7 | `pricing: desiredMarginPct = 1.0 → error` | `src/domain/pricing/pricing.test.ts` | `{baseCost: 100, desiredMarginPct: 1}` | Rechazo Zod: `desiredMarginPct` debe ser `< 1` | Boundary Value | División por cero en fórmula v1 |
| 1.8 | `pricing: desiredMarginPct = 0.999999` | `src/domain/pricing/pricing.test.ts` | `{baseCost: 100, desiredMarginPct: 0.999999}` | `suggestedPrice ≈ 100_000_000` (sin overflow) | Boundary Value | Límite superior numérico |
| 1.9 | `pricing: baseCost = 0` | `src/domain/pricing/pricing.test.ts` | `{baseCost: 0, desiredMarginPct: 0.3}` | `suggestedPrice = 0, grossMargin = 0` | Boundary Value | Caso borde válido |
| 1.10 | `lead-magnet: A > 0 → error validación` | `src/domain/leadmagnet/leadmagnet.test.ts` | `{coeficienteA: 1, coeficienteB: -10, coeficienteC: 100, precioMinimo: 10, precioMaximo: 100}` | Rechazo: "Coeficiente A debe ser negativo" | Boundary Value | Restricción concavidad (máximo) |
| 1.11 | `lead-magnet: precioMaximo = precioMinimo → error` | `src/domain/leadmagnet/leadmagnet.test.ts` | `{..., precioMinimo: 50, precioMaximo: 50}` | Rechazo: "El precio máximo debe ser mayor que el mínimo" | Boundary Value | Rango inválido |
| 1.12 | `lead-magnet: vértice fuera del rango → recorte a borde` | `src/domain/leadmagnet/leadmagnet.test.ts` | `{coeficienteA: -2, coeficienteB: 120, coeficienteC: -1000, precioMinimo: 10, precioMaximo: 30}` | `precioOptimo: 30` (vértice real = 30, en borde) | Boundary Value | Lógica de recorte correcta |
| 1.13 | `actuarial: years = 0 → compoundAmount = principal` | `src/domain/actuarial/actuarial.test.ts` | `{principal: 1000, annualRatePct: 0.05, periodsPerYear: 12, years: 0}` | `compoundAmount = 1000, compoundInterest = 0` | Boundary Value | Caso base identidad |
| 1.14 | `actuarial: periodsPerYear = 1 (anual) vs 12 (mensual)` | `src/domain/actuarial/actuarial.test.ts` | `{principal: 1000, annualRatePct: 0.12, periodsPerYear: 1, years: 1}` vs `periodsPerYear: 12` | `EAR` mensual > `EAR` anual | Property-based | Tasa efectiva correcta |

---

## 2. Robustez del Solver Numérico de TIR (IRR)

| # | Test | Archivo | Inputs Exactos | Salida/Comportamiento Esperado | Técnica | Justificación |
|---|------|---------|----------------|--------------------------------|---------|---------------|
| 2.1 | `roi: múltiples cambios de signo → múltiples TIRs` | `src/domain/roi/roi.test.ts` | `{initialInvestment: 1000, cashFlows: [{period:1, amount: 500}, {period:2, amount: -200}, {period:3, amount: 800}]}` | Retorna `null` o array `internalRateOfReturn: number[]` + warning | Error Guessing | Caso clásico de múltiples TIRs (Descartes) |
| 2.2 | `roi: solo salidas (nunca recupera)` | `src/domain/roi/roi.test.ts` | `{initialInvestment: 1000, cashFlows: [{period:1, amount: -100}, {period:2, amount: -50}]}` | `internalRateOfReturn: null` + flag `noConvergence: true` | Boundary Value | Solver no converge a raíz real positiva |
| 2.3 | `roi: flujo vacío` | `src/domain/roi/roi.test.ts` | `{initialInvestment: 1000, cashFlows: []}` | `paybackPeriod: null, internalRateOfReturn: null` | Boundary Value | Entrada degenerada |
| 2.4 | `roi: períodos desordenados` | `src/domain/roi/roi.test.ts` | `{initialInvestment: 1000, cashFlows: [{period:3, amount: 500}, {period:1, amount: 300}]}` | Debe ordenar internamente o rechazar | Error Guessing | Robustez de precondición |
| 2.5 | `roi: discountRatePct = 100% → NPV` | `src/domain/roi/roi.test.ts` | `{initialInvestment: 1000, cashFlows: [{period:1, amount: 1100}], discountRatePct: 100}` | `npv ≈ 550` (1100 / 2^1) | Boundary Value | Tasa extrema |
| 2.6 | `roi: bisección no converge en 100 iteraciones` | `src/domain/roi/roi.test.ts` | Flujo diseñado para oscilación lenta | Retorna `null` + `iterations: 100, converged: false` | Stress Testing | Guarda contra loop infinito |
| 2.7 | `roi: ROI simple con finalValue` | `src/domain/roi/roi.test.ts` | `{initialInvestment: 1000, finalValue: 1500}` | `roiPct: 50, netGain: 500` | Equivalence Partition | Variante simple sin flujos |

---

## 3. Inmutabilidad e Idempotencia del Historial

| # | Test | Archivo | Inputs Exactos | Salida/Comportamiento Esperado | Técnica | Justificación |
|---|------|---------|----------------|--------------------------------|---------|---------------|
| 3.1 | `scenario: re-ejecución crea RE_RUN, SAVED intacto` | `src/scenarios/scenario.service.test.ts` | 1. `POST /scenarios` (SAVED) → 2. `POST /scenarios/{id}/re-run` | 2 registros: original `status: SAVED`, nuevo `status: RE_RUN` con mismo `inputHash` | State Transition | Política D4/D5 — invariabilidad histórica |
| 3.2 | `scenario: idempotencia guardado duplicado` | `src/scenarios/scenario.service.test.ts` | `POST /scenarios` mismo `scopeId, module, inputs` 2 veces | Retorna mismo `id` (o 409 Conflict) — no crea duplicado | Idempotency Key | Clave compuesta evita duplicados accidentales |
| 3.3 | `scenario: concurrencia guardado simultáneo` | `src/scenarios/scenario.service.test.ts` | Disparar 2 `POST /scenarios` con mismo `scopeId, module, inputs` en paralelo (Promise.all) | Solo 1 registro creado; el otro retorna 409 o el existente | Concurrency Testing | Restricción `@@unique` en Prisma |
| 3.4 | `scenario: filtro por scopeId no fuga datos` | `src/app/api/v1/scenarios/route.test.ts` | Seed: 2 scopes (`A`, `B`). Query `?scopeId=A` | Solo registros de `A` | Security Testing | Aislamiento multi-tenant |
| 3.5 | `scenario: auditoría append-only` | `src/scenarios/audit.test.ts` | Ejecutar re-run 3 veces sobre mismo SAVED | 3 `AuditEntry` con `action: RE_RUN`, timestamps crecientes, sin DELETE/UPDATE | State Transition | Política append-only |

---

## 4. Integridad del Contrato de la API

| # | Test | Archivo | Inputs Exactos | Salida/Comportamiento Esperado | Técnica | Justificación |
|---|------|---------|----------------|--------------------------------|---------|---------------|
| 4.1 | `api/quadratic: tipo incorrecto → 400 Zod` | `src/app/api/v1/quadratic/route.test.ts` | `{a: "text", b: 1, c: 1}` | `400 {error: "a: Expected number, received string"}` | Contract Testing | Validación estricta en boundary |
| 4.2 | `api/pricing: marginPct = 1 → 400` | `src/app/api/v1/pricing/route.test.ts` | `{baseCost: 100, desiredMarginPct: 1}` | `400 {error: "desiredMarginPct: Must be less than 1"}` | Boundary Value | Fórmula v1 división por cero |
| 4.3 | `api/lead-magnet: A positivo → 400` | `src/app/api/v1/lead-magnet/route.test.ts` | `{coeficienteA: 2, coeficienteB: -10, coeficienteC: 100, precioMinimo: 10, precioMaximo: 100}` | `400` con path `["coeficienteA"]` | Contract Testing | Validación dominio compartida |
| 4.4 | `api/leads: email inválido → 400` | `src/app/api/v1/leads/route.test.ts` | `{nombre: "X", empresa: "Y", whatsapp: "123456", email: "no-email"}` | `400 {error: "email: Invalid email"}` | Contract Testing | Validación formato |
| 4.5 | `api/any: body 10MB → 413/400` | `src/app/api/v1/_middleware.test.ts` | `JSON.stringify({data: "x".repeat(10_000_000)})` | `413 Payload Too Large` o `400` | DoS Testing | Protección agotamiento memoria |
| 4.6 | `api/re-run: id inexistente → 404` | `src/app/api/v1/scenarios/[id]/re-run.test.ts` | `POST /api/v1/scenarios/999999/re-run` | `404 {error: "Scenario not found"}` | Error Guessing | Manejo graceful |
| 4.7 | `api: error interno Prisma → 500 genérico` | `src/app/api/v1/_error-handler.test.ts` | Mock `prisma.scenario.findUnique` → `throw new Error("DB connection lost")` | `500 {error: "Internal server error"}` **SIN stack trace** | Security Testing | No fuga de información |

---

## 5. UI, PDF y Accesibilidad

| # | Test | Archivo | Inputs / Acción | Salida/Comportamiento Esperado | Técnica | Justificación |
|---|------|---------|-----------------|--------------------------------|---------|---------------|
| 5.1 | `e2e: doble clic Save → un solo registro` | `src/e2e/historial.spec.ts` | Click rápido 2x en "Guardar" | 1 solo `SAVED` en DB; UI muestra toast "Guardado" | Race Condition | Prevención duplicados UX |
| 5.2 | `e2e: móvil (375px) → LeadModal responsive` | `src/e2e/lead-magnet.spec.ts` | `page.setViewportSize({width: 375, height: 667})` | Modal cabe, inputs accesibles, scroll si necesario | Visual Regression | UX móvil |
| 5.3 | `vitest: QuadraticChart no monta si a=0` | `src/components/QuadraticChart.test.tsx` | Render con `a=0` (validación fallida) | `Chart.js` no instanciado; muestra mensaje "Introduce coeficientes válidos" | Component Testing | Degradación graceful |
| 5.4 | `vitest: LeadMagnetForm genera PDF blob` | `src/components/LeadMagnetForm.test.tsx` | Mock `pdf-lib` → `fillForm` → click "Descargar" | `blob` no nulo; `blob.type === 'application/pdf'`; nombre incluye empresa | Integration Testing | Verifica pipeline PDF |
| 5.5 | `vitest: LeadModal accesibilidad (axe-core)` | `src/components/LeadModal.test.tsx` | `render(<LeadModal isOpen={true} />)` → `await axe(container)` | 0 violaciones WCAG 2.1 AA (foco, labels, role=dialog) | Accessibility Testing | Cumplimiento legal/ético |
| 5.6 | `e2e: gráfico quadratic en vivo actualiza al escribir` | `src/e2e/quadratic.spec.ts` | Type `a=1`, `b=-3`, `c=2` en inputs | Canvas Chart.js muestra parábola con vértice en x=1.5 | Visual / E2E | Reactividad en vivo |
| 5.7 | `vitest: ProfitChart destaca punto óptimo` | `src/components/ProfitChart.test.tsx` | Props con `puntoOptimo: {x: 30, y: 800}` | Dataset Chart.js incluye punto con `radius: 8` y `backgroundColor` distinto | Component Testing | Fidelidad visual |

---

## 6. Seguridad y Robustez

| # | Test | Archivo | Inputs Exactos | Salida/Comportamiento Esperado | Técnica | Justificación |
|---|------|---------|----------------|--------------------------------|---------|---------------|
| 6.1 | `validation: Infinity/NaN → rechazado` | `src/lib/validation.test.ts` | `{baseCost: Infinity}`, `{baseCost: NaN}` | `ZodError` — `z.number().finite()` bloquea | Boundary Value | Sanitización numérica |
| 6.2 | `validation: SQL injection en scopeId` | `src/lib/validation.test.ts` | `{scopeId: "' OR 1=1 --", module: "quadratic", inputs: {}}` | Rechazo Zod (string min 1, sin validación SQL) + Prisma parameterized query | Security Testing | Prevención inyección |
| 6.3 | `validation: XSS en nombre lead` | `src/lib/validation.test.ts` | `{nombre: "<script>alert(1)</script>", empresa: "X", whatsapp: "123", email: "a@b.c"}` | Aceptado (sanitizado en UI/PDF) o rechazado si política estricta | Security Testing | Defensa en profundidad |
| 6.4 | `api: rate limiting básico` | `src/app/api/v1/_rate-limit.test.ts` | 100 requests/seg a `/api/v1/quadratic` | Después de umbral → `429 Too Many Requests` | Stress Testing | DoS básico |
| 6.5 | `api: headers seguridad` | `src/app/api/v1/_headers.test.ts` | Cualquier request | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` | Security Hardening | Headers defensivos |
| 6.6 | `pdf-lib: informe no corrupto` | `src/lib/informePdf.test.ts` | Generar PDF con datos completos | `PDFDocument.load(bytes)` no lanza; páginas ≥ 1 | Integration Testing | Integridad artefacto |

---

## 📦 Archivos de Test a Crear / Extender

```
src/
├── domain/
│   ├── quadratic/quadratic.test.ts          # + tests 1.1–1.6
│   ├── pricing/pricing.test.ts              # + tests 1.7–1.9
│   ├── leadmagnet/leadmagnet.test.ts        # + tests 1.10–1.12 (ya 24 tests)
│   ├── roi/roi.test.ts                      # + tests 2.1–2.7 (nuevo archivo)
│   └── actuarial/actuarial.test.ts          # + tests 1.13–1.14 (nuevo archivo)
├── scenarios/
│   ├── scenario.service.test.ts             # + tests 3.1–3.3
│   └── audit.test.ts                        # + test 3.5 (nuevo)
├── app/api/v1/
│   ├── quadratic/route.test.ts              # + test 4.1
│   ├── pricing/route.test.ts                # + test 4.2
│   ├── lead-magnet/route.test.ts            # + test 4.3
│   ├── leads/route.test.ts                  # + test 4.4
│   ├── scenarios/route.test.ts              # + tests 4.5, 4.6
│   ├── scenarios/[id]/re-run.test.ts        # + test 4.6
│   └── _middleware.test.ts                  # + tests 4.5, 6.4
│   └── _error-handler.test.ts               # + test 4.7
│   └── _headers.test.ts                     # + test 6.5
├── lib/
│   ├── validation.test.ts                   # + tests 6.1–6.3
│   └── informePdf.test.ts                   # + test 6.6 (ya existe smoke)
├── components/
│   ├── QuadraticChart.test.tsx              # + test 5.3
│   ├── LeadMagnetForm.test.tsx              # + test 5.4 (ya existe)
│   ├── LeadModal.test.tsx                   # + test 5.5 (ya existe)
│   └── ProfitChart.test.tsx                 # + test 5.7
└── e2e/
    ├── historial.spec.ts                    # + test 5.1
    ├── lead-magnet.spec.ts                  # + tests 5.2 (ya existe)
    └── quadratic.spec.ts                    # + test 5.6 (ya existe)
```

---

## 🎯 Priorización para v1.0.0 (Impacto en Estabilidad)

| Prioridad | Frentes | Tests Clave |
|-----------|---------|-------------|
| **ALTA** | 1. Matemática, 3. Inmutabilidad, 6. Seguridad | 1.1, 1.7, 1.10, 2.1–2.4, 3.1–3.3, 4.7, 6.1–6.2 |
| **MEDIA** | 4. Contrato API, 5. UI/Accesibilidad | 4.1–4.6, 5.3–5.5 |
| **BAJA** | 5.6–5.7 (visual), 6.4–6.6 (hardening) | 5.6, 5.7, 6.4, 6.6 |

---

## ✅ Criterios de Aceptación para Implementación

1. **Determinismo**: Cada test produce el mismo resultado en cualquier máquina/CI.
2. **Aislamiento**: Tests de dominio no tocan DB; tests de servicio usan Prisma test client o mock; E2E usan DB temporal o `test:db` script.
3. **E2E**: Requieren `npm run dev` en background (configurado en `playwright.config.ts` con `webServer`).
4. **Cobertura objetivo**: ≥ 95% líneas en `domain/`, ≥ 90% en `scenarios/`, ≥ 80% en `app/api/`.
5. **Sin flakiness**: Tests E2E con `test.retry(2)` solo para transiciones de red; lógica pura sin retries.