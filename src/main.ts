import { MarkdownView, Plugin, type Editor } from 'obsidian';

import { criarComandosDoEditor, ehAcaoDoAtalho, executarComando, obterDefinicaoComando, DEFINICOES_COMANDOS, type DefinicaoComando } from './comandos/editor-commands';
import {
  AbaConfiguracoesGemini,
  aplicarPromptsDoIdiomaNaConfiguracao,
  CONFIGURACOES_PADRAO,
  IDIOMAS_DISPONIVEIS,
  MODELOS_GEMINI_DISPONIVEIS,
  obterIdiomaPadraoDoSistema,
  VERSAO_LISTA_MODELOS
} from './settings';
import { mesclarFaixas } from './settings/migracao';
import { migrarParaConfigV3, migrarParaPromptsV2 } from './settings/migracao';
import type { IdSecaoAcao } from './settings/secoes/acoes';
import { executarTesteVelocidade } from './servicos/teste-velocidade';
import type { RegistroRefazer } from './utils/editor';
import { mostrarNoticeTemporario } from './utils/notice';
import { traduzir } from './i18n';
import type { ConfiguracoesPlugin, IdGrupoMenu, IdiomaSaida, ModeloGeminiDisponivel, RegistroUltimaGeracao } from './tipos/configuracoes';
import { GerenciadorBotaoFlutuante } from './ui/botao-flutuante';
import { preencherMenuContexto } from './ui/menu-contexto';
import { ModalPaletaAcoes } from './ui/paleta-acoes';
import { ModalTutorial } from './ui/modal-tutorial';
import { converterEventoEmAtalho, normalizarTextoAtalho, validarAtalho } from './utils/atalhos';
import { ehOpcaoValida } from './utils/validacao';

// ==types== API interna (não documentada) para abrir as configurações; usada com verificação
interface AppComConfiguracoes {
  setting?: {
    open?: () => void;
    openTabById?: (id: string) => unknown;
  };
}

// ==style== Limite do histórico de gerações (desfazer múltiplo)
const LIMITE_HISTORICO_GERACOES = 20;

// ==style== A cada quantas gerações concluídas o teste de velocidade roda em segundo plano
const INTERVALO_TESTE_AUTOMATICO = 5;

// ==class== Plugin principal: ciclo de vida, estado de geração e histórico
export default class GeminiAssistantR3Plugin extends Plugin {
  settings!: ConfiguracoesPlugin;
  private gerenciadorBotaoFlutuante: GerenciadorBotaoFlutuante | null = null;
  private historicoGeracoes: RegistroUltimaGeracao[] = [];
  private historicoRefazer: RegistroRefazer[] = [];
  private testeAutomaticoEmAndamento = false;
  private ultimaAcaoExecutadaId: string | null = null;
  private geracaoAbortController: AbortController | null = null;
  private modeloGeracaoAtivo: ModeloGeminiDisponivel | null = null;
  private idsComandosRegistrados: string[] = [];
  private abaConfiguracoes: AbaConfiguracoesGemini | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registrarComandos();
    this.abaConfiguracoes = new AbaConfiguracoesGemini(this.app, this);
    this.addSettingTab(this.abaConfiguracoes);

    this.gerenciadorBotaoFlutuante = new GerenciadorBotaoFlutuante(this);
    this.gerenciadorBotaoFlutuante.iniciar();

    // ==section== Atalhos por prompt (somente com foco no editor da nota)
    this.registerDomEvent(activeDocument, 'keydown', (evento: KeyboardEvent) => {
      void this.handleAtalhoGlobal(evento);
    });

    // ==section== Menu de contexto do editor
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        preencherMenuContexto(this, menu, editor);
      })
    );
  }

  onunload(): void {
    this.abortarGeracaoAtual(false);
    this.gerenciadorBotaoFlutuante?.destruir();
    this.gerenciadorBotaoFlutuante = null;
  }

  // ==function== Carrega e migra as configurações salvas
  async loadSettings(): Promise<void> {
    const dadosSalvos = (await this.loadData()) as Partial<ConfiguracoesPlugin> | null;
    const idiomaMigrado = this.normalizarIdioma(dadosSalvos?.idioma);

    this.settings = {
      ...CONFIGURACOES_PADRAO,
      ...dadosSalvos,
      idioma: idiomaMigrado,
      acoesFavoritas: (dadosSalvos?.acoesFavoritas ?? []).filter((id) => obterDefinicaoComando(id) !== null),
      faixasPalavras: mesclarFaixas(dadosSalvos?.faixasPalavras),
      resultadosVelocidade: Array.isArray(dadosSalvos?.resultadosVelocidade) ? dadosSalvos.resultadosVelocidade : [],
      presetsPromptsPorIdioma: {
        ...CONFIGURACOES_PADRAO.presetsPromptsPorIdioma,
        ...(dadosSalvos?.presetsPromptsPorIdioma ?? {})
      },
      atalhosPrompts: {
        ...CONFIGURACOES_PADRAO.atalhosPrompts,
        ...(dadosSalvos?.atalhosPrompts ?? {})
      }
    };

    if (!dadosSalvos?.idioma) {
      this.settings = aplicarPromptsDoIdiomaNaConfiguracao(this.settings, idiomaMigrado);
    }

    // ==section== v4.6: intenção + nível; prompts editados pelo usuário são preservados
    const migracaoPrompts = migrarParaPromptsV2(this.settings, dadosSalvos);
    this.settings = migracaoPrompts.configuracoes;

    const migrouConfig = migrarParaConfigV3(this.settings, dadosSalvos);
    this.settings = migrouConfig.configuracoes;

    const migrouModelos = this.migrarModelos(dadosSalvos) || migrouConfig.migrou;
    if (migracaoPrompts.migrou || migrouModelos) {
      await this.saveSettings();
    }

    if (migracaoPrompts.migrou) {
      const chaveAviso = migracaoPrompts.promptsPreservados.length > 0 ? 'notice.migracaoPromptsPreservados' : 'notice.migracaoPrompts';
      mostrarNoticeTemporario(traduzir(this.settings.idioma, chaveAviso, { quantidade: migracaoPrompts.promptsPreservados.length }), 8000);
    }
  }

  // ==function== Remove o fallback fixo antigo e começa pelo melhor modelo quando a lista muda
  private migrarModelos(dadosSalvos: Partial<ConfiguracoesPlugin> | null): boolean {
    const configuracoesComLegado = this.settings as ConfiguracoesPlugin & { modeloFallback?: string };
    const possuiLegado = 'modeloFallback' in configuracoesComLegado;
    delete configuracoesComLegado.modeloFallback;

    const listaMudou = Boolean(dadosSalvos) && dadosSalvos?.versaoModelos !== VERSAO_LISTA_MODELOS;
    const modeloInvalido = !ehOpcaoValida(MODELOS_GEMINI_DISPONIVEIS, this.settings.modeloPrincipal);

    if (listaMudou || modeloInvalido) {
      this.settings.modeloPrincipal = CONFIGURACOES_PADRAO.modeloPrincipal;
      this.settings.usarModeloMaisRapido = CONFIGURACOES_PADRAO.usarModeloMaisRapido;
      this.settings.ordemModelos = [];
      this.settings.versaoModelos = VERSAO_LISTA_MODELOS;
      return true;
    }

    return possuiLegado;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // ==function== Reaplica idioma: recria comandos (API pública) e o menu
  atualizarIdiomaGlobal(): void {
    this.registrarComandos();
    this.gerenciadorBotaoFlutuante?.recarregar();
  }

  recarregarBotaoFlutuante(): void {
    this.gerenciadorBotaoFlutuante?.recarregar();
  }

  // ==function== Abre a aba do plugin nas configurações, rolando até a ação (ícone de engrenagem do menu)
  // ==function== Abre a aba do plugin e rola até uma ação ou até a seção de modelos
  abrirConfiguracoes(secao: IdSecaoAcao | null = null, alvo: 'modelos' | 'acoes' | null = null): void {
    const appComConfiguracoes = this.app as typeof this.app & AppComConfiguracoes;
    const painel = appComConfiguracoes.setting;

    if (!painel || typeof painel.open !== 'function' || typeof painel.openTabById !== 'function') {
      mostrarNoticeTemporario(traduzir(this.settings.idioma, 'notice.abrirConfiguracoesManual'), 5000);
      return;
    }

    if (alvo === 'modelos') {
      this.abaConfiguracoes?.definirRolagemModelos();
    } else if (alvo === 'acoes') {
      this.abaConfiguracoes?.definirRolagemAcoes();
    } else {
      this.abaConfiguracoes?.definirSecaoParaRolar(secao);
    }
    painel.open();
    painel.openTabById(this.manifest.id);
  }

  abrirTutorial(): void {
    new ModalTutorial(this).open();
  }

  abrirPaletaAcoes(editor: Editor): void {
    new ModalPaletaAcoes(this, editor).open();
  }

  // ==section== Favoritos e grupo do menu
  ehFavorito(id: string): boolean {
    return this.settings.acoesFavoritas.includes(id);
  }

  async alternarFavorito(id: string): Promise<void> {
    const favoritos = this.settings.acoesFavoritas;
    this.settings.acoesFavoritas = favoritos.includes(id) ? favoritos.filter((item) => item !== id) : [...favoritos, id];
    await this.saveSettings();
  }

  async definirUltimoGrupoMenu(id: IdGrupoMenu | null): Promise<void> {
    if (this.settings.ultimoGrupoMenu === id) {
      return;
    }
    this.settings.ultimoGrupoMenu = id;
    await this.saveSettings();
  }

  // ==section== Histórico de gerações (pilha global, filtrada por nota)
  // Uma geração nova invalida o que estava desfeito (como em editores de texto)
  registrarGeracao(registro: RegistroUltimaGeracao): void {
    this.historicoRefazer = [];
    this.restaurarGeracao(registro);
  }

  // Põe de volta no histórico de desfazer (usado também ao refazer)
  restaurarGeracao(registro: RegistroUltimaGeracao): void {
    this.historicoGeracoes.push(registro);
    if (this.historicoGeracoes.length > LIMITE_HISTORICO_GERACOES) {
      this.historicoGeracoes.shift();
    }
    this.gerenciadorBotaoFlutuante?.atualizarEstadoDesfazer();
  }

  // ==section== Refazer: pilha das gerações desfeitas (por nota)
  registrarRefazer(item: RegistroRefazer): void {
    this.historicoRefazer.push(item);
    if (this.historicoRefazer.length > LIMITE_HISTORICO_GERACOES) {
      this.historicoRefazer.shift();
    }
    this.gerenciadorBotaoFlutuante?.atualizarEstadoDesfazer();
  }

  obterRefazerDaNota(caminhoArquivo: string): RegistroRefazer | null {
    for (let indice = this.historicoRefazer.length - 1; indice >= 0; indice -= 1) {
      const item = this.historicoRefazer[indice];
      if (item?.registro.caminhoArquivo === caminhoArquivo) {
        return item;
      }
    }
    return null;
  }

  removerRefazer(item: RegistroRefazer): void {
    this.historicoRefazer = this.historicoRefazer.filter((registro) => registro !== item);
    this.gerenciadorBotaoFlutuante?.atualizarEstadoDesfazer();
  }

  contarRefazerDaNotaAtiva(): number {
    const arquivo = this.app.workspace.getActiveFile();
    return arquivo ? this.historicoRefazer.filter((item) => item.registro.caminhoArquivo === arquivo.path).length : 0;
  }

  // ==section== Teste automático de velocidade: a cada N gerações concluídas, roda em segundo plano
  // e torna o modelo mais rápido o principal. Não bloqueia a geração nem mostra aviso.
  registrarGeracaoConcluida(): void {
    this.settings.geracoesDesdeTeste += 1;
    const deveTestar = this.settings.geracoesDesdeTeste >= INTERVALO_TESTE_AUTOMATICO;
    if (deveTestar) {
      this.settings.geracoesDesdeTeste = 0;
    }
    void this.saveSettings();

    if (deveTestar) {
      void this.executarTesteAutomatico();
    }
  }

  private async executarTesteAutomatico(): Promise<void> {
    if (this.testeAutomaticoEmAndamento || !this.settings.apiKey.trim()) {
      return;
    }

    this.testeAutomaticoEmAndamento = true;
    try {
      await executarTesteVelocidade(this);
      this.settings.usarModeloMaisRapido = true;
      await this.saveSettings();
    } catch {
      // Falha em segundo plano é silenciosa: o modelo atual continua sendo usado
    } finally {
      this.testeAutomaticoEmAndamento = false;
    }
  }

  obterUltimaGeracaoDaNota(caminhoArquivo: string): RegistroUltimaGeracao | null {
    for (let indice = this.historicoGeracoes.length - 1; indice >= 0; indice -= 1) {
      const registro = this.historicoGeracoes[indice];
      if (registro?.caminhoArquivo === caminhoArquivo) {
        return registro;
      }
    }
    return null;
  }

  removerGeracaoDoHistorico(registro: RegistroUltimaGeracao): void {
    this.historicoGeracoes = this.historicoGeracoes.filter((item) => item !== registro);
    this.gerenciadorBotaoFlutuante?.atualizarEstadoDesfazer();
  }

  contarGeracoesDaNota(caminhoArquivo: string): number {
    return this.historicoGeracoes.filter((registro) => registro.caminhoArquivo === caminhoArquivo).length;
  }

  contarGeracoesDaNotaAtiva(): number {
    const arquivo = this.app.workspace.getActiveFile();
    return arquivo ? this.contarGeracoesDaNota(arquivo.path) : 0;
  }

  possuiHistoricoGeracoes(): boolean {
    return this.historicoGeracoes.length > 0;
  }

  // ==section== Última ação
  definirUltimaAcaoExecutada(id: string): void {
    this.ultimaAcaoExecutadaId = id;
  }

  obterUltimaAcaoExecutada(): DefinicaoComando | null {
    return this.ultimaAcaoExecutadaId ? obterDefinicaoComando(this.ultimaAcaoExecutadaId) : null;
  }

  // ==section== Ciclo da geração ativa
  iniciarGeracaoAtual(): AbortController {
    this.abortarGeracaoAtual(false);
    const controller = new AbortController();
    this.geracaoAbortController = controller;
    this.gerenciadorBotaoFlutuante?.definirCarregandoExterno(true);
    return controller;
  }

  abortarGeracaoAtual(notificar = true): boolean {
    const controller = this.geracaoAbortController;
    if (!controller) {
      return false;
    }

    controller.abort();
    this.geracaoAbortController = null;
    this.definirModeloGeracaoAtivo(null);

    if (notificar) {
      this.gerenciadorBotaoFlutuante?.informarGeracaoAbortada();
    }

    return true;
  }

  finalizarGeracaoAtual(): void {
    this.geracaoAbortController = null;
    this.definirModeloGeracaoAtivo(null);
    this.gerenciadorBotaoFlutuante?.definirCarregandoExterno(false);
  }

  existeGeracaoAtiva(): boolean {
    return Boolean(this.geracaoAbortController) && !this.geracaoAbortController?.signal.aborted;
  }

  definirModeloGeracaoAtivo(modelo: ModeloGeminiDisponivel | null): void {
    this.modeloGeracaoAtivo = modelo;
  }

  obterModeloGeracaoAtivo(): ModeloGeminiDisponivel | null {
    return this.modeloGeracaoAtivo;
  }

  // ==function== (Re)registra todos os comandos com nomes no idioma atual
  private registrarComandos(): void {
    for (const id of this.idsComandosRegistrados) {
      this.removeCommand(id);
    }

    const comandos = criarComandosDoEditor(this);
    for (const comando of comandos) {
      this.addCommand(comando);
    }

    this.idsComandosRegistrados = comandos.map((comando) => comando.id);
  }

  // ==function== Executa o prompt cujo atalho bate com a tecla, se o foco estiver no editor
  private async handleAtalhoGlobal(evento: KeyboardEvent): Promise<void> {
    if (evento.defaultPrevented || evento.isComposing || evento.repeat) {
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const alvo = evento.target;
    const focoNoEditor = Boolean(view) && view?.getMode() === 'source' && alvo instanceof HTMLElement && Boolean(alvo.closest('.cm-editor')) && view.containerEl.contains(alvo);
    if (!view || !focoNoEditor) {
      return;
    }

    const combinacao = converterEventoEmAtalho(evento);
    if (!combinacao) {
      return;
    }

    const definicao = DEFINICOES_COMANDOS.find((item) => {
      if (!ehAcaoDoAtalho(item)) {
        return false;
      }
      const atalho = this.settings.atalhosPrompts[item.chavePrompt] ?? '';
      return validarAtalho(atalho) && normalizarTextoAtalho(atalho) === combinacao;
    });
    if (!definicao) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();
    await executarComando(this, view.editor, definicao);
  }

  private normalizarIdioma(idioma: string | undefined): IdiomaSaida {
    const idiomaValido = IDIOMAS_DISPONIVEIS.find((disponivel) => disponivel === idioma);
    if (idiomaValido) {
      return idiomaValido;
    }
    return obterIdiomaPadraoDoSistema();
  }
}
