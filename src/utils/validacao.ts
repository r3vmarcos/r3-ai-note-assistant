// ==function== Type guard: verifica se o valor pertence à lista de opções
export function ehOpcaoValida<T extends string>(opcoes: readonly T[], valor: string): valor is T {
  return (opcoes as readonly string[]).includes(valor);
}

// ==function== Converte texto em inteiro >= mínimo (null se inválido)
export function converterInteiro(valor: string, minimo = 0): number | null {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(minimo, Math.floor(numero)) : null;
}
