// @vitest-environment jsdom
/**
 * metrix · components/LeadMagnetForm.test.tsx
 * Component test del formulario del lead magnet.
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

describe("LeadMagnetForm", () => {
  it("renderiza defaults", () => {
    render(<LeadMagnetForm />);
    expect((screen.getByTestId("lm-a") as HTMLInputElement).value).toBe("-2");
    expect((screen.getByTestId("lm-b") as HTMLInputElement).value).toBe("120");
    expect((screen.getByTestId("lm-c") as HTMLInputElement).value).toBe("-1000");
    expect((screen.getByTestId("lm-min") as HTMLInputElement).value).toBe("10");
    expect((screen.getByTestId("lm-max") as HTMLInputElement).value).toBe("100");
    expect(screen.getByTestId("lm-empty")).toBeTruthy();
  });

  it("clic Calcular escenario con fetch OK → muestra precio 30, ganancia 800 y estrategia", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          formulaVersion: "lead-magnet-v1",
          precioOptimo: 30,
          gananciaMaxima: 800,
          estrategiaSugerida: "Mantener el precio en el punto de equilibrio óptimo.",
          curva: {
            labels: [10, 20, 30, 100],
            datos: [100, 200, 800, 500],
            optimo: { x: 30, y: 800 },
          },
        }),
        { status: 200 }
      )
    );

    render(<LeadMagnetForm />);
    fireEvent.click(screen.getByTestId("lm-calc"));

    await waitFor(() => expect(screen.queryByTestId("lm-empty")).toBeNull());
    expect(screen.getByText("$ 30")).toBeTruthy();
    expect(screen.getByText("$ 800")).toBeTruthy();
    expect(
      screen.getByText("Mantener el precio en el punto de equilibrio óptimo.")
    ).toBeTruthy();
  });

  it("fetch 400 → error visible", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 })
    );

    render(<LeadMagnetForm />);
    fireEvent.click(screen.getByTestId("lm-calc"));

    await waitFor(() => expect(screen.getByTestId("lm-error")).toBeTruthy());
    expect(screen.getByTestId("lm-error").textContent).toBe("Invalid input");
  });
});