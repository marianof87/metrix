// @vitest-environment jsdom
/**
 * metrix · components/ProfitChart.test.tsx
 * Component test del gráfico de la curva de ganancia del lead magnet.
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

import ProfitChart from "./ProfitChart";

beforeEach(() => {
  MockChart.mockClear();
});

describe("ProfitChart", () => {
  it("labels vacío → placeholder visible", () => {
    render(<ProfitChart labels={[]} datos={[]} />);
    expect(screen.getByTestId("profit-chart-empty")).toBeTruthy();
    expect(MockChart).not.toHaveBeenCalled();
  });

  it("con datos → instancia Chart", () => {
    render(<ProfitChart labels={[10, 20, 30]} datos={[100, 200, 300]} />);
    expect(screen.queryByTestId("profit-chart-empty")).toBeNull();
    expect(MockChart).toHaveBeenCalledTimes(1);
  });
});