import type { ConfiguracoesPlugin, NivelResposta } from '../tipos/configuracoes';

// ==data== Mínimo de palavras de um resumo (evita alvos ridículos em seleções curtas)
const MINIMO_PALAVRAS_RESUMO = 5;

// ==data== Mínimo de palavras selecionadas para usar o Resumir
export const MINIMO_SELECAO_RESUMO = 30;

// ==data== Mínimo de palavras do texto expandido (evita um resultado ridículo com seleção curta)
const MINIMO_PALAVRAS_EXPANDIR = 30;

// ==data== Ordem dos níveis do Resumir no menu e nas configurações (interno: expandido = Pouco, padrao = Normal, resumido = Compacto)
export const ORDEM_NIVEIS_RESUMIR: NivelResposta[] = ['expandido', 'padrao', 'resumido', 'ultra'];

// ==function== Indica se a seleção tem palavras suficientes para resumir
export function selecaoAtingeMinimoResumo(texto: string): boolean {
  return contarPalavras(texto) >= MINIMO_SELECAO_RESUMO;
}

// ==function== Conta palavras de um texto (ignora espaços extras)
export function contarPalavras(texto: string): number {
  const limpo = texto.trim();
  return limpo ? limpo.split(/\s+/).length : 0;
}

// ==function== Palavras alvo do resumo: tamanho da seleção × fator configurado para o nível
export function calcularPalavrasResumo(palavrasSelecao: number, fator: number): number {
  return Math.max(MINIMO_PALAVRAS_RESUMO, Math.round(palavrasSelecao * fator));
}

// ==types== Ações cujo tamanho é calculado pela seleção
export type GrupoComAlvoPorSelecao = 'resumir' | 'explicar' | 'expandir' | 'reescrever';

// ==function== Fator configurado do nível para o grupo (resumir: fração; demais: múltiplo)
export function fatorDoNivel(configuracoes: ConfiguracoesPlugin, grupo: GrupoComAlvoPorSelecao, nivel: NivelResposta): number {
  if (grupo === 'resumir') {
    return configuracoes.fatoresResumo[nivel];
  }
  if (grupo === 'expandir') {
    return configuracoes.fatoresExpandir[nivel];
  }
  if (grupo === 'reescrever') {
    return configuracoes.fatoresReescrever[nivel];
  }
  return configuracoes.fatoresExplicar[nivel];
}

// ==function== Palavras alvo do Expandir: seleção × fator, com mínimo de 30 palavras
export function calcularPalavrasExpandir(palavrasSelecao: number, fator: number): number {
  return Math.max(MINIMO_PALAVRAS_EXPANDIR, Math.round(palavrasSelecao * fator));
}

// ==function== Estimativa de palavras de um nível, dado o texto selecionado
export function estimarPalavrasNivel(textoSelecionado: string, grupo: GrupoComAlvoPorSelecao, nivel: NivelResposta, configuracoes: ConfiguracoesPlugin): number {
  const palavras = contarPalavras(textoSelecionado);
  const fator = fatorDoNivel(configuracoes, grupo, nivel);
  return grupo === 'expandir' ? calcularPalavrasExpandir(palavras, fator) : calcularPalavrasResumo(palavras, fator);
}
