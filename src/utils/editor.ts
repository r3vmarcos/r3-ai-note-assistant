import type { Editor, EditorPosition } from 'obsidian';

import type { RegistroUltimaGeracao, TipoInsercao } from '../tipos/configuracoes';

// === TIPOS DO EDITOR | inicio ===
export interface ContextoEditor {
  tituloNota: string;
  selecao: string;
  inicioSelecao: EditorPosition;
  fimSelecao: EditorPosition;
  headingAtual: string;
  resumoContexto: string;
  textoCompleto: string;
}

interface PlanoInsercao {
  posicaoBase: EditorPosition;
  prefixo: string;
  removerSelecao: boolean;
  /** Separador colocado depois do texto gerado (usado ao inserir no começo da nota) */
  sufixo?: string;
}

export interface SessaoInsercaoStreaming {
  adicionar(delta: string): void;
  finalizar(): RegistroUltimaGeracao;
  cancelar(): void;
}
// === TIPOS DO EDITOR | fim ===

// === FUNCOES DE LEITURA | inicio ===
export function montarContextoEditor(editor: Editor, tituloNota: string): ContextoEditor {
  const textoCompleto = editor.getValue();
  const selecao = editor.getSelection();
  const inicioSelecao = editor.getCursor('from');
  const fimSelecao = editor.getCursor('to');

  return {
    tituloNota,
    selecao,
    inicioSelecao,
    fimSelecao,
    headingAtual: encontrarHeadingAtual(editor, inicioSelecao.line),
    resumoContexto: montarResumoContexto(editor, inicioSelecao, fimSelecao, tituloNota),
    textoCompleto
  };
}
// === FUNCOES DE LEITURA | fim ===

// === FUNCOES DE INSERCAO | inicio ===
export function criarSessaoInsercaoStreaming(
  editor: Editor,
  tipoInsercao: TipoInsercao,
  contexto: ContextoEditor,
  caminhoArquivo: string
): SessaoInsercaoStreaming {
  const planoInsercao = prepararPlanoInsercao(editor, tipoInsercao, contexto);
  const textoRemovido = planoInsercao.removerSelecao ? contexto.selecao : '';

  if (planoInsercao.removerSelecao) {
    editor.replaceRange('', contexto.inicioSelecao, contexto.fimSelecao);
  }

  if (planoInsercao.prefixo) {
    editor.replaceRange(planoInsercao.prefixo, planoInsercao.posicaoBase);
  }

  const inicioInsercao = avancarPosicaoPorTexto(editor, planoInsercao.posicaoBase, planoInsercao.prefixo);
  let fimInsercao = inicioInsercao;
  let textoInserido = '';

  return {
    adicionar(delta: string): void {
      if (!delta) {
        return;
      }

      editor.replaceRange(delta, fimInsercao);
      textoInserido += delta;
      fimInsercao = avancarPosicaoPorTexto(editor, fimInsercao, delta);
      editor.setCursor(fimInsercao);
    },

    finalizar(): RegistroUltimaGeracao {
      // ==section== Separa o texto gerado do conteúdo que já existia na nota
      if (planoInsercao.sufixo) {
        editor.replaceRange(planoInsercao.sufixo, fimInsercao);
        textoInserido += planoInsercao.sufixo;
        fimInsercao = avancarPosicaoPorTexto(editor, fimInsercao, planoInsercao.sufixo);
      }

      return {
        caminhoArquivo,
        prefixoInserido: planoInsercao.prefixo,
        textoInserido,
        inicioInsercao,
        fimInsercao,
        textoRemovido,
        inicioRemocao: contexto.inicioSelecao,
        fimRemocao: contexto.fimSelecao
      };
    },

    cancelar(): void {
      if (textoInserido) {
        editor.replaceRange('', inicioInsercao, fimInsercao);
      }

      if (textoRemovido) {
        editor.replaceRange(textoRemovido, contexto.inicioSelecao);
      }
    }
  };
}

export async function inserirTextoNoEditorAnimado(
  editor: Editor,
  tipoInsercao: TipoInsercao,
  texto: string,
  contexto: ContextoEditor,
  caminhoArquivo: string,
  intervaloMs: number,
  tamanhoMinimoLote: number,
  tamanhoMaximoLote: number
): Promise<RegistroUltimaGeracao> {
  const sessao = criarSessaoInsercaoStreaming(editor, tipoInsercao, contexto, caminhoArquivo);
  const blocos = quebrarTextoEmBlocos(texto.trim(), tamanhoMinimoLote, tamanhoMaximoLote);

  for (const bloco of blocos) {
    sessao.adicionar(bloco);
    await esperar(intervaloMs);
  }

  return sessao.finalizar();
}

// ==function== Troca o texto recém-inserido por outro (ex.: diagrama corrigido). null se o trecho mudou.
export function substituirTextoInserido(editor: Editor, registro: RegistroUltimaGeracao, novoTexto: string): RegistroUltimaGeracao | null {
  const textoAtual = editor.getRange(registro.inicioInsercao, registro.fimInsercao);
  if (textoAtual !== registro.textoInserido) {
    return null;
  }

  editor.replaceRange(novoTexto, registro.inicioInsercao, registro.fimInsercao);
  const offsetInicio = editor.posToOffset(registro.inicioInsercao);
  return { ...registro, textoInserido: novoTexto, fimInsercao: editor.offsetToPos(offsetInicio + novoTexto.length) };
}

// ==types== Resultado da tentativa de desfazer
export type ResultadoDesfazer = 'desfeito' | 'realocado' | 'texto-alterado';

// ==function== Desfaz uma geração validando se o texto ainda está onde foi inserido
// ==types== Como refazer uma geração desfeita: onde o texto removido ficou e qual prefixo foi retirado
export interface RegistroRefazer {
  registro: RegistroUltimaGeracao;
  posicao: { line: number; ch: number };
  prefixoUsado: string;
}

export interface ResultadoDesfazerCompleto {
  resultado: ResultadoDesfazer;
  refazer: RegistroRefazer | null;
}

export function desfazerGeracao(editor: Editor, registro: RegistroUltimaGeracao): ResultadoDesfazerCompleto {
  const textoNaPosicao = editor.getRange(registro.inicioInsercao, registro.fimInsercao);
  let offsetInicio = editor.posToOffset(registro.inicioInsercao);
  let resultado: ResultadoDesfazer = 'desfeito';

  if (textoNaPosicao !== registro.textoInserido) {
    const offsetEncontrado = localizarTextoUnico(editor.getValue(), registro.textoInserido);
    if (offsetEncontrado === null) {
      return { resultado: 'texto-alterado', refazer: null };
    }
    offsetInicio = offsetEncontrado;
    resultado = 'realocado';
  }

  // ==section== Remove também o separador ("\n" / "\n\n") inserido antes do texto
  const prefixo = registro.prefixoInserido ?? '';
  const documento = editor.getValue();
  const possuiPrefixo = Boolean(prefixo) && documento.slice(offsetInicio - prefixo.length, offsetInicio) === prefixo;
  const offsetRemocao = possuiPrefixo ? offsetInicio - prefixo.length : offsetInicio;
  const offsetFim = offsetInicio + registro.textoInserido.length;

  const posicaoRemocao = editor.offsetToPos(offsetRemocao);
  editor.replaceRange('', posicaoRemocao, editor.offsetToPos(offsetFim));

  if (registro.textoRemovido) {
    editor.replaceRange(registro.textoRemovido, posicaoRemocao);
  }

  return {
    resultado,
    refazer: { registro, posicao: posicaoRemocao, prefixoUsado: possuiPrefixo ? prefixo : '' }
  };
}

// ==function== Refaz a geração desfeita: tira o texto que voltou no lugar e insere o gerado de novo
// Retorna o registro atualizado com as novas posições, ou null se o texto foi editado nesse meio tempo
export function refazerGeracao(editor: Editor, item: RegistroRefazer): RegistroUltimaGeracao | null {
  const { registro, posicao, prefixoUsado } = item;
  const offsetBase = editor.posToOffset(posicao);
  const fimRemovido = editor.offsetToPos(offsetBase + registro.textoRemovido.length);

  if (editor.getRange(posicao, fimRemovido) !== registro.textoRemovido) {
    return null;
  }

  if (registro.textoRemovido) {
    editor.replaceRange('', posicao, fimRemovido);
  }

  editor.replaceRange(prefixoUsado + registro.textoInserido, posicao);
  const inicioTexto = offsetBase + prefixoUsado.length;

  return {
    ...registro,
    prefixoInserido: prefixoUsado,
    inicioInsercao: editor.offsetToPos(inicioTexto),
    fimInsercao: editor.offsetToPos(inicioTexto + registro.textoInserido.length)
  };
}

function localizarTextoUnico(documento: string, texto: string): number | null {
  if (!texto) {
    return null;
  }

  const primeiro = documento.indexOf(texto);
  if (primeiro === -1 || documento.indexOf(texto, primeiro + 1) !== -1) {
    return null;
  }

  return primeiro;
}
// === FUNCOES DE INSERCAO | fim ===

// === FUNCOES AUXILIARES | inicio ===
function prepararPlanoInsercao(editor: Editor, tipoInsercao: TipoInsercao, contexto: ContextoEditor): PlanoInsercao {
  if (tipoInsercao === 'start') {
    const notaTemConteudo = editor.getValue().trim().length > 0;
    return {
      posicaoBase: { line: 0, ch: 0 },
      prefixo: '',
      removerSelecao: false,
      sufixo: notaTemConteudo ? '\n\n' : ''
    };
  }

  if (tipoInsercao === 'replace') {
    return {
      posicaoBase: contexto.inicioSelecao,
      prefixo: '',
      removerSelecao: true
    };
  }

  if (tipoInsercao === 'below') {
    return {
      posicaoBase: contexto.fimSelecao,
      prefixo: obterSeparadorParaLinhaAbaixo(editor, contexto.fimSelecao),
      removerSelecao: false
    };
  }

  return {
    posicaoBase: obterPosicaoFinalDoArquivo(editor),
    prefixo: obterSeparadorParaFinalDoArquivo(editor),
    removerSelecao: false
  };
}

function encontrarHeadingAtual(editor: Editor, linhaInicial: number): string {
  for (let linha = linhaInicial; linha >= 0; linha -= 1) {
    const texto = editor.getLine(linha) ?? '';
    const match = texto.match(/^\s{0,3}#{1,6}\s+(.*)$/);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return '';
}

function montarResumoContexto(editor: Editor, inicio: EditorPosition, fim: EditorPosition, tituloNota: string): string {
  const antes = obterJanelaTexto(editor, inicio, -650, 0);
  const depois = obterJanelaTexto(editor, fim, 0, 650);
  const headingAtual = encontrarHeadingAtual(editor, inicio.line);
  const inicioNota = editor.getRange({ line: 0, ch: 0 }, editor.offsetToPos(Math.min(editor.getValue().length, 700))).trim();

  const partes = [
    tituloNota ? `Título da nota: ${tituloNota}` : '',
    headingAtual ? `Seção atual: ${headingAtual}` : '',
    antes ? `Texto antes da seleção:\n${antes}` : '',
    depois ? `Texto depois da seleção:\n${depois}` : '',
    inicioNota ? `Início da nota:\n${inicioNota}` : ''
  ].filter(Boolean);

  return partes.join('\n\n');
}

function obterJanelaTexto(editor: Editor, posicaoBase: EditorPosition, deslocamentoInicial: number, deslocamentoFinal: number): string {
  const offsetBase = editor.posToOffset(posicaoBase);
  const inicio = Math.max(0, offsetBase + deslocamentoInicial);
  const fim = Math.max(inicio, Math.min(editor.getValue().length, offsetBase + deslocamentoFinal));

  return editor.getRange(editor.offsetToPos(inicio), editor.offsetToPos(fim)).trim();
}

function obterPosicaoFinalDoArquivo(editor: Editor): EditorPosition {
  const ultimaLinha = editor.lastLine();
  const ultimaColuna = editor.getLine(ultimaLinha).length;

  return {
    line: ultimaLinha,
    ch: ultimaColuna
  };
}

function obterSeparadorParaFinalDoArquivo(editor: Editor): string {
  const posicaoFinal = obterPosicaoFinalDoArquivo(editor);
  const possuiConteudo = !(posicaoFinal.line === 0 && posicaoFinal.ch === 0 && editor.getValue() === '');

  if (!possuiConteudo) {
    return '';
  }

  return '\n\n';
}

function obterSeparadorParaLinhaAbaixo(editor: Editor, posicaoBase: EditorPosition): string {
  const documentoVazio = editor.getValue() === '';

  if (documentoVazio) {
    return '';
  }

  const textoLinhaAtual = editor.getLine(posicaoBase.line) ?? '';

  if (posicaoBase.ch === 0 && textoLinhaAtual.length === 0) {
    return '';
  }

  return '\n';
}

function avancarPosicaoPorTexto(editor: Editor, posicaoInicial: EditorPosition, texto: string): EditorPosition {
  if (!texto) {
    return posicaoInicial;
  }

  const offsetInicial = editor.posToOffset(posicaoInicial);
  return editor.offsetToPos(offsetInicial + texto.length);
}

function quebrarTextoEmBlocos(texto: string, minimo: number, maximo: number): string[] {
  const tokens = texto.match(/\S+\s*/g) ?? [texto];
  const tamanhoDoLote = limitarNumero(Math.ceil(tokens.length / 110), minimo, maximo);
  const blocos: string[] = [];

  for (let indice = 0; indice < tokens.length; indice += tamanhoDoLote) {
    blocos.push(tokens.slice(indice, indice + tamanhoDoLote).join(''));
  }

  return blocos;
}

function limitarNumero(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

function esperar(tempoMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, tempoMs);
  });
}
// === FUNCOES AUXILIARES | fim ===
