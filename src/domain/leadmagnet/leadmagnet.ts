/**
 * metrix · domain/leadmagnet/leadmagnet.ts
 * Optimización de precios mediante modelo cuadrático (lead magnet).
 * Dominio PURO: sin imports de framework. Fórmula v1: 'lead-magnet-v1'.
 *
 * Port del optimizador de la app Angular de referencia: la ganancia es
 * f(x) = A·x² + B·x + C, con A < 0 (parábola con punto máximo).
 */

/**
 * Error de dominio para inputs inválidos de optimización de precios.
 */
export class LeadMagnetDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadMagnetDomainError";
  }
}

export const LEAD_MAGNET_FORMULA_VERSION = "lead-magnet-v1";

export interface OptimizarPrecioInputs {
  coeficienteA: number;
  coeficienteB: number;
  coeficienteC: number;
  precioMinimo: number;
  precioMaximo: number;
}

export interface OptimizarPrecioResult {
  precioOptimo: number;
  gananciaMaxima: number;
  estrategiaSugerida: string;
}

export interface ProfitCurve {
  labels: number[];
  datos: number[];
  optimo: { x: number; y: number } | null;
}

function aDosDecimales(valor: number): number {
  return Number(valor.toFixed(2));
}

function recortar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

function sugerirEstrategia(precioOptimo: number, precioMinimo: number, precioMaximo: number): string {
  if (precioOptimo >= precioMaximo) {
    return "El mercado tolera un precio mayor. Considerar expandir el límite máximo.";
  }
  if (precioOptimo <= precioMinimo) {
    return "Demanda débil. Se sugiere mantener el precio en el mínimo para asegurar volumen.";
  }
  return "Mantener el precio en el punto de equilibrio óptimo.";
}

/**
 * Calcula el precio óptimo y la ganancia máxima para una parábola de beneficio.
 * @throws LeadMagnetDomainError si A >= 0 (no existe máximo de ganancia).
 */
export function optimizarPrecio(datos: OptimizarPrecioInputs): OptimizarPrecioResult {
  const { coeficienteA, coeficienteB, coeficienteC, precioMinimo, precioMaximo } = datos;

  if (coeficienteA >= 0) {
    throw new LeadMagnetDomainError(
      "El coeficiente A debe ser negativo para representar una parábola con punto máximo de ganancia."
    );
  }

  // Vértice de la parábola: x = -b / (2 * a)
  const precioOptimoCrudo = -coeficienteB / (2 * coeficienteA);

  // Forzar el precio dentro de los límites fijados por el usuario.
  const precioOptimo = recortar(precioOptimoCrudo, precioMinimo, precioMaximo);

  const gananciaMaxima =
    coeficienteA * Math.pow(precioOptimo, 2) + coeficienteB * precioOptimo + coeficienteC;

  const precioFinal = aDosDecimales(precioOptimo);
  const gananciaFinal = aDosDecimales(gananciaMaxima);

  const estrategiaSugerida = sugerirEstrategia(precioOptimoCrudo, precioMinimo, precioMaximo);

  return {
    precioOptimo: precioFinal,
    gananciaMaxima: gananciaFinal,
    estrategiaSugerida,
  };
}

/**
 * Construye la curva de ganancia del escenario: 24 pasos (i 0..24) entre el
 * precio mínimo y máximo, más el punto óptimo destacado.
 */
export function buildProfitCurve(
  datos: OptimizarPrecioInputs,
  resultado: OptimizarPrecioResult
): ProfitCurve {
  const { coeficienteA, coeficienteB, coeficienteC, precioMinimo, precioMaximo } = datos;
  const pasos = 24;
  const labels: number[] = [];
  const datosCurva: number[] = [];

  for (let i = 0; i <= pasos; i++) {
    const precio = precioMinimo + ((precioMaximo - precioMinimo) * i) / pasos;
    const ganancia =
      coeficienteA * Math.pow(precio, 2) + coeficienteB * precio + coeficienteC;
    labels.push(Number(precio.toFixed(2)));
    datosCurva.push(Number(ganancia.toFixed(2)));
  }

  return {
    labels,
    datos: datosCurva,
    optimo: { x: resultado.precioOptimo, y: resultado.gananciaMaxima },
  };
}