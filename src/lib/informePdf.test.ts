// @vitest-environment jsdom
/**
 * metrix · lib/informePdf.test.ts
 * Unit tests del generador de informe PDF (nombre de archivo y smoke).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { nombreArchivoInforme, generarInformePdf } from "./informePdf";

describe("nombreArchivoInforme", () => {
  it("empresa con espacios → informe-metrix-textil-sur.pdf", () => {
    expect(nombreArchivoInforme("Textil Sur")).toBe("informe-metrix-textil-sur.pdf");
  });

  it("empresa en mayúsculas → minúsculas sin espacios", () => {
    expect(nombreArchivoInforme("ACME SA")).toBe("informe-metrix-acme-sa.pdf");
  });
});

describe("generarInformePdf", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("smoke: genera y dispara descarga", async () => {
    const createObjectURL = vi.fn(() => "blob:informe");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const anchor = document.createElement("a");
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(anchor as unknown as HTMLAnchorElement);
    const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(() => anchor as never);
    const removeChild = vi.spyOn(document.body, "removeChild").mockImplementation(() => anchor as never);
    Object.defineProperty(anchor, "click", { value: click });

    await generarInformePdf({
      lead: { nombre: "Ana Pérez", empresa: "Textil Sur", whatsapp: "123456", email: "a@b.com" },
      resultados: {
        precioOptimo: 30,
        gananciaMaxima: 800,
        estrategiaSugerida: "Estrategia de prueba",
      },
      coeficientes: { a: -2, b: 120, c: -1000 },
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe("informe-metrix-textil-sur.pdf");

    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
  });
});