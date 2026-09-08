// @vitest-environment jsdom
/**
 * metrix · components/QuadraticChart.test.tsx
 * Component test del gráfico cartesiano de la calculadora cuadrática.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { MockChart } = vi.hoisted(() => ({
  MockChart: vi.fn(function (this: { destroy: () => void }) {
    this.destroy = vi.fn();
  }),
}));

vi.mock("chart.js/auto", () => ({
  Chart: MockChart,
}));

import QuadraticChart from "./QuadraticChart";

beforeEach(() => {
  MockChart.mockClear();
});

describe("QuadraticChart", () => {
  it("coeficientes null → placeholder visible", () => {
    render(<QuadraticChart a={null} b={null} c={null} />);
    expect(screen.getByTestId("quadratic-chart-empty")).toBeTruthy();
    expect(MockChart).not.toHaveBeenCalled();
  });

  it("coeficientes válidos (a=1,b=-4,c=4) → placeholder ausente y Chart instanciado", () => {
    render(<QuadraticChart a={1} b={-4} c={4} />);
    expect(screen.queryByTestId("quadratic-chart-empty")).toBeNull();
    expect(MockChart).toHaveBeenCalledTimes(1);
  });
});