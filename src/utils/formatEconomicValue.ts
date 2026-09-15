const economicFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Presentation only: never use the formatted string for calculations or persistence. */
export const formatEconomicValue = (value: number): string =>
  Number.isFinite(value) ? economicFormatter.format(value) : 'Indisponível';
