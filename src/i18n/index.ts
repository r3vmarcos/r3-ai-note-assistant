import type {
  ChavePrompt,
  IdiomaSaida,
  ModeloGeminiDisponivel,
  ObjetivoConteudo,
  PerfilEscrita,
  PosicaoBotaoFlutuante,
  TamanhoBotaoFlutuante,
  TipoInsercao
} from '../tipos/configuracoes';
import { DICIONARIO_DE } from './de';
import { DICIONARIO_EN } from './en';
import { DICIONARIO_ES } from './es';
import { DICIONARIO_FR } from './fr';
import { DICIONARIO_JA } from './ja';
import { DICIONARIO_PT_BR } from './pt-BR';
import { DICIONARIO_ZH_CN } from './zh-CN';

// ==data== Dicionários por idioma (pt-BR é o fallback)
const DICIONARIO: Record<IdiomaSaida, Record<string, string>> = {
  'pt-BR': DICIONARIO_PT_BR,
  en: DICIONARIO_EN,
  es: DICIONARIO_ES,
  fr: DICIONARIO_FR,
  de: DICIONARIO_DE,
  ja: DICIONARIO_JA,
  'zh-CN': DICIONARIO_ZH_CN
};

// ==function== Traduz uma chave e substitui variáveis {nome}
export function traduzir(idioma: IdiomaSaida, chave: string, variaveis?: Record<string, string | number>): string {
  const dicionario = DICIONARIO[idioma] ?? DICIONARIO['pt-BR'];
  const textoBase = dicionario[chave] ?? DICIONARIO['pt-BR'][chave] ?? chave;

  if (!variaveis) {
    return textoBase;
  }

  let textoFinal = textoBase;

  for (const chaveVariavel in variaveis) {
    const valor = variaveis[chaveVariavel];
    const padrao = new RegExp(`[{]${chaveVariavel}[}]`, 'g');
    textoFinal = textoFinal.replace(padrao, String(valor));
  }

  return textoFinal;
}

// ==function== Indica se a chave existe em algum dicionário
export function existeTraducao(idioma: IdiomaSaida, chave: string): boolean {
  return chave in DICIONARIO[idioma] || chave in DICIONARIO['pt-BR'];
}

// ==section== Atalhos de rótulos
export function obterNomeComando(idioma: IdiomaSaida, id: string): string {
  return traduzir(idioma, `comando.${id}`);
}

export function obterRotuloCurtoComando(idioma: IdiomaSaida, id: string): string {
  const chave = `menu.acao.${id}`;
  return existeTraducao(idioma, chave) ? traduzir(idioma, chave) : obterNomeComando(idioma, id);
}

export function obterRotuloModelo(idioma: IdiomaSaida, modelo: ModeloGeminiDisponivel): string {
  return traduzir(idioma, `modelo.${modelo}`);
}

export function obterRotuloIdioma(idioma: IdiomaSaida, valor: IdiomaSaida): string {
  return traduzir(idioma, `idioma.${valor}`);
}

export function obterRotuloPerfil(idioma: IdiomaSaida, valor: PerfilEscrita): string {
  return traduzir(idioma, `perfil.${valor}`);
}

export function obterRotuloPosicao(idioma: IdiomaSaida, valor: PosicaoBotaoFlutuante): string {
  return traduzir(idioma, `posicao.${valor}`);
}

export function obterRotuloInsercao(idioma: IdiomaSaida, valor: TipoInsercao): string {
  return traduzir(idioma, `insercao.${valor}`);
}

export function obterRotuloTamanhoBotao(idioma: IdiomaSaida, valor: TamanhoBotaoFlutuante): string {
  return traduzir(idioma, `botao.tamanho.${valor}`);
}

export function obterRotuloObjetivo(idioma: IdiomaSaida, valor: ObjetivoConteudo): string {
  return traduzir(idioma, `objetivo.${valor}`);
}

export function obterInstrucaoPerfil(idioma: IdiomaSaida, perfil: PerfilEscrita): string {
  return traduzir(idioma, `perfil.instrucao.${perfil}`);
}

export function obterInstrucaoIdioma(idioma: IdiomaSaida): string {
  return traduzir(idioma, `idioma.instrucao.${idioma}`);
}

export function obterTextosPrompt(idioma: IdiomaSaida, chave: ChavePrompt): { nome: string; descricao: string } {
  return {
    nome: traduzir(idioma, `prompt.${chave}.nome`),
    descricao: traduzir(idioma, `prompt.${chave}.descricao`)
  };
}
