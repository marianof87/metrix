// @vitest-environment jsdom
/**
 * metrix · components/LeadModal.test.tsx
 * Component test del modal de captura de lead.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeadModal from "./LeadModal";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

async function rellenarValido() {
  fireEvent.change(screen.getByTestId("lead-nombre"), { target: { value: "Ana Pérez" } });
  fireEvent.change(screen.getByTestId("lead-empresa"), { target: { value: "Textil Sur" } });
  fireEvent.change(screen.getByTestId("lead-whatsapp"), { target: { value: "+54 9 351 555-1234" } });
  fireEvent.change(screen.getByTestId("lead-email"), { target: { value: "ana@empresa.com" } });
}

describe("LeadModal", () => {
  it("submit vacío → errores inline", async () => {
    render(
      <LeadModal onClose={vi.fn()} onRegistrado={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("leads-submit"));
    expect(await screen.findByText("El nombre y apellido son obligatorios.")).toBeTruthy();
    expect(screen.getByText("La empresa o rubro es obligatoria.")).toBeTruthy();
    expect(screen.getAllByText("Ingresá un WhatsApp válido.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ingresá un email laboral válido.").length).toBeGreaterThan(0);
  });

  it("submit válido con fetch 201 → llama onRegistrado", async () => {
    const onRegistrado = vi.fn();
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "x", createdAt: "now" }), { status: 201 })
    );

    render(
      <LeadModal onClose={vi.fn()} onRegistrado={onRegistrado} />
    );
    await rellenarValido();
    fireEvent.click(screen.getByTestId("leads-submit"));

    await waitFor(() => expect(onRegistrado).toHaveBeenCalledTimes(1));
    expect(onRegistrado).toHaveBeenCalledWith({
      nombre: "Ana Pérez",
      empresa: "Textil Sur",
      whatsapp: "+54 9 351 555-1234",
      email: "ana@empresa.com",
    });
  });

  it("fetch 400 → mensaje error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 })
    );

    render(
      <LeadModal onClose={vi.fn()} onRegistrado={vi.fn()} />
    );
    await rellenarValido();
    fireEvent.click(screen.getByTestId("leads-submit"));

    await waitFor(() => expect(screen.getByTestId("leads-error")).toBeTruthy());
    expect(screen.getByTestId("leads-error").textContent).toBe("Invalid input");
  });
});