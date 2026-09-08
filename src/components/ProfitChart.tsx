"use client";

/**
 * metrix · components/ProfitChart.tsx
 * Gráfico de línea de la curva de ganancia del lead magnet (Chart.js).
 * Port del gráfico de la app Angular de referencia.
 */

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

interface ProfitChartProps {
  labels: number[];
  datos: number[];
  highlightIndex?: number;
}

export default function ProfitChart({ labels, datos, highlightIndex }: ProfitChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!canvasRef.current) return;
    if (labels.length === 0 || datos.length === 0) return;

    const radioPuntos = datos.map(() => 0);
    const coloresPuntos = datos.map(() => "#3a7bd5");
    if (highlightIndex !== undefined && highlightIndex >= 0 && highlightIndex < datos.length) {
      radioPuntos[highlightIndex] = 7;
      coloresPuntos[highlightIndex] = "#00d2ff";
    }

    let chart: Chart | null = null;
    try {
      chart = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: labels.map((v) => String(v)),
          datasets: [
            {
              label: "Ganancia estimada",
              data: datos,
              fill: true,
              backgroundColor: "rgba(0, 210, 255, 0.08)",
              borderColor: "#3a7bd5",
              pointRadius: radioPuntos,
              pointBackgroundColor: coloresPuntos,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: "Precio ($)" }, ticks: { color: "#a0a5b8" } },
            y: { title: { display: true, text: "Ganancia ($)" }, ticks: { color: "#a0a5b8" } },
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
  }, [labels, datos, highlightIndex]);

  if (labels.length === 0 || datos.length === 0) {
    return (
      <p data-testid="profit-chart-empty">
        Ajustá los parámetros para ver tu escenario inicial.
      </p>
    );
  }

  return (
    <div data-testid="profit-chart" className="relative" style={{ height: 300 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}