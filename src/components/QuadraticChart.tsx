"use client";

/**
 * metrix · components/QuadraticChart.tsx
 * Gráfico cartesiano en vivo de f(x) = ax² + bx + c (Chart.js).
 * Port del gráfico de la calculadora cuadrática de la app Angular de referencia.
 */

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

interface QuadraticChartProps {
  a?: number | null;
  b?: number | null;
  c?: number | null;
}

export default function QuadraticChart({ a, b, c }: QuadraticChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!canvasRef.current) return;
    if (
      a == null ||
      b == null ||
      c == null ||
      !Number.isFinite(a) ||
      !Number.isFinite(b) ||
      !Number.isFinite(c)
    ) {
      return;
    }

    const vx = -b / (2 * a);
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = vx - 10 + 0.5 * i;
      labels.push(x.toFixed(1));
      data.push(a * Math.pow(x, 2) + b * x + c);
    }

    let chart: Chart | null = null;
    try {
      chart = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              data,
              label: `f(x) = ${String(a)}x² + ${String(b)}x + ${String(c)}`,
              fill: true,
              backgroundColor: "rgba(58, 123, 213, 0.15)",
              borderColor: "#00d2ff",
              pointBackgroundColor: "#f0932b",
              pointRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          elements: {
            line: { tension: 0.4 },
            point: { radius: 2 },
          },
          scales: {
            x: {
              title: { display: true, text: "X", color: "#00d2ff" },
              grid: { color: "rgba(255, 255, 255, 0.08)" },
              ticks: { color: "#a0a5b8" },
            },
            y: {
              title: { display: true, text: "f(X)", color: "#00d2ff" },
              grid: { color: "rgba(255, 255, 255, 0.08)" },
              ticks: { color: "#a0a5b8" },
            },
          },
          plugins: {
            legend: { labels: { color: "#f8f9fa" } },
          },
        },
      });
    } catch {
      // jsdom / canvas sin implementación: no romper el render.
    }

    return () => {
      chart?.destroy();
    };
  }, [a, b, c]);

  const valid =
    a &&
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    Number.isFinite(c);

  if (!valid) {
    return (
      <p data-testid="quadratic-chart-empty">
        Introducí coeficientes válidos para ver el gráfico.
      </p>
    );
  }

  return (
    <div data-testid="quadratic-chart" className="relative" style={{ height: 320 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}