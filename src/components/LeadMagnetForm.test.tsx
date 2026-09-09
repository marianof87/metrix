// @vitest-environment jsdom
/**
 * metrix · components/LeadMagnetForm.test.tsx
 * Contrato del formulario lead magnet — Fase 4 RED (OBJ-2).
 * El componente debe consumir { outcomes: Outcome[], curva: {x,y}[], formulaVersion }
 * y NO el shape legacy { precioOptimo, gananciaMaxima, estrategiaSugerida, curva:{labels,datos} }.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { MockChart } = vi.hoisted(() => ({
  MockChart: vi.fn(function (this: { destroy: () => void }) {
    this.destroy = vi.fn();
  }),
}));

vi.mock("chart.js/auto", () => ({
  Chart: MockChart,
}));

import LeadMagnetForm from "./LeadMagnetForm";

beforeEach(() => {
  MockChart.mockClear();
  vi.restoreAllMocks();
});

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
  );
}

const honestOkPayload = {
  formulaVersion: "lead-magnet-v1",
  outcomes: [
    {
      id: "a".repeat(64),
      range: [27, 33] as [number, number],
      driver: "curvatura de la demanda",
      action: "fijar precio de lanzamiento en 30 y monitorear demanda",
      confidence: "media" as const,
      access: "contact-gated" as const,
    },
  ],
  curva: [
    { x: 20, y: 100 },
    { x: 27, y: 600 },
    { x: 30, y: 800 },
    { x: 33, y: 700 },
    { x: 40, y: 200 },
  ],
};

describe("LeadMagnetForm — contrato honesto", () => {
  it("renderiza defaults incluyendo costPerUnit y estado vacío inicial", () => {
    render(<LeadMagnetForm />);
    expect((screen.getByTestId("lm-a") as HTMLInputElement).value).toBe("-2");
    expect((screen.getByTestId("lm-b") as HTMLInputElement).value).toBe("120");
    expect((screen.getByTestId("lm-c") as HTMLInputElement).value).toBe("-1000");
    expect((screen.getByTestId("lm-min") as HTMLInputElement).value).toBe("10");
    expect((screen.getByTestId("lm-max") as HTMLInputElement).value).toBe("100");
    // costPerUnit es requerido por el contrato nuevo; default 5
    expect((screen.getByTestId("lm-cost") as HTMLInputElement).value).toBe("5");
    expect(screen.getByTestId("lm-empty")).toBeTruthy();
    expect(screen.queryByTestId("lm-error")).toBeNull();
  });

  it("clic Calcular con fetch OK (shape honesto) → muestra rango, acción, confianza, acceso y canvas; NO muestra $ 30 suelto", async () => {
    mockFetchOnce(honestOkPayload, 200);

    render(<LeadMagnetForm />);
    fireEvent.click(screen.getByTestId("lm-calc"));

    await waitFor(() => expect(screen.queryByTestId("lm-empty")).toBeNull());

    // Rango honesto: debe contener ambos extremos (formato "$27 – $33" o variantes)
    const rangoEl = screen.getByTestId("lm-range");
    expect(rangoEl.textContent).toMatch(/27/);
    expect(rangoEl.textContent).toMatch(/33/);
    // No debe ser un único precio suelto (OBJ-2 prohibido)
    expect(screen.queryByText("$ 30")).toBeNull();
    expect(screen.queryByText("$ 800")).toBeNull();

    // Acción concreta con el precio redondeado
    expect(screen.getByTestId("lm-action").textContent).toMatch(/fijar precio de lanzamiento en 30/i);
    expect(screen.getByTestId("lm-action").textContent).toMatch(/monitorear demanda/i);

    // Confianza y acceso
    expect(screen.getByTestId("lm-confidence").textContent).toMatch(/media/i);
    expect(screen.getByTestId("lm-access").textContent).toMatch(/contact-gated/i);

    // Driver
    expect(screen.getByTestId("lm-driver").textContent).toMatch(/curvatura de la demanda/i);

    // Canvas visible (ProfitChart recibe {x,y}[] )
    expect(screen.getByTestId("profit-chart")).toBeTruthy();
    // Chart.js debe haber sido instanciado
    expect(MockChart).toHaveBeenCalled();

    // No debe renderizar estrategiaSugerida legacy ni gananciaMaxima suelta
    expect(screen.queryByText("Mantener el precio en el punto de equilibrio óptimo.")).toBeNull();
  });

  it("fetch 400 → error visible con mensaje útil y sin resultado", async () => {
    mockFetchOnce({ error: "Invalid input", details: { fieldErrors: { demandA: ["Debe ser negativo"] } } }, 400);

    render(<LeadMagnetForm />);
    fireEvent.click(screen.getByTestId("lm-calc"));

    await waitFor(() => expect(screen.getByTestId("lm-error")).toBeTruthy());
    expect(screen.getByTestId("lm-error").textContent).toMatch(/Invalid input/i);
    expect(screen.queryByTestId("lm-range")).toBeNull();
    expect(screen.getByTestId("lm-empty")).toBeTruthy();
  });

  it("fetch con network error → muestra mensaje de conexión", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    render(<LeadMagnetForm />);
    fireEvent.click(screen.getByTestId("lm-calc"));

    await waitFor(() => expect(screen.getByTestId("lm-error")).toBeTruthy());
    expect(screen.getByTestId("lm-error").textContent).toMatch(/No se pudo conectar/i);
  });
});