# HUMAN-WEEXPECT — Metrix AI

> **DOSSIER COMPLETO Y FIRMADO — Mariano Capella.**
> Este archivo es el dossier definitivo: completo y firmado, depositado como
> `HUMAN-WEEXPECT.md`. Recién a partir de este depósito el sistema habilita la creación del proyecto.

---

## Para qué es esto (leer una vez, 2 minutos)

Antes de escribir una sola línea de Metrix AI necesitamos algo que **ninguna IA puede inventar por vos**:
qué esperás _sentir_ al usarlo, y qué te haría dejar de usarlo.

Esto no es un capricho de proceso. Construimos tres proyectos hermanos a partir de especificaciones
generadas enteramente por IA. Todos los tableros daban verde en todos los ejes que tenían — y ninguno de
esos ejes incluía _"un humano soporta usar esto"_. Salieron formularios sin estilo que nadie quiso tocar.
El sistema falló porque **nunca preguntó**.

Así que ahora pregunta, y hay una regla dura: **ningún agente puede completar ni firmar estas
respuestas.** Si las firmara una IA estaría falsificando tus expectativas, que es exactamente el error que
esta puerta existe para impedir. Te dejo todo pre-redactado como punto de partida — **tu trabajo es
reescribir lo que no diga lo que vos pensás y tachar lo que sobre.** Un borrador que llega intacto no
cuenta como firmado.

**Lo que NO te preguntamos** (a propósito): arquitectura, stack, base de datos, nombres, métricas
técnicas. Todo eso lo decide el sistema con evidencia. Acá va solo lo irreduciblemente humano.

**Cuánto lleva**: 20–40 minutos. Se puede hacer hablando y que alguien transcriba.

---

## Referencia rápida — de qué se trata el producto

Para que puedas citar a qué parte responde cada historia. Sale de la visión fundacional ya escrita.

| id      | Elemento                                                                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VIS-1` | Metrix AI es una IA que ayuda a un dueño de negocio a tomar decisiones de **margen y precio**.                                                            |
| `VIS-2` | No es una calculadora: aporta el número que el dueño **no podía calcular solo**.                                                                          |
| `OBJ-1` | Frontera gratis/pago: es **gratis** si el dueño aportó todos los números; es **pago** si Metrix AI aportó uno que él no tenía.                            |
| `OBJ-2` | **Honestidad antes que precisión**: un intervalo con su causa y una acción, nunca un número falso con dos decimales.                                      |
| `MVP-1` | **T1** — margen real por unidad después de comisión, merma, flete e IVA; punto de equilibrio; piso de precio por SKU; traslado de una suba del proveedor. |
| `MVP-2` | Calculadora interactiva gratuita como puerta de entrada, con un informe que se desbloquea dejando un contacto.                                            |
| `MVP-3` | **T2** (más adelante, y solo si se mide bien) — curva de demanda estimada con intervalo de confianza.                                                     |

Al final de cada historia poné entre corchetes a qué id responde, por ejemplo `[MVP-1]`. Si una historia
no responde a ninguno, decilo — probablemente falte un elemento fundacional, y eso es justamente lo que
queremos descubrir ahora y no en seis meses.

---

## §Roles

¿Quiénes son los humanos que van a tocar Metrix AI en la versión 1.0? Corregí, agregá o borrá filas.

| Role                                     | Answered by       | Relationship |
| ---------------------------------------- | ----------------- | ------------ |
| Dueño/a de un negocio (el cliente final) | Mariano Capella (aproximación — sin dueño real disponible) | daily driver |
| Mariano — lead del producto              | Mariano Capella   | daily driver |

> **Vale la pena el esfuerzo extra**: si podés contestar la sección "Dueño/a de un negocio" con un dueño
> real al lado —aunque sea media hora por teléfono— este dossier vale diez veces más. Si no se puede,
> contestá vos como su mejor representante y dejá anotado que es una aproximación.

---

## §Stories

Entre 3 y 7 historias por rol, del **primer día**. Gramática estricta:

`As <rol>, I <hago algo concreto>, so that <el resultado que realmente quiero>. [ID]`

(El armazón en inglés lo lee una máquina; **el contenido escribilo en castellano**. Menos de 3 significa
que todavía no entendemos el rol; más de 7 significa que la v1.0 se está agrandando de más.)

Tres preguntas para destrabarlo:

1. Contame lo primero que harías el día que esto exista.
2. ¿Qué hacés hoy a mano que esto debería absorber?
3. ¿Qué mirarías cada mañana, o cada vez que entrás?

Reglas: verbos concretos, sin listas de funcionalidades ("gestionar configuración" no es una historia), y
cada historia termina en un resultado que el rol puede confirmar que pasó.

### Dueño/a de un negocio

- As dueño de un negocio, I cargo el costo, la comisión y el precio de lista de un producto, so that veo si ese producto me deja plata o me la saca. [MVP-1]
- As dueño de un negocio, I pruebo un descuento del 10%, so that sé cuántas unidades más tengo que vender para no perder margen. [MVP-1]
- As dueño de un negocio, I cargo la suba que me pasó el proveedor, so that sé cuánto tengo que mover el precio y a partir de cuándo. [MVP-1]

### Mariano — lead del producto

- As lead del producto, I consulto la lista de leads registrados en el panel/base de datos, so that puedo validar que el formulario está capturando contactos reales (WhatsApp/Email). [MVP-2]
- As lead del producto, I reviso las métricas de simulaciones completadas vs. PDFs descargados, so that entiendo qué porcentaje de visitantes se convierte en un lead calificado. [MVP-2]
- As lead del producto, I analizo los rangos de sensibilidad (A) y costos (C) más ingresados por los usuarios, so that puedo ajustar las variables por defecto del simulador en futuras versiones. [MVP-1]

---

## §Felt-quality

### Dueño/a de un negocio

- **Refuse-to-use bar**: Si para ver un resultado tengo que ingresar datos contables complejos o abstractos que no tengo a mano, si la interfaz parece un formulario frío de consulta académica, o si al intentar descargar el informe en PDF el sitio se traba, requiere registros pesados o no me entrega métricas claras de forma inmediata.
- **Workable bar**: En menos de 2 minutos y directamente desde mi celular o navegador, muevo los deslizadores con mis estimaciones de precio y costos, entiendo de forma visual e intuitiva mi punto de ganancia máxima y puedo descargar un reporte profesional en PDF para compartir con mi equipo.

### Mariano — lead del producto

- **Refuse-to-use bar**: Si los leads ingresados en el formulario llegan vacíos, con números de WhatsApp/Email falsos por falta de validación en tiempo real, o si la generación del PDF con `pdf-lib` falla en navegadores móviles o se demora más de 3 segundos rompiendo el flujo de conversión.
- **Workable bar**: Cada interacción completa en el simulador genera de forma consistente y sin errores un registro completo en la base de datos (Prisma/SQLite) con los datos del cliente y dispara automáticamente la descarga del PDF formateado con el branding de Metrix AI.

---

## §Demo-scene

### Dueño/a de un negocio

- I open el simulador web en /lead-magnet, I see los controles deslizantes de precio/costos y la gráfica de ganancia actualizándose en tiempo real, I complete la simulación de mi escenario comercial y la descarga de mi informe PDF personalizado in ≤ 4 steps.

### Mariano — lead del producto

- I open la base de datos/panel de administración de leads, I see el nuevo registro creado con el nombre, empresa, email y WhatsApp del cliente, I complete la verificación de la correcta persistencia del lead y los parámetros simulados in ≤ 2 steps.

---

## §Signature

Una fila cuenta como HUMANA solo bajo esta firma. Un borrador entregado sin tocar es **no firmable**:
`rows-authored-or-rewritten: 0` o un firmante de ejemplo lo dejan como `UNSIGNED`.

Contá cuántas filas escribiste o reescribiste vos y poné ese número.

- signed-by: Mariano Capella
- signed-at: 2026-08-11
- rows-authored-or-rewritten: 13
- attestation: I read every row; the rows counted above I authored or deliberately rewrote myself.

> ⚠️ **La línea `attestation` va en inglés, textual, sin cambiarle una coma** — la lee una máquina que
> compara carácter por carácter. Traducida, el sistema rechaza el dossier aunque esté todo lo demás bien.
> Dice: _"Leí todas las filas; las que conté arriba las escribí o las reescribí deliberadamente yo."_
> (Ya está puesta arriba: no la toques, solo cambiá la fecha y el número.)

---

## §Waiver — la salida sancionada para un proyecto sin humanos

Solo para un producto **sin ninguna superficie humana** en la v1.0 (una librería headless, una API que
solo consumen máquinas). **No es el caso de Metrix AI** — dejalo en `false`.

- waived: false
- waiver-rationale: {n/a — Metrix AI tiene usuarios humanos}
- waiver-signed-by: {n/a}
- waiver-signed-at: {n/a}

---

## Qué pasa cuando lo devolvés

1. Se deposita firmado como `HUMAN-WEEXPECT.md` junto a la visión fundacional.
2. Se crea el proyecto Metrix AI en su propia raíz sellada, con vos como lead.
3. Tus barras de "no lo uso / así sí funciona" quedan como un eje del tablero que ningún test puede
   aprobar por vos.

**Dos decisiones siguen siendo tuyas y de nadie más**, y no dependen de este documento: la decisión de
propiedad intelectual sobre el material académico de referencia (son cinco autores y no hay licencia), y
los precios y niveles del producto.
