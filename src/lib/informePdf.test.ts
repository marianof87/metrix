// @vitest-environment jsdom
/**
 * metrix · lib/informePdf.test.ts
 * Unit tests del generador de informe PDF — Fase 4 RED (OBJ-2 honesto).
 * El PDF debe recibir Outcome (range + action) y NO números sueltos con toFixed(2).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { nombreArchivoInforme, generarInformePdf } from "./informePdf";
import type { InformePdfDatos } from "./informePdf";

describe("nombreArchivoInforme", () => {
  it("empresa con espacios → informe-metrix-textil-sur.pdf", () => {
    expect(nombreArchivoInforme("Textil Sur")).toBe("informe-metrix-textil-sur.pdf");
  });
  it("empresa en mayúsculas → minúsculas sin espacios", () => {
    expect(nombreArchivoInforme("ACME SA")).toBe("informe-metrix-acme-sa.pdf");
  });
});

// Helper para stub de descarga en jsdom (igual patrón que el repo sellado)
function stubDownload() {
  const createObjectURL = vi.fn(() => "blob:informe");
  const revokeObjectURL = vi.fn();
  const click = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL } as any);
  const anchor = document.createElement("a");
  const createElement = vi.spyOn(document, "createElement").mockReturnValue(anchor as unknown as HTMLAnchorElement);
  const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(() => anchor as never);
  const removeChild = vi.spyOn(document.body, "removeChild").mockImplementation(() => anchor as never);
  Object.defineProperty(anchor, "click", { value: click });
  return {
    createObjectURL,
    revokeObjectURL,
    click,
    anchor,
    createElement,
    appendChild,
    removeChild,
    restore() {
      createElement.mockRestore();
      appendChild.mockRestore();
      removeChild.mockRestore();
    },
  };
}

const leadBase = { nombre: "Ana Pérez", empresa: "Textil Sur", whatsapp: "123456", email: "a@b.com" };
const outcomeBase = {
  id: "b".repeat(64),
  range: [27, 33] as [number, number],
  driver: "curvatura de la demanda",
  action: "fijar precio de lanzamiento en 30 y monitorear demanda",
  confidence: "media",
  access: "contact-gated",
};
const coeficientesBase = { demandA: -2, demandB: 120, demandC: -1000, minPrice: 10, maxPrice: 100, costPerUnit: 5 };

describe("generarInformePdf — contrato honesto", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("smoke: genera y dispara descarga con InformePdfDatos honesto (outcome + coeficientes)", async () => {
    const dl = stubDownload();

    const datos: InformePdfDatos = {
      lead: leadBase,
      outcome: outcomeBase,
      coeficientes: coeficientesBase,
    };

    await generarInformePdf(datos);

    expect(dl.createObjectURL).toHaveBeenCalledTimes(1);
    expect(dl.click).toHaveBeenCalledTimes(1);
    expect(dl.anchor.download).toBe("informe-metrix-textil-sur.pdf");

    dl.restore();
  });

  it("contenido honesto: el PDF contiene el RANGO y la ACCIÓN, NO un precio único con toFixed(2)", async () => {
    // Interceptamos drawText del pdf-lib para inspeccionar qué se dibuja
    const drawTexts: string[] = [];
    const { PDFDocument } = await import("pdf-lib");
    const originalCreate = PDFDocument.create;
    const createSpy = vi.spyOn(PDFDocument as any, "create").mockImplementation(async () => {
      const doc: any = await originalCreate.call(PDFDocument);
      const originalAddPage = doc.addPage.bind(doc);
      doc.addPage = (...args: any[]) => {
        const page: any = originalAddPage(...args);
        const originalDrawText = page.drawText.bind(page);
        page.drawText = (text: string, opts?: any) => {
          drawTexts.push(String(text));
          return originalDrawText(text, opts);
        };
        return page;
      };
      return doc;
    });

    const dl = stubDownload();
    await generarInformePdf({
      lead: leadBase,
      outcome: outcomeBase,
      coeficientes: coeficientesBase,
    });
    dl.restore();
    createSpy.mockRestore();

    const allText = drawTexts.join(" | ");
    // Debe contener el rango (ambos extremos)
    expect(allText).toMatch(/27/);
    expect(allText).toMatch(/33/);
    // Debe contener la acción completa
    expect(allText).toMatch(/fijar precio de lanzamiento en 30/i);
    expect(allText).toMatch(/monitorear demanda/i);
    // Driver y confianza deben aparecer
    expect(allText).toMatch(/curvatura de la demanda/i);
    // No debe contener el viejo patrón de precio suelto con 2 decimales como único dato de decisión
    // Permitimos que aparezcan números en la tabla de coeficientes, pero no "Precio óptimo sugerido $30.00" como bloque principal
    expect(allText).not.toMatch(/Precio óptimo sugerido.*\$30\.00/);
    expect(allText).not.toMatch(/Ganancia máxima estimada.*\$800\.00/);
  });

  it("no acepta shape legacy (resultados con precioOptimo) — type guard en runtime si se pasa legacy debe fallar o ignorar", async () => {
    // Este test documenta que el contrato viejo ya no es válido.
    // Si la implementación aún acepta `resultados`, este test fallará en GREEN y debe eliminarse tras la migración.
    const legacyPayload: any = {
      lead: leadBase,
      resultados: { precioOptimo: 30, gananciaMaxima: 800, estrategiaSugerida: "Mantener" },
      coeficientes: { a: -2, b: 120, c: -1000 },
    };
    const dl = stubDownload();
    await expect(generarInformePdf(legacyPayload)).rejects.toThrow();
    dl.restore();
  });
});