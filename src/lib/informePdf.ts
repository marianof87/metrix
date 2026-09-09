/**
 * metrix · lib/informePdf.ts
 * Generación del informe PDF del lead magnet con pdf-lib.
 * Port del servicio de la app Angular de referencia (paleta, secciones, nombre de archivo).
 * Solo corre en el navegador.
 *
 * Contrato honesto OBJ-2: recibe Outcome (range + action) en lugar de
 * números sueltos (precioOptimo / gananciaMaxima / estrategiaSugerida).
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InformePdfDatos {
  lead: { nombre: string; empresa: string; whatsapp: string; email: string };
  outcome: {
    id: string;
    range: [number, number];
    driver: string;
    action: string;
    confidence: string;
    access: string;
  };
  coeficientes: {
    demandA: number;
    demandB: number;
    demandC: number;
    minPrice: number;
    maxPrice: number;
    costPerUnit: number;
  };
}

// Paleta de marca — reflejo de los tokens de la app de referencia.
const AZUL_PRIMARIO = rgb(0.227, 0.482, 0.835); // #3a7bd5
const AZUL_CLARO = rgb(0, 0.824, 1); // #00d2ff
const TEXTO_OSCURO = rgb(0.067, 0.075, 0.098);
const TEXTO_TENUE = rgb(0.35, 0.38, 0.46);
const BLANCO = rgb(1, 1, 1);
const BLANCO_VELADO = rgb(0.92, 0.96, 1);
const FONDO_SUAVE = rgb(0.95, 0.96, 0.99);

const ANCHO_PAGINA = 595.28;
const ALTO_PAGINA = 841.89;

/** Nombre de archivo del informe: informe-metrix-<empresa sin espacios en minusculas>.pdf */
export function nombreArchivoInforme(empresa: string): string {
  return `informe-metrix-${empresa.replace(/\s+/g, "-").toLowerCase()}.pdf`;
}

/**
 * Valida que los datos tengan el shape honesto (outcome presente, NO resultados legacy).
 * Lanza si se pasa el shape legacy.
 */
function assertHonestShape(datos: InformePdfDatos): void {
  if (!datos.outcome) {
    throw new Error(
      "InformePdfDatos debe incluir 'outcome' (contrato OBJ-2). El shape legacy 'resultados' ya no es válido."
    );
  }
}

/**
 * Genera el informe en PDF y dispara la descarga en el navegador.
 */
export async function generarInformePdf(datos: InformePdfDatos): Promise<void> {
  assertHonestShape(datos);

  const documento = await PDFDocument.create();
  const pagina = documento.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
  const fuente = await documento.embedFont(StandardFonts.Helvetica);
  const fuenteNegrita = await documento.embedFont(StandardFonts.HelveticaBold);
  let y = ALTO_PAGINA - 48;

  const medir = (texto: string, tamanio: number): number =>
    fuente.widthOfTextAtSize(texto, tamanio);

  const dividirEnLineas = (texto: string, tamanio: number, anchoMaximo: number): string[] => {
    const lineas: string[] = [];
    let actual = "";
    for (const palabra of texto.split(" ")) {
      const candidata = actual ? `${actual} ${palabra}` : palabra;
      if (medir(candidata, tamanio) <= anchoMaximo || !actual) {
        actual = candidata;
      } else {
        lineas.push(actual);
        actual = palabra;
      }
    }
    if (actual) {
      lineas.push(actual);
    }
    return lineas;
  };

  const dibujarTexto = (texto: string, x: number, yInicial: number, tamanio: number, color: typeof TEXTO_OSCURO): number => {
    const anchoMaximo = ANCHO_PAGINA - 104;
    const lineas = dividirEnLineas(texto, tamanio, anchoMaximo);
    let cursor = yInicial;
    for (const linea of lineas) {
      pagina.drawText(linea, { x, y: cursor, size: tamanio, font: fuente, color });
      cursor -= tamanio + 4;
    }
    return cursor;
  };

  // Encabezado: rect azul + marca + subtítulo derecho.
  pagina.drawRectangle({
    x: 0,
    y: y - 110,
    width: ANCHO_PAGINA,
    height: 110,
    color: AZUL_PRIMARIO,
  });
  pagina.drawText("Metrix IA", { x: 48, y: y - 44, size: 28, font: fuenteNegrita, color: BLANCO });
  const subtitulo = "Informe personalizado de precios";
  const anchoSubtitulo = medir(subtitulo, 11);
  pagina.drawText(subtitulo, {
    x: ANCHO_PAGINA - 48 - anchoSubtitulo,
    y: y - 44,
    size: 11,
    font: fuente,
    color: BLANCO_VELADO,
  });
  y -= 150;

  // Título.
  pagina.drawText("Informe de valor de tu negocio", {
    x: 48,
    y,
    size: 20,
    font: fuenteNegrita,
    color: TEXTO_OSCURO,
  });
  y -= 24;
  pagina.drawText("Simulación personalizada generada con la herramienta de Metrix IA.", {
    x: 48,
    y,
    size: 11,
    font: fuente,
    color: TEXTO_TENUE,
  });
  y -= 34;

  // Bloque de filas etiqueta/valor con separador.
  const dibujarBloque = (titulo: string, filas: Array<[string, string]>): void => {
    pagina.drawText(titulo, { x: 48, y, size: 13, font: fuenteNegrita, color: AZUL_PRIMARIO });
    y -= 22;
    for (const [etiqueta, valor] of filas) {
      pagina.drawText(etiqueta, { x: 48, y, size: 10.5, font: fuente, color: TEXTO_TENUE });
      pagina.drawText(valor, {
        x: 200,
        y,
        size: 10.5,
        font: fuenteNegrita,
        color: TEXTO_OSCURO,
      });
      y -= 21;
    }
    pagina.drawRectangle({
      x: 48,
      y: y + 4,
      width: ANCHO_PAGINA - 96,
      height: 0.6,
      color: FONDO_SUAVE,
    });
    y -= 24;
  };

  dibujarBloque("Datos del negocio", [
    ["Nombre y apellido", datos.lead.nombre],
    ["Empresa / Rubro", datos.lead.empresa],
    ["Email laboral", datos.lead.email],
    ["WhatsApp", datos.lead.whatsapp],
  ]);

  // Escenario simulado — coeficientes honestos (sin defaults legacy).
  dibujarBloque("Escenario simulado", [
    ["demandA (sensibilidad)", String(datos.coeficientes.demandA)],
    ["demandB (demanda)", String(datos.coeficientes.demandB)],
    ["demandC (costos fijos)", String(datos.coeficientes.demandC)],
    ["Precio mínimo", String(datos.coeficientes.minPrice)],
    ["Precio máximo", String(datos.coeficientes.maxPrice)],
    ["Costo unitario", String(datos.coeficientes.costPerUnit)],
  ]);

  // Resultados honestos: rango sugerido + acción + driver + confianza + acceso.
  const [rangeLo, rangeHi] = datos.outcome.range;
  const rangeTexto = `Entre $${rangeLo} y $${rangeHi}`;

  pagina.drawRectangle({
    x: 48,
    y: y - 140,
    width: ANCHO_PAGINA - 96,
    height: 140,
    color: FONDO_SUAVE,
  });

  // Rango sugerido
  pagina.drawText("Rango de precio sugerido", { x: 72, y: y - 24, size: 11, font: fuente, color: TEXTO_TENUE });
  pagina.drawText(rangeTexto, {
    x: 72,
    y: y - 50,
    size: 22,
    font: fuenteNegrita,
    color: TEXTO_OSCURO,
  });

  // Acción recomendada
  const xAccion = ANCHO_PAGINA / 2 + 24;
  pagina.drawText("Acción recomendada", { x: xAccion, y: y - 24, size: 11, font: fuente, color: TEXTO_TENUE });
  y = dibujarTexto(datos.outcome.action, xAccion, y - 48, 11, TEXTO_OSCURO);

  y -= 16;

  // Driver
  pagina.drawText("Driver", { x: 72, y, size: 11, font: fuente, color: TEXTO_TENUE });
  pagina.drawText(datos.outcome.driver, {
    x: 200,
    y,
    size: 11,
    font: fuenteNegrita,
    color: TEXTO_OSCURO,
  });
  y -= 20;

  // Confianza
  pagina.drawText("Nivel de confianza", { x: 72, y, size: 11, font: fuente, color: TEXTO_TENUE });
  pagina.drawText(datos.outcome.confidence, {
    x: 200,
    y,
    size: 11,
    font: fuenteNegrita,
    color: TEXTO_OSCURO,
  });
  y -= 20;

  // Acceso
  pagina.drawText("Acceso", { x: 72, y, size: 11, font: fuente, color: TEXTO_TENUE });
  pagina.drawText(datos.outcome.access, {
    x: 200,
    y,
    size: 11,
    font: fuenteNegrita,
    color: TEXTO_OSCURO,
  });
  y -= 32;

  // CTA azul.
  pagina.drawRectangle({
    x: 48,
    y: y - 96,
    width: ANCHO_PAGINA - 96,
    height: 96,
    color: AZUL_PRIMARIO,
  });
  pagina.drawText("¿Listo para llevar esta estrategia a tu negocio?", {
    x: 72,
    y: y - 30,
    size: 14,
    font: fuenteNegrita,
    color: BLANCO,
  });
  y -= 54;
  y = dibujarTexto(
    "Agendá un diagnóstico gratuito de 30 minutos con un especialista de Metrix IA.",
    72,
    y,
    11,
    BLANCO
  );

  // Pie legal.
  const mensaje =
    "Este informe es una simulación orientativa generada automáticamente y no constituye asesoramiento profesional.";
  const tramos = dividirEnLineas(mensaje, 10, ANCHO_PAGINA - 96);
  tramos.forEach((linea, i) => {
    pagina.drawText(linea, {
      x: 48,
      y: ALTO_PAGINA - 56 - i * 15,
      size: 10,
      font: fuente,
      color: TEXTO_TENUE,
    });
  });

  const bytes = await documento.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const nombre = nombreArchivoInforme(datos.lead.empresa);
  descargarBlob(blob, nombre);
}

function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
