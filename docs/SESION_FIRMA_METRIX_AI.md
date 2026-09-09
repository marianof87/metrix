# Sesión de firma — HUMAN-WEEXPECT (Metrix AI)

> **Este documento es un GUION.** No es el dossier. No contiene respuestas.
> Las respuestas las escribe un humano (Mariano, y mejor con un dueño/a real al lado).
> Ningún agente puede completar ni firmar el dossier (regla dura del propio `HUMAN-WEEXPECT.md`).

## 0. Objetivo de la sesión

Salir con el dossier `HUMAN-WEEXPECT.md` **firmado y depositado** como `HUMAN-WEEXPECT.md`
(renombrado, hoy está como `HUMAN-WEEXPECT.md.md`). Es el **Gate 0** del roadmap: sin firma
no se toca código de producto.

| Qué | Detalle |
|---|---|
| Duración | 20–40 minutos. Se puede hacer hablando y que alguien transcriba |
| Participantes | Mínimo: Mariano. Ideal: + un dueño/a de negocio real (30 min por teléfono) |
| Regla del 1er borrador | Los textos que dejó la IA son **punto de partida**: hay que reescribir lo que no diga lo que pensás y tachar lo que sobre. Un borrador intacto = `UNSIGNED` |
| Contador de filas | Al final se cuenta cuántas filas escribiste/reescribiste vos: ese número va en `rows-authored-or-rewritten` |

## 1. Guion de arranque (2 min)

Leer al dueño/a (si está) o a vos mismo:

> "Vamos a hacer Metrix AI, una herramienta que te dice si un producto te deja plata o te la saca,
> y cuánto tenés que vender para no perder margen si hacés un descuento. Antes de construir nada
> necesito saber qué esperás sentir cuando la uses y qué te haría no volver a abrirla. No hay
> respuestas correctas; cuanto más crudo, mejor."

## 2. §Roles (3 min)

Pregunta: **"¿Quiénes van a usar esto en serio en la v1.0? Poné nombre y relación con la herramienta
(diario, ocasional, una sola vez)."**

- Si hay un tercer rol (contador, encargado de compras, vendedor), agregarlo con nombre.
- Si el dueño/a real no está: la fila del dueño la responde Mariano **y se anota `(aproximación)`** en la columna *Answered by*.

## 3. §Stories (10–15 min)

Para **cada rol**, leer estas tres preguntas en voz alta y anotar lo que diga:
1. Contame lo primero que harías el día que esto exista.
2. ¿Qué hacés hoy a mano que esto debería absorber?
3. ¿Qué mirarías cada mañana, o cada vez que entrás?

Formato estricto de cada historia (el armazón en inglés lo lee una máquina; el contenido en castellano):
`As <rol>, I <hago algo concreto>, so that <el resultado que realmente quiero>. [ID]`

Reglas de chequeo por historia (usar como checklist, no como respuesta):
- **Verbo concreto**, no lista de funcionalidades ("gestionar configuración" NO es una historia).
- Termina en un resultado que el rol puede **confirmar que pasó**.
- Entre **3 y 7** por rol. Menos de 3 = no entendemos el rol; más de 7 = v1.0 se agranda de más.
- El ID responde a la referencia rápida: `[MVP-1]`, `[MVP-2]`, `[MVP-3]`, `[OBJ-1]`, `[OBJ-2]`, `[VIS-1]`… Si una historia no responde a ninguno → anotarlo; probablemente falte un elemento fundacional (eso es un hallazgo, no un error).

Nota para Mariano: las 3 historias de "Dueño/a" pre-redactadas por la IA son **candidatas a reescribir** si no dicen lo que vos (o el dueño real) pensás. Las historias de "Mariano" están todas vacías: escribirlas.

## 4. §Felt-quality (10 min) — la sección por la que existe el documento

Para **cada rol**, dos preguntas (crudas, específicas, sin suavizar):

- **Refuse-to-use bar**: *"¿Qué tendría que hacer (o pedirte) esto para que no lo vuelvas a abrir?"*
  - Ejemplo de nivel de crudeza esperado (del propio dossier): "si me pide quince datos que no tengo a mano antes de mostrarme algo". Algo así de concreto, no "que sea difícil de usar".
- **Workable bar**: *"¿Cómo te das cuenta de que funciona? ¿Qué ves/pasa que te hace decir 'esto sirve'?"*
  - Ejemplo: "en dos minutos y con lo que tengo en la factura, me dice cuál producto me está haciendo perder plata".

Recordatorio para quien entrevista: estas respuestas quedan como un **eje del tablero de calidad que solo el humano puede poner en verde**, después de usar el producto con datos reales. Ningún test automático lo puede aprobar.

## 5. §Demo-scene (5 min)

Para cada rol, un escenario observable con el formato:
`I open <qué abro>, I see <qué veo>, I complete <qué logro> in ≤ <N> steps.`

Preguntas guía: qué pantalla abre, qué ve en esa pantalla, qué logra hacer, y en cuántos pasos/pantallas como máximo. Es la escena contra la cual se va a juzgar si la v1.0 está lista (se convertirá en el test E2E de aceptación).

## 6. §Signature (2 min)

- `signed-by`: Mariano Capella
- `signed-at`: fecha del día (AAAA-MM-DD)
- `rows-authored-or-rewritten`: **contar a mano** las filas que Mariano escribió o reescribió (cuenta: cada historia, cada barra de felt-quality, cada demo-scene, fila de rol si fue tocada).
- `attestation`: **NO se toca** — va en inglés, textual, sin cambiarle una coma.

> ⚠️ La línea `attestation` la compara una máquina carácter por carácter. Traducida = dossier rechazado.

## 7. §Waiver

Verificar que quede:
- `waived: false` (Metrix AI tiene usuarios humanos; no aplica la salida headless)
- `waiver-rationale: {n/a — Metrix AI tiene usuarios humanos}`

## 8. Checklist de depósito

- [ ] El borrador de la IA fue tocado (reescrito o tachado) — un borrador intacto no es firmable
- [ ] `rows-authored-or-rewritten` ≥ 1
- [ ] `attestation` literal, sin traducción
- [ ] Renombrar `HUMAN-WEEXPECT.md.md` → `HUMAN-WEEXPECT.md`
- [ ] Commit dedicado (mensaje estilo repo, p.ej. `docs: sign HUMAN-WEEXPECT dossier (gate 0)`)
- [ ] Confirmar las **dos decisiones que no dependen del dossier** y quedan para Mariano:
      (1) propiedad intelectual del material académico (5 autores, sin licencia); (2) precios y niveles.

## 9. Qué pasa después de la firma

El dossier firmado activa el **Roadmap de re-fundación** (`docs/ROADMAP_REFUNDACION_METRIX_AI.md`):
se re-funda `metrix` sobre `MVP-1` (margen real por unidad con comisión/merma/flete/IVA, punto de
equilibrio, piso por SKU, traslado de suba) y `OBJ-2` (salida de intervalos con causa y acción).
Sin firma, el roadmap queda congelado en Gate 0.