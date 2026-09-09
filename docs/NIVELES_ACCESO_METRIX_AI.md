# NIVELES DE ACCESO — Metrix AI (OBJ-1)

> Frontera gratis/pago. Regla de dominio (ROADMAP §Fase 3, dossier `HUMAN-WEEXPECT.md` `OBJ-1`):
> **gratis si el dueño aportó todos los números; pago si Metrix aportó uno que él no tenía.**

## Qué decide el sistema (determinístico, ya implementado)

| Nivel | Cuándo | Fuente |
|---|---|---|
| `free` | Todos los drivers del outcome salen de inputs del usuario | `accessFromSources({ systemEstimatedDriver: false, ... })` |
| `contact-gated` | Hay driver estimado por el sistema (paid-eligible) y el desbloqueo es con contacto (flujo MVP-2) | `accessFromSources({ systemEstimatedDriver: true, gatedByContact: true })` |
| `paid` | Metrix aportó un número que el dueño no tenía (paid-eligible sin desbloqueo por contacto) | `accessFromSources({ systemEstimatedDriver: true, gatedByContact: false })` |

El combinación `systemEstimatedDriver=false` + `gatedByContact=true` es **incoherente**
y lanza `OutcomeError` (no puede haber gating por contacto si el sistema no estimó nada).

Implementación: `src/domain/shared/outcome.ts` → `accessFromSources` + campo
`Outcome.access`. El `id` (hash determinista) incluye `access`: mismo contenido con
nivel distinto = resultado distinto.

## Asignación actual por módulo (regla de dominio, no decisión comercial)

| Módulo | access | Justificación |
|---|---|---|
| `margen` (T1/MVP-1) | `free` | Comisión, merma, IVA, flete y costo los aporta el dueño (100% inputs) |
| `lead-magnet` (MVP-2) | `contact-gated` | La demanda es **estimada** por el sistema (paid-eligible); la puerta actual de entrega es el informe tras contacto |

## Qué decide Mariano (exclusivo; el sistema NO define precios ni niveles)

Dossier `HUMAN-WEEXPECT.md` §Waiver, línea 165: *"Dos decisiones siguen siendo tuyas
y de nadie más... los precios y niveles del producto."*

Pendiente de decisión (gate humano, no bloquea Fase 3):

1. **Lead-magnet**: ¿queda en `contact-gated` (informe tras lead) o pasa a `paid`
   (cobro directo, a implementar en fase posterior)? El contrato ya admite ambos.
2. **Módulos futuros con drivers estimados** (p.ej. curva de demanda MVP-3): ¿qué
   nivel les corresponde y con qué precio?
3. **Margen**: ¿algún outcome de margen debería ser paid en el futuro (p.ej.
   comparativas de mercado, benchmarks con datos externos)? Hoy todos sus drivers
   son del usuario → `free` por regla de dominio.
4. **Persistencia**: `Lead.access String?` (nullable, entitlement mínimo). Si se
   definen varios planes, migrar a modelo `Plan`/`Entitlement` (relación) en Fase 4+.

## Estado

- [x] Contrato `access: "free" | "contact-gated" | "paid"` en `Outcome` y OpenAPI.
- [x] Helper `accessFromSources` + validación en `buildOutcome`.
- [x] `access` fijo por módulo (margen → free; lead-magnet → contact-gated) — **45/45 tests Fase 3, suite 212/215**.
- [x] `Lead.access String?` en `schema.prisma` (db push aplicado local).
- [ ] **Decisión de Mariano sobre niveles y precios** (preguntas 1–4, arriba).
- [ ] Cobro real (`paid`) — fuera de alcance; se implementa en fase posterior si Mariano lo decide.