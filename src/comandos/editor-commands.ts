import { MarkdownView, type Command, type Editor, type TFile } from 'obsidian';

import type GeminiAssistantR3Plugin from '../main';
import { obterNomeComando, obterRotuloModelo, traduzir } from '../i18n';
import { GeminiApiService, type ResultadoGeracaoGemini } from '../servicos/gemini-api-service';
import { executarTesteVelocidade, finalizarResumoTeste } from '../servicos/teste-velocidade';
import { NIVEIS_RESPOSTA } from '../settings/padroes';
import type { ChavePrompt, ChaveTipoInsercao, IdGrupoMenu, ModeloGeminiDisponivel, NivelResposta, TipoInsercao, TomEscrita } from '../tipos/configuracoes';
import { confirmarAcao } from '../ui/modal-confirmar';
import { escolherOpcao } from '../ui/modal-escolha';
import { escolherIdiomaTraducao } from '../ui/modal-traducao';
import { nomeExibicaoIdiomaTraducao } from '../data/idiomas-traducao';
import { MINIMO_SELECAO_RESUMO, selecaoAtingeMinimoResumo } from '../utils/resumo';
import { criarNovaNotaComConteudo, ModalPreviewGeracao } from '../ui/preview-modal';
import { revisarDiagramas, type RelatorioDiagramas } from '../utils/diagramas';
import {
  criarSessaoInsercaoStreaming,
  desfazerGeracao,
  refazerGeracao,
  inserirTextoNoEditorAnimado,
  montarContextoEditor,
  substituirTextoInserido,
  type ContextoEditor,
  type SessaoInsercaoStreaming
} from '../utils/editor';
import { criarNoticeProgresso, DURACAO_NOTICE_CURTA, finalizarNotice, mostrarNoticeTemporario } from '../utils/notice';
import { montarPromptConversaoMermaid, montarPromptCorrecaoMermaid, removerTituloRepetido, renderizarPrompt } from '../utils/prompt';

// ==types== Definição de uma ação da IA (intenção + nível)
export interface DefinicaoComando {
  id: string;
  grupo: IdGrupoMenu;
  nivel: NivelResposta | null;
  chavePrompt: ChavePrompt;
  chaveTipoInsercao: ChaveTipoInsercao;
  exigeSelecao: boolean;
}

// ==types== Opções extras de execução
export interface OpcoesExecucao {
  /** Texto digitado no campo "Pedir à IA" do menu (seleção passa a ser opcional) */
  instrucaoPersonalizada?: string;
}

// ==data== Intenções com os três níveis (ordem = ordem no menu)
const INTENCOES_COM_NIVEL: { grupo: IdGrupoMenu; chavePrompt: ChavePrompt; chaveTipoInsercao: ChaveTipoInsercao; exigeSelecao: boolean }[] = [
  { grupo: 'gerar', chavePrompt: 'promptGerar', chaveTipoInsercao: 'insercaoGerar', exigeSelecao: false },
  { grupo: 'resumir', chavePrompt: 'promptResumir', chaveTipoInsercao: 'insercaoResumir', exigeSelecao: true },
  { grupo: 'explicar', chavePrompt: 'promptExplicar', chaveTipoInsercao: 'insercaoExplicar', exigeSelecao: false },
  { grupo: 'expandir', chavePrompt: 'promptExpandir', chaveTipoInsercao: 'insercaoExpandir', exigeSelecao: true },
  { grupo: 'reescrever', chavePrompt: 'promptReescrever', chaveTipoInsercao: 'insercaoReescrever', exigeSelecao: true },
  { grupo: 'responder', chavePrompt: 'promptResponder', chaveTipoInsercao: 'insercaoResponder', exigeSelecao: true }
];

export const ID_PROMPT_PERSONALIZADO = 'executar-prompt-personalizado';
export const ID_CORRIGIR_GRAMATICA = 'corrigir-gramatica';

// ==data== Todas as ações: 6 intenções × 4 níveis + ferramentas do grupo Outros + pedido livre
export const DEFINICOES_COMANDOS: DefinicaoComando[] = [
  ...INTENCOES_COM_NIVEL.flatMap((intencao) =>
    NIVEIS_RESPOSTA.map((nivel) => ({ id: `${intencao.grupo}-${nivel}`, nivel, ...intencao }))
  ),
  // ==data== Ferramentas do grupo Outros (sem níveis). Corrigir, Traduzir, Perguntas e Tom: sem seleção, usam a nota toda
  { id: ID_CORRIGIR_GRAMATICA, grupo: 'outros', nivel: null, chavePrompt: 'promptCorrigir', chaveTipoInsercao: 'insercaoCorrigir', exigeSelecao: false },
  { id: 'traduzir-selecao', grupo: 'outros', nivel: null, chavePrompt: 'promptTraduzir', chaveTipoInsercao: 'insercaoTraduzir', exigeSelecao: false },
  { id: 'converter-tabela', grupo: 'outros', nivel: null, chavePrompt: 'promptTabela', chaveTipoInsercao: 'insercaoTabela', exigeSelecao: true },
  { id: 'criar-diagrama', grupo: 'outros', nivel: null, chavePrompt: 'promptDiagrama', chaveTipoInsercao: 'insercaoDiagrama', exigeSelecao: true },
  { id: 'perguntas-revisao', grupo: 'outros', nivel: null, chavePrompt: 'promptPerguntas', chaveTipoInsercao: 'insercaoPerguntas', exigeSelecao: false },
  { id: 'sugerir-titulo-tags', grupo: 'outros', nivel: null, chavePrompt: 'promptTituloTags', chaveTipoInsercao: 'insercaoTituloTags', exigeSelecao: false },
  // O tom (formal, simples ou técnico) é escolhido no modal
  { id: 'mudar-tom', grupo: 'outros', nivel: null, chavePrompt: 'promptTom', chaveTipoInsercao: 'insercaoTom', exigeSelecao: false },
  { id: ID_PROMPT_PERSONALIZADO, grupo: 'outros', nivel: null, chavePrompt: 'promptPersonalizado', chaveTipoInsercao: 'insercaoPersonalizado', exigeSelecao: true }
];

export const IDS_COMANDOS_EXTRAS = ['repetir-ultima-acao-ia', 'desfazer-ultima-geracao-ia', 'parar-geracao-ia', 'abrir-paleta-acoes-ia', 'abrir-tutorial'] as const;

// ==function== Busca uma definição pelo id
export function obterDefinicaoComando(id: string): DefinicaoComando | null {
  return DEFINICOES_COMANDOS.find((definicao) => definicao.id === id) ?? null;
}

// ==function== Indica se a ação precisa de texto selecionado
export function exigeSelecao(definicao: DefinicaoComando): boolean {
  return definicao.exigeSelecao;
}

// ==function== Ação que o atalho de um prompt executa (nível padrão ou ação sem nível)
export function ehAcaoDoAtalho(definicao: DefinicaoComando): boolean {
  return definicao.nivel === null || definicao.nivel === 'padrao';
}

// ==function== Fábrica dos comandos registrados no Obsidian
export function criarComandosDoEditor(plugin: GeminiAssistantR3Plugin): Command[] {
  const idioma = plugin.settings.idioma;

  const comandos: Command[] = DEFINICOES_COMANDOS.map((definicao) => ({
    id: definicao.id,
    name: obterNomeComando(idioma, definicao.id),
    editorCallback: (editor: Editor) => executarComando(plugin, editor, definicao)
  }));

  comandos.push(
    {
      id: 'repetir-ultima-acao-ia',
      name: obterNomeComando(idioma, 'repetir-ultima-acao-ia'),
      editorCallback: async (editor: Editor) => {
        const ultimaDefinicao = plugin.obterUltimaAcaoExecutada();
        if (!ultimaDefinicao) {
          mostrarNoticeTemporario(traduzir(plugin.settings.idioma, 'notice.repetirNada'), DURACAO_NOTICE_CURTA);
          return;
        }
        await executarComando(plugin, editor, ultimaDefinicao);
      }
    },
    {
      id: 'desfazer-ultima-geracao-ia',
      name: obterNomeComando(idioma, 'desfazer-ultima-geracao-ia'),
      editorCallback: (editor: Editor) => executarDesfazer(plugin, editor)
    },
    {
      id: 'parar-geracao-ia',
      name: obterNomeComando(idioma, 'parar-geracao-ia'),
      callback: () => {
        const parou = plugin.abortarGeracaoAtual();
        mostrarNoticeTemporario(traduzir(plugin.settings.idioma, parou ? 'notice.geracaoCancelada' : 'notice.geracaoNaoAtiva'), DURACAO_NOTICE_CURTA);
      }
    },
    {
      id: 'abrir-paleta-acoes-ia',
      name: obterNomeComando(idioma, 'abrir-paleta-acoes-ia'),
      editorCallback: (editor: Editor) => plugin.abrirPaletaAcoes(editor)
    },
    {
      id: 'abrir-tutorial',
      name: obterNomeComando(idioma, 'abrir-tutorial'),
      callback: () => plugin.abrirTutorial()
    }
  );

  return comandos;
}

// ==function== Executa uma ação da IA no editor
export async function executarComando(plugin: GeminiAssistantR3Plugin, editor: Editor, definicao: DefinicaoComando, opcoes: OpcoesExecucao = {}): Promise<void> {
  const idioma = plugin.settings.idioma;
  const arquivoAtivo = plugin.app.workspace.getActiveFile();

  if (!arquivoAtivo) {
    mostrarNoticeTemporario(traduzir(idioma, 'notice.abrirNotaMarkdown'));
    return;
  }

  if (plugin.existeGeracaoAtiva()) {
    mostrarNoticeTemporario(traduzir(idioma, 'notice.geracaoJaAtiva'), DURACAO_NOTICE_CURTA);
    return;
  }

  const instrucao = opcoes.instrucaoPersonalizada?.trim() ?? '';
  const contexto = montarContextoEditor(editor, arquivoAtivo.basename);
  const deveExigirSelecao = exigeSelecao(definicao) && !instrucao;

  if (deveExigirSelecao && !contexto.selecao.trim()) {
    mostrarNoticeTemporario(traduzir(idioma, 'notice.selecioneTrecho'));
    return;
  }

  if (definicao.grupo === 'resumir' && !selecaoAtingeMinimoResumo(contexto.selecao)) {
    mostrarNoticeTemporario(traduzir(idioma, 'notice.resumirMinimo', { minimo: MINIMO_SELECAO_RESUMO }), DURACAO_NOTICE_CURTA);
    return;
  }

  const acao = instrucao ? traduzir(idioma, 'menu.pedir.rotulo') : obterNomeComando(idioma, definicao.id);
  let tipoInsercao: TipoInsercao = plugin.settings[definicao.chaveTipoInsercao];
  let contextoInsercao = contexto;

  // Explicar sem seleção explica o tema da nota e entra no começo dela
  if (definicao.grupo === 'explicar' && !contexto.selecao.trim()) {
    tipoInsercao = 'start';
  }

  // ==section== Gerar com seleção cria uma nota nova (a seleção vira o título e a nota atual é a referência)
  const contextoNovaNota: ContextoEditor | null = definicao.grupo === 'gerar' && !instrucao && contexto.selecao.trim()
    ? { ...contexto, tituloNota: nomeDaSelecao(contexto.selecao), selecao: '' }
    : null;

  // ==section== Gerar sem seleção substitui todo o conteúdo da nota; pede confirmação quando há texto
  if (definicao.grupo === 'gerar' && !contextoNovaNota && editor.getValue().trim()) {
    const confirmado = await confirmarAcao(plugin.app, {
      mensagem: traduzir(idioma, 'confirm.apagarNota'),
      confirmar: traduzir(idioma, 'confirm.apagarGerar'),
      cancelar: traduzir(idioma, 'confirm.cancelar')
    });
    if (!confirmado) {
      return;
    }
    contextoInsercao = contextoNotaInteira(editor, contexto);
    tipoInsercao = 'replace';
  }
  // ==section== Ferramentas que, sem seleção, trabalham com a nota toda (sem as propriedades do topo)
  let contextoPrompt: ContextoEditor = contextoNovaNota ?? contexto;
  const destinoNotaToda = !instrucao && !contexto.selecao.trim() ? ACOES_NOTA_TODA[definicao.id] : undefined;
  if (destinoNotaToda) {
    const corpo = contextoCorpoDaNota(editor, contexto);
    if (!corpo.selecao.trim()) {
      mostrarNoticeTemporario(traduzir(idioma, 'notice.notaVazia'));
      return;
    }
    contextoPrompt = corpo;
    if (destinoNotaToda === 'substituir') {
      contextoInsercao = corpo;
      tipoInsercao = 'replace';
    } else {
      tipoInsercao = 'append';
    }
  }

  // ==section== Modal de escolha antes de gerar (idioma da tradução, quantidade de perguntas, tom)
  if (!instrucao && !(await perguntarOpcoesDaAcao(plugin, definicao))) {
    return;
  }

  const promptFinal = renderizarPrompt(definicao, plugin.settings[definicao.chavePrompt], contextoPrompt, plugin.settings, instrucao);
  const controller = plugin.iniciarGeracaoAtual();
  const notice = criarNoticeProgresso(traduzir(idioma, 'notice.gerandoConteudo', { acao }));
  const relatorios: RelatorioDiagramas[] = [];

  try {
    const parametros: ParametrosGeracao = {
      relatorios,
      plugin,
      editor,
      servico: new GeminiApiService(plugin.settings),
      promptFinal,
      tipoInsercao,
      contexto: contextoNovaNota ?? contextoInsercao,
      caminhoArquivo: arquivoAtivo.path,
      notice,
      signal: controller.signal,
      prefixoResultado: definicao.id === 'traduzir-selecao' && !instrucao ? montarCabecalhoTraducao(plugin) : undefined
    };
    const textoGerado = contextoNovaNota ? await gerarEmNovaNota(parametros, contexto.selecao) : await gerarTextoConformeModo(parametros);

    if (textoGerado) {
      plugin.definirUltimaAcaoExecutada(definicao.id);
      plugin.registrarGeracaoConcluida();
      const avisoDiagramas = montarAvisoDiagramas(plugin, relatorios);
      finalizarNotice(notice, [traduzir(idioma, 'notice.conteudoGerado'), avisoDiagramas].filter(Boolean).join(' '), avisoDiagramas ? 6000 : undefined);
    } else {
      finalizarNotice(notice, null, 0);
    }
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'unknown';
    finalizarNotice(notice, traduzir(idioma, 'notice.falha', { mensagem }));
  } finally {
    plugin.finalizarGeracaoAtual();
  }
}

// ==function== Desfaz a geração mais recente da nota ativa (pilha por nota)
export function executarDesfazer(plugin: GeminiAssistantR3Plugin, editor: Editor): void {
  const idioma = plugin.settings.idioma;
  const arquivoAtivo = plugin.app.workspace.getActiveFile();
  const registro = arquivoAtivo ? plugin.obterUltimaGeracaoDaNota(arquivoAtivo.path) : null;

  if (!registro) {
    mostrarNoticeTemporario(traduzir(idioma, plugin.possuiHistoricoGeracoes() ? 'notice.desfazerOutraNota' : 'notice.desfazerNada'));
    return;
  }

  const { resultado, refazer } = desfazerGeracao(editor, registro);
  plugin.removerGeracaoDoHistorico(registro);

  if (resultado === 'texto-alterado' || !refazer) {
    mostrarNoticeTemporario(traduzir(idioma, 'notice.desfazerTextoAlterado'));
    return;
  }

  plugin.registrarRefazer(refazer);
  const restantes = plugin.contarGeracoesDaNota(registro.caminhoArquivo);
  const chave = restantes > 0 ? 'notice.desfazerOkRestantes' : 'notice.desfazerOk';
  mostrarNoticeTemporario(traduzir(idioma, chave, { quantidade: restantes }), DURACAO_NOTICE_CURTA);
}

// ==function== Refaz a última geração desfeita da nota ativa (pilha por nota)
export function executarRefazer(plugin: GeminiAssistantR3Plugin, editor: Editor): void {
  const idioma = plugin.settings.idioma;
  const arquivoAtivo = plugin.app.workspace.getActiveFile();
  const item = arquivoAtivo ? plugin.obterRefazerDaNota(arquivoAtivo.path) : null;

  if (!item) {
    mostrarNoticeTemporario(traduzir(idioma, 'notice.refazerNada'));
    return;
  }

  plugin.removerRefazer(item);
  const restaurado = refazerGeracao(editor, item);

  if (!restaurado) {
    mostrarNoticeTemporario(traduzir(idioma, 'notice.refazerTextoAlterado'));
    return;
  }

  plugin.restaurarGeracao(restaurado);
  mostrarNoticeTemporario(traduzir(idioma, 'notice.refazerOk'), DURACAO_NOTICE_CURTA);
}

// ==function== Valida a chave/modelo e, em seguida, mede a velocidade de todos os modelos
export async function executarTesteConexao(plugin: GeminiAssistantR3Plugin, aoConcluir: () => void = () => undefined): Promise<void> {
  const idioma = plugin.settings.idioma;
  const notice = criarNoticeProgresso(traduzir(idioma, 'notice.testandoConexao'));

  try {
    const resposta = await new GeminiApiService(plugin.settings).testarConexao();
    notice.setMessage(traduzir(idioma, 'notice.conexaoOk', { resposta }));
    const resultados = await executarTesteVelocidade(plugin, (atual, total, modelo) => {
      notice.setMessage(traduzir(idioma, 'config.velocidade.progresso', { atual, total, modelo: obterRotuloModelo(idioma, modelo) }));
    });
    finalizarResumoTeste(idioma, notice, resultados);
    aoConcluir();
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'unknown';
    finalizarNotice(notice, traduzir(idioma, 'notice.falha', { mensagem }), 4000);
  }
}

// ==function== Obtém o editor da view Markdown ativa (modo edição)
export function obterEditorAtivo(plugin: GeminiAssistantR3Plugin): Editor | null {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  return view && view.getMode() === 'source' ? view.editor : null;
}

// ==section== Fluxos de geração (preview, streaming, normal)
interface ParametrosGeracao {
  plugin: GeminiAssistantR3Plugin;
  editor: Editor;
  servico: GeminiApiService;
  promptFinal: string;
  tipoInsercao: TipoInsercao;
  contexto: ContextoEditor;
  caminhoArquivo: string;
  notice: { setMessage: (mensagem: string) => unknown };
  signal: AbortSignal;
  relatorios: RelatorioDiagramas[];
  /** Texto fixo inserido antes do resultado (ex.: título da tradução) */
  prefixoResultado?: string;
}

// ==function== Título que vai antes da tradução: "**Tradução para Inglês** ————————"
function montarCabecalhoTraducao(plugin: GeminiAssistantR3Plugin): string {
  const idioma = plugin.settings.idioma;
  const nome = nomeExibicaoIdiomaTraducao(plugin.settings.idiomaTraducao, idioma);
  return `**${traduzir(idioma, 'traducao.cabecalho', { idioma: nome })}** ————————\n\n`;
}

// ==data== Ferramentas que, sem seleção, usam a nota toda: substituem a nota ou entram no fim dela
const ACOES_NOTA_TODA: Record<string, 'substituir' | 'final'> = {
  [ID_CORRIGIR_GRAMATICA]: 'substituir',
  'mudar-tom': 'substituir',
  'traduzir-selecao': 'final',
  'perguntas-revisao': 'final'
};

// ==data== Opções dos modais de Perguntas e Tom
const QUANTIDADES_PERGUNTAS = ['3', '5', '10', '15', '20'] as const;
const TONS: TomEscrita[] = ['formal', 'simples', 'tecnico'];

// ==function== Contexto com o corpo da nota como seleção (ignora as propriedades/frontmatter do topo)
function contextoCorpoDaNota(editor: Editor, contexto: ContextoEditor): ContextoEditor {
  const documento = editor.getValue();
  const propriedades = documento.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/);
  const inicio = editor.offsetToPos(propriedades ? propriedades[0].length : 0);
  const ultimaLinha = editor.lastLine();
  const fim = { line: ultimaLinha, ch: editor.getLine(ultimaLinha).length };
  return { ...contexto, selecao: editor.getRange(inicio, fim), inicioSelecao: inicio, fimSelecao: fim };
}

// ==function== Abre o modal da ação (quando ela tem um) e salva a escolha; false = cancelado
async function perguntarOpcoesDaAcao(plugin: GeminiAssistantR3Plugin, definicao: DefinicaoComando): Promise<boolean> {
  const idioma = plugin.settings.idioma;
  const botoes = { confirmar: traduzir(idioma, 'modal.escolha.confirmar'), cancelar: traduzir(idioma, 'confirm.cancelar') };

  if (definicao.id === 'traduzir-selecao') {
    // 20 idiomas principais em botões e busca para qualquer outro (inclusive digitado livremente)
    const escolha = await escolherIdiomaTraducao(plugin.app, plugin.settings.idiomaTraducao, {
      titulo: traduzir(idioma, 'modal.traduzir.rotulo'),
      busca: traduzir(idioma, 'modal.traduzir.busca'),
      livre: traduzir(idioma, 'modal.traduzir.livre')
    });
    if (!escolha) return false;
    plugin.settings.idiomaTraducao = escolha;
  } else if (definicao.id === 'perguntas-revisao') {
    const atual = String(plugin.settings.quantidadePerguntas);
    const escolha = await escolherOpcao<string>(plugin.app, {
      ...botoes,
      titulo: traduzir(idioma, 'modal.perguntas.titulo'),
      rotulo: traduzir(idioma, 'modal.perguntas.rotulo'),
      opcoes: QUANTIDADES_PERGUNTAS.map((valor) => ({ valor, rotulo: valor })),
      valorInicial: (QUANTIDADES_PERGUNTAS as readonly string[]).includes(atual) ? atual : '10'
    });
    if (!escolha) return false;
    plugin.settings.quantidadePerguntas = Number(escolha);
  } else if (definicao.id === 'mudar-tom') {
    const escolha = await escolherOpcao(plugin.app, {
      ...botoes,
      titulo: traduzir(idioma, 'modal.tom.titulo'),
      rotulo: traduzir(idioma, 'modal.tom.rotulo'),
      opcoes: TONS.map((valor) => ({ valor, rotulo: traduzir(idioma, `tom.${valor}`) })),
      valorInicial: plugin.settings.tomPadrao
    });
    if (!escolha) return false;
    plugin.settings.tomPadrao = escolha;
  } else {
    return true;
  }

  await plugin.saveSettings();
  return true;
}

// ==function== Nome da nova nota: o trecho selecionado (primeira linha, até 80 caracteres)
function nomeDaSelecao(selecao: string): string {
  return selecao.trim().split('\n')[0]?.trim().slice(0, 80) ?? '';
}

// ==function== Gera o texto inteiro (sem streaming), cria uma nota nova na mesma pasta
// e transforma a seleção da nota de origem em link para ela (fica ligada no grafo)
async function gerarEmNovaNota(params: ParametrosGeracao, selecaoOriginal: string): Promise<string> {
  const resultado = await params.servico.gerarTexto(params.promptFinal, criarOpcoesBase(params));
  const texto = await finalizarTexto(params, resultado.texto);
  if (!texto.trim()) {
    throw new Error(traduzir(params.plugin.settings.idioma, 'servico.semTexto', { motivo: 'empty' }));
  }
  const novoArquivo = await criarNovaNotaComConteudo(params.plugin, params.contexto, texto, params.contexto.tituloNota);
  linkarSelecaoNaOrigem(params, selecaoOriginal, novoArquivo);
  return texto;
}

// ==function== Troca a seleção da nota de origem por um link para a nota nova
// (segue a configuração de links do Obsidian; o texto selecionado continua visível como apelido)
function linkarSelecaoNaOrigem(params: ParametrosGeracao, selecaoOriginal: string, novoArquivo: TFile): void {
  const { editor, contexto, plugin, caminhoArquivo } = params;
  const { inicioSelecao, fimSelecao } = contexto;

  // Se o texto mudou durante a geração, não mexe na nota (evita trocar o trecho errado)
  if (editor.getRange(inicioSelecao, fimSelecao) !== selecaoOriginal) {
    return;
  }

  const textoLimpo = selecaoOriginal.trim();
  const apelido = textoLimpo === novoArquivo.basename ? undefined : textoLimpo;

  // Seleção de várias linhas: mantém o texto e acrescenta o link no fim
  if (textoLimpo.includes('\n')) {
    const link = plugin.app.fileManager.generateMarkdownLink(novoArquivo, caminhoArquivo);
    editor.replaceRange(` ${link}`, fimSelecao);
    return;
  }

  // Preserva espaços que estavam nas bordas da seleção
  const espacoAntes = selecaoOriginal.slice(0, selecaoOriginal.length - selecaoOriginal.trimStart().length);
  const espacoDepois = selecaoOriginal.slice(selecaoOriginal.trimEnd().length);
  const link = plugin.app.fileManager.generateMarkdownLink(novoArquivo, caminhoArquivo, undefined, apelido);
  editor.replaceRange(`${espacoAntes}${link}${espacoDepois}`, inicioSelecao, fimSelecao);
}

async function gerarTextoConformeModo(params: ParametrosGeracao): Promise<string | null> {
  const { plugin } = params;

  if (plugin.settings.usarPreviewAntesInserir) {
    return gerarComPreview(params);
  }

  if (plugin.settings.usarStreaming) {
    return gerarComStreaming(params);
  }

  const resultado = await params.servico.gerarTexto(params.promptFinal, criarOpcoesBase(params));
  const resposta = await finalizarTexto(params, resultado.texto);
  const registro = await inserirTextoNoEditorAnimado(params.editor, params.tipoInsercao, resposta, params.contexto, params.caminhoArquivo, 60, 4, 10);
  plugin.registrarGeracao(registro);
  return resposta;
}

function criarOpcoesBase(params: ParametrosGeracao): {
  signal: AbortSignal;
  onModeloAtivo: (modelo: ModeloGeminiDisponivel) => void;
  onTentativaFallback: (modelo: ModeloGeminiDisponivel) => void;
  onAviso: (mensagem: string) => void;
} {
  const { plugin, notice } = params;
  const idioma = plugin.settings.idioma;

  return {
    signal: params.signal,
    onModeloAtivo: (modelo) => {
      plugin.definirModeloGeracaoAtivo(modelo);
      if (plugin.settings.mostrarIndicadorModelo) {
        notice.setMessage(traduzir(idioma, 'notice.gerandoComModelo', { modelo: obterRotuloModelo(idioma, modelo) }));
      }
    },
    onTentativaFallback: (modelo) => {
      notice.setMessage(traduzir(idioma, 'notice.usandoFallback', { modelo: obterRotuloModelo(idioma, modelo) }));
    },
    onAviso: (mensagem) => {
      notice.setMessage(mensagem);
    }
  };
}

// ==function== Contexto cuja seleção é a nota inteira (usado para substituir o conteúdo ao gerar)
function contextoNotaInteira(editor: Editor, contexto: ContextoEditor): ContextoEditor {
  const documento = editor.getValue();
  const ultimaLinha = editor.lastLine();
  return {
    ...contexto,
    selecao: documento,
    inicioSelecao: { line: 0, ch: 0 },
    fimSelecao: { line: ultimaLinha, ch: editor.getLine(ultimaLinha).length }
  };
}

// ==function== Pós-processamento: remove título repetido e valida/corrige diagramas Mermaid
async function finalizarTexto(params: ParametrosGeracao, texto: string): Promise<string> {
  const { plugin, servico, notice, signal } = params;
  const idioma = plugin.settings.idioma;
  const semTitulo = plugin.settings.removeHeadlineEnabled ? removerTituloRepetido(texto, params.contexto.tituloNota) : texto;

  const gerarAuxiliar = async (prompt: string): Promise<string> => {
    const resultado = await servico.gerarTexto(prompt, { signal });
    return resultado.texto;
  };

  const relatorio = await revisarDiagramas(semTitulo, {
    corrigir: (codigo, erro) => gerarAuxiliar(montarPromptCorrecaoMermaid(codigo, erro, plugin.settings)),
    converter: (codigo) => gerarAuxiliar(montarPromptConversaoMermaid(codigo, plugin.settings)),
    deveParar: () => signal.aborted,
    aoAvisar: (etapa) => notice.setMessage(traduzir(idioma, `notice.diagrama.${etapa}`))
  });

  params.relatorios.push(relatorio);
  return `${params.prefixoResultado ?? ''}${relatorio.texto}`;
}

function montarAvisoDiagramas(plugin: GeminiAssistantR3Plugin, relatorios: RelatorioDiagramas[]): string {
  const idioma = plugin.settings.idioma;
  const ultimo = relatorios[relatorios.length - 1];
  if (!ultimo) {
    return '';
  }

  const partes: string[] = [];
  if (ultimo.corrigidos > 0) partes.push(traduzir(idioma, 'notice.diagrama.corrigidos', { quantidade: ultimo.corrigidos }));
  if (ultimo.convertidos > 0) partes.push(traduzir(idioma, 'notice.diagrama.convertidos', { quantidade: ultimo.convertidos }));
  if (ultimo.removidos > 0) partes.push(traduzir(idioma, 'notice.diagrama.removidos', { quantidade: ultimo.removidos }));
  return partes.join(' ');
}

async function gerarComPreview(params: ParametrosGeracao): Promise<string | null> {
  const { plugin, servico, contexto } = params;

  const gerar = async (modelo?: ModeloGeminiDisponivel): Promise<ResultadoGeracaoGemini> => {
    const resultado = await servico.gerarTexto(params.promptFinal, { ...criarOpcoesBase(params), forcarModelo: modelo });
    return { ...resultado, texto: await finalizarTexto(params, resultado.texto) };
  };

  const primeiroResultado = await gerar();
  params.notice.setMessage(traduzir(plugin.settings.idioma, 'notice.previewPronto'));

  const modal = new ModalPreviewGeracao(plugin, {
    resultadoInicial: primeiroResultado,
    tipoInsercaoPadrao: params.tipoInsercao,
    contexto,
    regenerar: gerar
  });
  const escolha = await modal.abrir();

  if (escolha.acao === 'cancel') {
    return null;
  }

  if (escolha.acao === 'new-note') {
    await criarNovaNotaComConteudo(plugin, contexto, escolha.texto);
    return escolha.texto;
  }

  const registro = await inserirTextoNoEditorAnimado(params.editor, escolha.acao, escolha.texto, contexto, params.caminhoArquivo, 60, 4, 10);
  plugin.registrarGeracao(registro);
  return escolha.texto;
}

async function gerarComStreaming(params: ParametrosGeracao): Promise<string> {
  const { plugin, editor, tipoInsercao, contexto, caminhoArquivo } = params;
  // O texto fixo (ex.: título da tradução) entra primeiro, e de novo se a geração recomeçar em outro modelo
  const prefixo = params.prefixoResultado ?? '';
  const iniciarSessao = (): SessaoInsercaoStreaming => {
    const novaSessao = criarSessaoInsercaoStreaming(editor, tipoInsercao, contexto, caminhoArquivo);
    if (prefixo) {
      novaSessao.adicionar(prefixo);
    }
    return novaSessao;
  };
  const temTextoGerado = (texto: string): boolean => Boolean(texto.slice(prefixo.length).trim());
  let sessao: SessaoInsercaoStreaming = iniciarSessao();

  let resultado: ResultadoGeracaoGemini;
  try {
    resultado = await params.servico.gerarTexto(params.promptFinal, {
      ...criarOpcoesBase(params),
      onDelta: (delta: string) => sessao.adicionar(delta),
      onReiniciar: () => {
        sessao.cancelar();
        sessao = iniciarSessao();
      }
    });
  } catch (error) {
    // ==section== Parada manual mantém o texto parcial (e permite desfazer); erro real limpa
    const registroParcial = sessao.finalizar();
    if (params.signal.aborted && temTextoGerado(registroParcial.textoInserido)) {
      plugin.registrarGeracao(registroParcial);
    } else {
      sessao.cancelar();
    }
    throw error;
  }

  const registroStreaming = sessao.finalizar();

  if (!temTextoGerado(registroStreaming.textoInserido)) {
    sessao.cancelar();
    throw new Error(traduzir(plugin.settings.idioma, 'servico.semTexto', { motivo: 'stream-empty' }));
  }

  // ==section== O texto já está na nota: se o pós-processamento mudar algo, troca só o trecho inserido
  const textoFinal = await finalizarTexto(params, resultado.texto);
  if (textoFinal === registroStreaming.textoInserido) {
    plugin.registrarGeracao(registroStreaming);
    return textoFinal;
  }

  const registroAtualizado = substituirTextoInserido(editor, registroStreaming, textoFinal);
  if (!registroAtualizado) {
    mostrarNoticeTemporario(traduzir(plugin.settings.idioma, 'notice.diagrama.naoAplicado'));
    plugin.registrarGeracao(registroStreaming);
    return resultado.texto;
  }

  plugin.registrarGeracao(registroAtualizado);
  return textoFinal;
}
