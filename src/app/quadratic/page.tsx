import type { Metadata } from "next";
import QuadraticPageView from "@/components/QuadraticPageView";

export const metadata: Metadata = {
  title: "Calculadora cuadrática · metrix",
  description:
    "Resuelve f(x) = ax² + bx + c: raíces, vértice, concavidad y tabla de valores.",
};

export default function QuadraticPage() {
  return <QuadraticPageView />;
}