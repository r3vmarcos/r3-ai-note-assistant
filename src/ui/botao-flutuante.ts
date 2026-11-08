import { MarkdownView, setIcon } from 'obsidian';

import type GeminiAssistantR3Plugin from '../main';
import {
  DEFINICOES_COMANDOS,
  executarComando,
  executarDesfazer,
  executarRefazer,
  ehAcaoDoAtalho,
  exigeSelecao,
  ID_CORRIGIR_GRAMATICA,
  ID_PROMPT_PERSONALIZADO,
  obterDefinicaoComando,
  type DefinicaoComando
} from '../comandos/editor-commands';
import { obterNomeComando, obterRotuloCurtoComando, obterRotuloModelo, traduzir } from '../i18n';
import type { IdGrupoMenu, IntencaoComFaixa } from '../tipos/configuracoes';
import { NIVEIS_RESPOSTA } from '../settings/padroes';
import { ModalSobre } from './bloco-sobre';
import { estimarPalavrasNivel, type GrupoComAlvoPorSelecao, ORDEM_NIVEIS_RESUMIR, selecaoAtingeMinimoResumo } from '../utils/resumo';
import type { IdSecaoAcao } from '../settings/secoes/acoes';
import { GRUPOS_MENU, type GrupoMenuConfig } from './menu-grupos';

// ==types== Referências de cada seção renderizada (grupo ou favoritos)
interface SecaoRenderizada {
  id: IdGrupoMenu | 'favoritos';
  wrapperEl: HTMLDivElement;
  cabecalhoEl: HTMLButtonElement | null;
  itens: ItemRenderizado[];
}

// ==types== Referências de cada ação renderizada
interface ItemRenderizado {
  definicao: DefinicaoComando;
  linhaEl: HTMLDivElement;
  botaoEl: HTMLButtonElement;
  textoBusca: string;
  /** Estimativa de palavras do resumo (só nos níveis do Resumir) */
  estimativaEl: HTMLSpanElement | null;
}

// ==data== Ações do grupo Outros: aba das configurações e chave da dica de cada uma
const FERRAMENTAS_OUTROS: Record<string, { secao: IdSecaoAcao; dica: string }> = {
  [ID_CORRIGIR_GRAMATICA]: { secao: 'corrigir', dica: 'dica.corrigir' },
  'traduzir-selecao': { secao: 'traduzir', dica: 'dica.acao.traduzir-selecao' },
  'converter-tabela': { secao: 'tabela', dica: 'dica.acao.converter-tabela' },
  'criar-diagrama': { secao: 'diagrama', dica: 'dica.acao.criar-diagrama' },
  'perguntas-revisao': { secao: 'perguntas', dica: 'dica.acao.perguntas-revisao' },
  'sugerir-titulo-tags': { secao: 'tituloTags', dica: 'dica.acao.sugerir-titulo-tags' },
  'mudar-tom': { secao: 'tom', dica: 'dica.acao.mudar-tom' }
};

// ==function== Seção das configurações correspondente a uma ação
function obterSecaoDaAcao(definicao: DefinicaoComando): IdSecaoAcao {
  const ferramenta = FERRAMENTAS_OUTROS[definicao.id];
  if (ferramenta) return ferramenta.secao;
  if (definicao.id === ID_PROMPT_PERSONALIZADO) return 'personalizado';
  return definicao.grupo === 'outros' ? 'personalizado' : definicao.grupo;
}

// ==style== Prefixo de classes do componente
const CLS = 'gemini-assistant-r3-flutuante';

// ==style== Modo Mover: distância mínima das bordas da janela e menor altura do menu
const MARGEM_MENU = 8;
// Quanto o menu começa acima do botão IA na posição padrão
const DESLOCAMENTO_MENU_ACIMA = 50;
const ALTURA_MINIMA_MENU = 200;

// ==data== Grupos cujos níveis têm faixa de palavras configurável
const GRUPOS_COM_FAIXA: IntencaoComFaixa[] = ['gerar', 'explicar', 'expandir', 'responder'];

// ==function== Indica se o grupo tem faixas de palavras (para ler settings.faixasPalavras sem casts inseguros)
function ehGrupoComFaixa(idGrupo: IdGrupoMenu): idGrupo is IntencaoComFaixa {
  return (GRUPOS_COM_FAIXA as IdGrupoMenu[]).includes(idGrupo);
}

// ==data== Chave de texto explicativo de cada grupo (mesmos textos da aba de configurações)
const CHAVE_DESCRICAO_GRUPO: Record<IdGrupoMenu, string> = {
  gerar: 'config.acao.gerar.descricao',
  resumir: 'config.acao.resumir.descricao',
  explicar: 'config.acao.explicar.descricao',
  expandir: 'config.acao.expandir.descricao',
  reescrever: 'config.acao.reescrever.descricao',
  responder: 'config.acao.responder.descricao',
  outros: 'config.acao.personalizado.descricao'
};

// ==class== Gerenciador do botão flutuante e do menu da IA
export class GerenciadorBotaoFlutuante {
  private readonly plugin: GeminiAssistantR3Plugin;
  private containerPai: HTMLElement | null = null;
  private raizEl: HTMLDivElement | null = null;
  // Camada no <body> que contém o menu (fica acima de todo o Obsidian)
  private portalEl: HTMLDivElement | null = null;
  private menuEl: HTMLDivElement | null = null;
  private botaoEl: HTMLButtonElement | null = null;
  private botaoPararEl: HTMLButtonElement | null = null;
  private botaoFixarEl: HTMLButtonElement | null = null;
  // Salva o tamanho quando o menu é redimensionado pelo canto
  private observadorTamanho: ResizeObserver | null = null;
  private timerSalvarTamanho: number | null = null;
  private botaoDesfazerEl: HTMLButtonElement | null = null;
  private botaoRefazerEl: HTMLButtonElement | null = null;
  private buscaEl: HTMLInputElement | null = null;
  private infoSelecaoEl: HTMLDivElement | null = null;
  private ultimaAcaoEl: HTMLButtonElement | null = null;
  private ultimaLinhaEl: HTMLDivElement | null = null;
  private pedidoEl: HTMLTextAreaElement | null = null;
  private vazioEl: HTMLDivElement | null = null;
  private secoes: SecaoRenderizada[] = [];
  private idGrupoAberto: IdGrupoMenu | null = null;
  private estaAberto = false;
  private estaExecutando = false;
  // Seleção capturada ao abrir o menu (o clique no menu e o campo de busca tiram o foco do editor)
  private selecaoAoAbrir: { from: { line: number; ch: number }; to: { line: number; ch: number }; texto: string } | null = null;

  constructor(plugin: GeminiAssistantR3Plugin) {
    this.plugin = plugin;
  }

  // ==function== Registra eventos do workspace e do documento
  iniciar(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', () => this.atualizar()));
    this.plugin.registerEvent(this.plugin.app.workspace.on('layout-change', () => this.atualizar()));
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', () => {
        this.atualizar();
        this.atualizarEstadoDesfazer();
      })
    );

    // Com o menu aberto, a estimativa do Resumir acompanha a seleção
    this.plugin.registerDomEvent(activeDocument, 'selectionchange', () => {
      if (this.estaAberto) {
        this.atualizarEstadoSelecao();
      }
    });

    this.plugin.registerDomEvent(activeDocument, 'keydown', (evento) => {
      if (evento.key === 'Escape' && this.estaAberto) {
        this.definirMenuAberto(false);
        this.botaoEl?.focus();
      }
    });

    this.atualizar();
  }

  destruir(): void {
    this.remover();
  }

  recarregar(): void {
    this.remover();
    this.atualizar();
  }

  informarGeracaoAbortada(): void {
    this.definirCarregando(false);
  }

  // ==function== Reflete gerações iniciadas fora do menu (atalho, paleta, clique direito)
  definirCarregandoExterno(valor: boolean): void {
    this.definirCarregando(valor);
  }

  // ==function== Badge com a quantidade de gerações desfazíveis na nota ativa
  atualizarEstadoDesfazer(): void {
    const idioma = this.plugin.settings.idioma;

    if (this.botaoRefazerEl) {
      const quantidadeRefazer = this.plugin.contarRefazerDaNotaAtiva();
      this.botaoRefazerEl.toggleClass(`${CLS}__botao-secundario--inativo`, quantidadeRefazer === 0);
      this.botaoRefazerEl.setAttribute('aria-label', traduzir(idioma, 'menu.item.refazer'));
    }

    if (!this.botaoDesfazerEl) {
      return;
    }

    const quantidade = this.plugin.contarGeracoesDaNotaAtiva();
    this.botaoDesfazerEl.toggleClass(`${CLS}__botao-secundario--inativo`, quantidade === 0);
    this.botaoDesfazerEl.setAttribute('data-quantidade', quantidade > 0 ? String(quantidade) : '');
    this.botaoDesfazerEl.setAttribute('aria-label', traduzir(idioma, 'menu.item.desfazerQuantidade', { quantidade }));
  }

  // ==function== Monta ou remove a interface conforme a view ativa
  atualizar(): void {
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);

    if (!view || view.getMode() !== 'source') {
      this.remover();
      return;
    }

    const novoContainerPai = this.obterContainerPai(view);
    if (this.containerPai === novoContainerPai && this.raizEl?.isConnected) {
      return;
    }

    this.remover();
    this.criarInterface(novoContainerPai);
  }

  private obterContainerPai(view: MarkdownView): HTMLElement {
    return (
      view.containerEl.querySelector<HTMLElement>('.markdown-source-view.mod-cm6') ??
      view.containerEl.querySelector<HTMLElement>('.markdown-source-view') ??
      view.containerEl.querySelector<HTMLElement>('.view-content') ??
      view.containerEl
    );
  }

  private obterEditor(): MarkdownView['editor'] | null {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
  }

  // ==section== Criação da interface completa
  private criarInterface(containerPai: HTMLElement): void {
    this.containerPai = containerPai;
    const { posicaoBotaoFlutuante, tamanhoBotaoFlutuante } = this.plugin.settings;

    if (window.getComputedStyle(containerPai).position === 'static') {
      containerPai.addClass('gemini-assistant-r3-parent-relativo');
    }

    this.raizEl = containerPai.createDiv({
      cls: `${CLS} ${CLS}--${posicaoBotaoFlutuante} ${CLS}--${tamanhoBotaoFlutuante}`,
      attr: { 'data-dev': 'gemini-flutuante' }
    });

    // ==section== O menu fica numa camada própria no <body>: passa por cima da lista de notas e das barras laterais
    this.portalEl = activeDocument.body.createDiv({
      cls: `${CLS} ${CLS}--portal ${CLS}--${posicaoBotaoFlutuante}`,
      attr: { 'data-dev': 'gemini-menu-camada' }
    });

    // ==section== Clicar no botão ou no menu não tira o foco nem a seleção da nota (campos de texto continuam funcionando)
    const manterSelecao = (evento: MouseEvent): void => {
      if (!(evento.target instanceof HTMLInputElement || evento.target instanceof HTMLTextAreaElement)) {
        evento.preventDefault();
      }
    };
    this.raizEl.addEventListener('mousedown', manterSelecao);
    this.portalEl.addEventListener('mousedown', manterSelecao);

    const barraEl = this.raizEl.createDiv({ cls: `${CLS}__barra` });
    this.criarBotaoPrincipal(barraEl);
    this.criarBotoesSecundarios(barraEl);
    this.criarMenu();

    if (this.plugin.existeGeracaoAtiva()) {
      this.definirCarregando(true);
    }
  }

  // ==button== Botão principal (abre/fecha o menu)
  private criarBotaoPrincipal(container: HTMLElement): void {
    this.botaoEl = container.createEl('button', {
      cls: `${CLS}__botao`,
      attr: { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-dev': 'gemini-botao-principal' }
    });
    this.renderizarEstadoPadraoDoBotao();

    this.botaoEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();

      // Confere o estado real (geração em andamento e menu visível) em vez de confiar só nas variáveis,
      // que podem ficar desatualizadas quando a interface é recriada (ex.: depois de salvar as configurações)
      const gerando = this.plugin.existeGeracaoAtiva();
      if (this.estaExecutando !== gerando) {
        this.definirCarregando(gerando);
      }
      if (gerando) {
        return;
      }

      const menuVisivel = Boolean(this.menuEl?.isConnected && this.menuEl.hasClass(`${CLS}__menu--aberto`));
      if (menuVisivel) {
        this.definirMenuAberto(false);
        return;
      }

      // Ao abrir, remonta a interface antes (o mesmo que acontece ao sair e voltar para a nota):
      // nenhum estado antigo deixado por mudanças nas configurações impede o menu de aparecer
      this.recarregar();
      this.definirMenuAberto(true);
    });
  }

  // ==button== Botões secundários (parar e desfazer)
  private criarBotoesSecundarios(container: HTMLElement): void {
    const idioma = this.plugin.settings.idioma;

    this.botaoPararEl = this.criarBotaoIcone(container, 'square', traduzir(idioma, 'menu.item.parar'), `${CLS}__botao-secundario--perigo ${CLS}__oculto`);
    this.botaoPararEl.setAttribute('data-dev', 'gemini-botao-parar');
    this.botaoPararEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      this.plugin.abortarGeracaoAtual();
    });

  }

  // ==button== Desfazer e refazer da última geração (ficam no menu, ao lado de "Repetir última ação")
  private criarBotoesDesfazerRefazer(container: HTMLElement): void {
    const idioma = this.plugin.settings.idioma;

    this.botaoDesfazerEl = this.criarBotaoIcone(container, 'undo-2', traduzir(idioma, 'menu.item.desfazer'), `${CLS}__botao-desfazer`);
    this.botaoDesfazerEl.setAttribute('data-dev', 'gemini-botao-desfazer');
    this.botaoDesfazerEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      const editor = this.obterEditor();
      if (editor) {
        executarDesfazer(this.plugin, editor);
      }
    });

    this.botaoRefazerEl = this.criarBotaoIcone(container, 'redo-2', traduzir(idioma, 'menu.item.refazer'), `${CLS}__botao-refazer`);
    this.botaoRefazerEl.setAttribute('data-dev', 'gemini-botao-refazer');
    this.botaoRefazerEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      const editor = this.obterEditor();
      if (editor) {
        executarRefazer(this.plugin, editor);
      }
    });

    this.atualizarEstadoDesfazer();
  }

  private criarBotaoIcone(container: HTMLElement, icone: string, rotulo: string, clsExtra = ''): HTMLButtonElement {
    const botao = container.createEl('button', {
      cls: `${CLS}__botao-secundario ${clsExtra}`.trim(),
      attr: { type: 'button', 'aria-label': rotulo }
    });
    setIcon(botao, icone);
    return botao;
  }

  // ==section== Painel do menu (recriado ao alternar favoritos)
  private criarMenu(): void {
    if (!this.portalEl) {
      return;
    }

    // O menu é recriado (ex.: ao favoritar): o observador de tamanho passa para o menu novo
    this.observadorTamanho?.disconnect();
    this.observadorTamanho = null;

    const idioma = this.plugin.settings.idioma;
    this.menuEl = this.portalEl.createDiv({
      cls: `${CLS}__menu ${CLS}__menu--fechado`,
      attr: { role: 'menu', 'data-dev': 'gemini-menu' }
    });
    this.menuEl.addEventListener('keydown', (evento) => this.handleTecladoMenu(evento));
    this.observarTamanhoMenu();

    this.criarCabecalho(this.menuEl);

    // ==section== Busca de ações
    const buscaWrapperEl = this.menuEl.createDiv({ cls: `${CLS}__busca`, attr: { 'data-dev': 'gemini-menu-busca' } });
    const iconeBuscaEl = buscaWrapperEl.createSpan({ cls: `${CLS}__busca-icone` });
    setIcon(iconeBuscaEl, 'search');
    this.buscaEl = buscaWrapperEl.createEl('input', {
      cls: `${CLS}__busca-input`,
      attr: { type: 'text', placeholder: traduzir(idioma, 'menu.busca.placeholder'), spellcheck: 'false' }
    });
    this.buscaEl.addEventListener('input', () => this.handleBusca());

    // ==section== Status da seleção
    this.infoSelecaoEl = this.menuEl.createDiv({ cls: `${CLS}__selecao`, attr: { 'data-dev': 'gemini-menu-selecao' } });

    // ==section== Lista rolável: última ação, favoritos e grupos
    const listaEl = this.menuEl.createDiv({ cls: `${CLS}__lista`, attr: { 'data-dev': 'gemini-menu-lista' } });

    // Linha: "Repetir última ação" à esquerda e Desfazer/Refazer à direita
    this.ultimaLinhaEl = listaEl.createDiv({ cls: `${CLS}__ultima-linha` });
    this.ultimaAcaoEl = this.ultimaLinhaEl.createEl('button', {
      cls: `${CLS}__ultima`,
      attr: { type: 'button', role: 'menuitem', 'data-dev': 'gemini-menu-ultima-acao' }
    });
    this.ultimaAcaoEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      const ultimaAcao = this.plugin.obterUltimaAcaoExecutada();
      if (ultimaAcao) {
        void this.executarAcao(ultimaAcao);
      }
    });
    this.criarBotoesDesfazerRefazer(this.ultimaLinhaEl);

    this.secoes = [];
    const secaoFavoritos = this.renderizarFavoritos(listaEl);
    if (secaoFavoritos) {
      this.secoes.push(secaoFavoritos);
    }
    for (const config of GRUPOS_MENU) {
      this.secoes.push(this.renderizarGrupo(listaEl, config));
    }

    this.vazioEl = listaEl.createDiv({ cls: `${CLS}__vazio ${CLS}__oculto`, text: traduzir(idioma, 'menu.busca.vazio') });

    this.criarCampoPedido(this.menuEl);
    this.criarRodape(this.menuEl);
  }

  // ==section== Rodapé: dica de teclado e botão "Sobre o projeto"
  private criarRodape(menuEl: HTMLElement): void {
    const idioma = this.plugin.settings.idioma;
    const rodapeEl = menuEl.createDiv({ cls: `${CLS}__rodape-acoes` });
    rodapeEl.createDiv({ cls: `${CLS}__rodape`, text: traduzir(idioma, 'menu.dica.teclado') });

    const botaoSobre = rodapeEl.createEl('button', { cls: `${CLS}__botao-sobre`, attr: { type: 'button', 'data-dev': 'gemini-botao-sobre' } });
    setIcon(botaoSobre.createSpan({ cls: `${CLS}__botao-sobre-icone` }), 'heart-handshake');
    botaoSobre.createSpan({ text: traduzir(idioma, 'menu.botao.sobre') });
    botaoSobre.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      this.definirMenuAberto(false);
      new ModalSobre(this.plugin).open();
    });
  }

  // ==section== Cabeçalho: título, modelo e fechar
  private criarCabecalho(menuEl: HTMLElement): void {
    const idioma = this.plugin.settings.idioma;
    const cabecalhoEl = menuEl.createDiv({ cls: `${CLS}__cabecalho`, attr: { 'data-dev': 'gemini-menu-cabecalho' } });
    const tituloEl = cabecalhoEl.createDiv({ cls: `${CLS}__titulo` });
    const iconeTituloEl = tituloEl.createSpan({ cls: `${CLS}__titulo-icone` });
    setIcon(iconeTituloEl, 'sparkles');
    tituloEl.createSpan({ text: traduzir(idioma, 'menu.titulo') });

    // ==section== O título (ícone + nome) é sempre a alça para mover o menu; duplo clique volta ao padrão
    tituloEl.setAttribute('title', traduzir(idioma, 'menu.titulo.dica'));
    tituloEl.addEventListener('pointerdown', (evento) => this.iniciarArraste(evento, tituloEl));
    tituloEl.addEventListener('dblclick', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      void this.restaurarGeometriaMenu();
    });

    // ==button== Trava o menu aberto: não fecha ao selecionar texto nem ao gerar
    this.botaoFixarEl = this.criarBotaoIcone(cabecalhoEl, 'pin', '', `${CLS}__fechar ${CLS}__fixar`);
    this.botaoFixarEl.setAttribute('data-dev', 'gemini-botao-fixar');
    this.botaoFixarEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      void this.handleAlternarFixado();
    });
    this.atualizarBotaoFixar();

    // ==button== Atalho para a seção "CONFIGURAÇÕES DA I.A." nas configurações
    const botaoConfiguracoes = this.criarBotaoIcone(cabecalhoEl, 'settings', traduzir(idioma, 'config.ia.titulo'), `${CLS}__fechar`);
    botaoConfiguracoes.setAttribute('data-dev', 'gemini-botao-configuracoes');
    botaoConfiguracoes.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      this.definirMenuAberto(false);
      this.plugin.abrirConfiguracoes(null, 'acoes');
    });

    // ==button== Tutorial
    const botaoTutorial = this.criarBotaoIcone(cabecalhoEl, 'circle-help', traduzir(idioma, 'menu.botao.tutorial'), `${CLS}__fechar`);
    botaoTutorial.setAttribute('data-dev', 'gemini-botao-tutorial');
    botaoTutorial.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      this.definirMenuAberto(false);
      this.plugin.abrirTutorial();
    });

    const botaoFechar = this.criarBotaoIcone(cabecalhoEl, 'x', traduzir(idioma, 'menu.botao.fechar'), `${CLS}__fechar ${CLS}__fechar-menu`);
    botaoFechar.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      this.definirMenuAberto(false);
    });
  }

  // ==section== Campo "Pedir à IA" (usa o prompt personalizado + instrução digitada)
  private criarCampoPedido(menuEl: HTMLElement): void {
    const idioma = this.plugin.settings.idioma;
    const pedidoWrapperEl = menuEl.createDiv({ cls: `${CLS}__pedido`, attr: { 'data-dev': 'gemini-menu-pedido' } });

    this.pedidoEl = pedidoWrapperEl.createEl('textarea', {
      cls: `${CLS}__pedido-input`,
      attr: { rows: '1', placeholder: traduzir(idioma, 'menu.pedir.placeholder'), 'aria-label': traduzir(idioma, 'menu.pedir.rotulo') }
    });
    this.pedidoEl.addEventListener('input', () => this.ajustarAlturaPedido());
    this.pedidoEl.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' && !evento.shiftKey) {
        evento.preventDefault();
        void this.handleEnviarPedido();
      }
    });

    const botaoEnviar = this.criarBotaoIcone(pedidoWrapperEl, 'send-horizontal', traduzir(idioma, 'menu.pedir.enviar'), `${CLS}__pedido-enviar`);
    botaoEnviar.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      void this.handleEnviarPedido();
    });
  }

  private ajustarAlturaPedido(): void {
    if (!this.pedidoEl) {
      return;
    }
    // ==style== Altura automática do campo (até 120px)
    this.pedidoEl.setCssProps({ height: 'auto' });
    this.pedidoEl.setCssProps({ height: `${Math.min(this.pedidoEl.scrollHeight, 120)}px` });
  }

  private async handleEnviarPedido(): Promise<void> {
    const instrucao = this.pedidoEl?.value.trim() ?? '';
    const definicao = obterDefinicaoComando(ID_PROMPT_PERSONALIZADO);
    if (!instrucao || !definicao) {
      this.pedidoEl?.focus();
      return;
    }

    if (this.pedidoEl) {
      this.pedidoEl.value = '';
      this.ajustarAlturaPedido();
    }
    await this.executarAcao(definicao, instrucao);
  }

  // ==function== Seção de favoritos (só aparece se houver algum)
  private renderizarFavoritos(container: HTMLElement): SecaoRenderizada | null {
    const definicoes = this.plugin.settings.acoesFavoritas
      .map((id) => obterDefinicaoComando(id))
      .filter((definicao): definicao is DefinicaoComando => definicao !== null);

    if (definicoes.length === 0) {
      return null;
    }

    const idioma = this.plugin.settings.idioma;
    const wrapperEl = container.createDiv({ cls: `${CLS}__favoritos`, attr: { 'data-dev': 'gemini-menu-favoritos' } });
    const tituloEl = wrapperEl.createDiv({ cls: `${CLS}__favoritos-titulo` });
    const iconeEl = tituloEl.createSpan();
    setIcon(iconeEl, 'star');
    tituloEl.createSpan({ text: traduzir(idioma, 'menu.grupo.favoritos') });

    const corpoEl = wrapperEl.createDiv({ cls: `${CLS}__favoritos-corpo` });
    const itens = definicoes.map((definicao) => this.renderizarItem(corpoEl, definicao, traduzir(idioma, 'menu.grupo.favoritos'), true));

    return { id: 'favoritos', wrapperEl, cabecalhoEl: null, itens };
  }

  // ==function== Renderiza um grupo (cabeçalho + ações)
  private renderizarGrupo(container: HTMLElement, config: GrupoMenuConfig): SecaoRenderizada {
    const idioma = this.plugin.settings.idioma;
    const tituloGrupo = traduzir(idioma, config.tituloTraducao);
    const definicoes = DEFINICOES_COMANDOS.filter((definicao) => definicao.grupo === config.id);
    if (config.id === 'resumir') {
      // Resumir: Pouco, Normal, Compacto e Ultra (ordem definida em utils/resumo.ts)
      definicoes.sort((a, b) => ORDEM_NIVEIS_RESUMIR.indexOf(a.nivel ?? 'padrao') - ORDEM_NIVEIS_RESUMIR.indexOf(b.nivel ?? 'padrao'));
    }

    const wrapperEl = container.createDiv({
      cls: `${CLS}__grupo ${CLS}__grupo--${config.id}`,
      attr: { 'data-dev': `gemini-grupo-${config.id}` }
    });

    // ==button== Outros: "Voltar" fecha o grupo e mostra os demais de novo (só aparece com Outros aberto)
    if (config.id === 'outros') {
      const botaoVoltarEl = wrapperEl.createEl('button', {
        cls: `${CLS}__voltar`,
        attr: { type: 'button', 'data-dev': 'gemini-botao-voltar' }
      });
      setIcon(botaoVoltarEl.createSpan({ cls: `${CLS}__voltar-icone` }), 'arrow-left');
      botaoVoltarEl.createSpan({ text: traduzir(idioma, 'menu.voltar') });
      botaoVoltarEl.addEventListener('click', (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        this.alternarGrupo('outros');
      });
    }

    // ==section== Linha: "i" (explica o grupo) à esquerda do ícone, sem aninhar botões
    const linhaEl = wrapperEl.createDiv({ cls: `${CLS}__grupo-linha` });
    const botaoInfoEl = linhaEl.createEl('button', {
      cls: `${CLS}__grupo-info`,
      attr: { type: 'button', 'aria-label': traduzir(idioma, 'menu.grupo.info'), 'aria-expanded': 'false', 'data-grupo': config.id }
    });
    botaoInfoEl.setAttribute('title', this.montarDicaGrupo(config.id));
    setIcon(botaoInfoEl, 'info');
    const cabecalhoEl = linhaEl.createEl('button', {
      cls: `${CLS}__grupo-titulo`,
      attr: { type: 'button', 'aria-expanded': 'false' }
    });

    const descricaoEl = wrapperEl.createDiv({ cls: `${CLS}__grupo-descricao` });
    descricaoEl.setText(traduzir(idioma, CHAVE_DESCRICAO_GRUPO[config.id]));
    botaoInfoEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      const aberta = wrapperEl.hasClass(`${CLS}__grupo--info-aberta`);
      wrapperEl.toggleClass(`${CLS}__grupo--info-aberta`, !aberta);
      botaoInfoEl.setAttribute('aria-expanded', String(!aberta));
    });
    const iconeEl = cabecalhoEl.createSpan({ cls: `${CLS}__grupo-icone` });
    setIcon(iconeEl, config.icone);
    cabecalhoEl.createSpan({ cls: `${CLS}__grupo-nome`, text: tituloGrupo });
    cabecalhoEl.createSpan({ cls: `${CLS}__grupo-contador`, text: String(definicoes.length) });
    const setaEl = cabecalhoEl.createSpan({ cls: `${CLS}__grupo-seta` });
    setIcon(setaEl, 'chevron-right');

    const corpoEl = wrapperEl.createDiv({ cls: `${CLS}__grupo-corpo` });

    cabecalhoEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      this.alternarGrupo(config.id);
    });

    const itens = definicoes.map((definicao) => this.renderizarItem(corpoEl, definicao, tituloGrupo, false));

    return { id: config.id, wrapperEl, cabecalhoEl, itens };
  }

  // ==function== Renderiza uma ação: botão principal + estrela de favorito
  private renderizarItem(container: HTMLElement, definicao: DefinicaoComando, tituloSecao: string, emFavoritos: boolean): ItemRenderizado {
    const idioma = this.plugin.settings.idioma;
    const nomeCompleto = obterNomeComando(idioma, definicao.id);
    const rotulo = emFavoritos ? nomeCompleto : obterRotuloCurtoComando(idioma, definicao.id);
    const atalho = ehAcaoDoAtalho(definicao) ? this.plugin.settings.atalhosPrompts[definicao.chavePrompt] ?? '' : '';
    const ehFavorito = this.plugin.ehFavorito(definicao.id);

    const linhaEl = container.createDiv({ cls: `${CLS}__acao-linha ${CLS}__grupo--${definicao.grupo}` });
    linhaEl.toggleClass(`${CLS}__acao-linha--favorita`, ehFavorito);

    const botaoEl = linhaEl.createEl('button', {
      cls: `${CLS}__acao`,
      attr: { type: 'button', role: 'menuitem', title: nomeCompleto, 'data-dev': `gemini-acao-${definicao.id}` }
    });
    botaoEl.createSpan({ cls: `${CLS}__acao-nome`, text: rotulo });
    // Estimativa de palavras (níveis calculados pela seleção), atualizada conforme a seleção muda
    const grupoComEstimativa = ['gerar', 'resumir', 'explicar', 'expandir', 'reescrever', 'responder'].includes(definicao.grupo);
    const estimativaEl = grupoComEstimativa && definicao.nivel ? botaoEl.createSpan({ cls: `${CLS}__estimativa` }) : null;
    if (atalho) {
      botaoEl.createEl('kbd', { cls: `${CLS}__atalho`, text: atalho });
    }
    botaoEl.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      void this.executarAcao(definicao);
    });

    const botaoEstrela = linhaEl.createEl('button', {
      cls: `${CLS}__estrela`,
      attr: {
        type: 'button',
        tabindex: '-1',
        'aria-pressed': String(ehFavorito),
        'aria-label': traduzir(idioma, ehFavorito ? 'menu.favorito.remover' : 'menu.favorito.adicionar')
      }
    });
    setIcon(botaoEstrela, 'star');
    botaoEstrela.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      void this.handleAlternarFavorito(definicao.id);
    });

    // ==button== Engrenagem: abre as configurações desta ação
    const botaoConfig = linhaEl.createEl('button', {
      cls: `${CLS}__config`,
      attr: { type: 'button', tabindex: '-1', 'aria-label': traduzir(idioma, 'menu.configurarAcao') }
    });
    setIcon(botaoConfig, 'settings');
    botaoConfig.addEventListener('click', (evento) => {
      evento.preventDefault();
      evento.stopPropagation();
      this.definirMenuAberto(false);
      this.plugin.abrirConfiguracoes(obterSecaoDaAcao(definicao));
    });

    return { definicao, linhaEl, botaoEl, estimativaEl, textoBusca: this.normalizarBusca(`${rotulo} ${nomeCompleto} ${tituloSecao}`) };
  }

  // ==function== Alterna favorito e reconstrói o menu mantendo-o aberto
  private async handleAlternarFavorito(id: string): Promise<void> {
    await this.plugin.alternarFavorito(id);
    const termoBusca = this.buscaEl?.value ?? '';
    const listaEl = this.menuEl?.querySelector<HTMLElement>(`.${CLS}__lista`);
    const rolagem = listaEl?.scrollTop ?? 0;

    this.menuEl?.remove();
    this.criarMenu();
    this.definirMenuAberto(true, false);

    if (this.buscaEl) {
      this.buscaEl.value = termoBusca;
      this.handleBusca();
    }
    const novaListaEl = this.menuEl?.querySelector<HTMLElement>(`.${CLS}__lista`);
    if (novaListaEl) {
      novaListaEl.scrollTop = rolagem;
    }
  }

  // ==function== Abre um grupo e fecha os demais (acordeão) e lembra o último
  private alternarGrupo(idGrupo: IdGrupoMenu): void {
    this.idGrupoAberto = this.idGrupoAberto === idGrupo ? null : idGrupo;
    this.aplicarEstadoGrupos();
    void this.plugin.definirUltimoGrupoMenu(this.idGrupoAberto);
  }

  private aplicarEstadoGrupos(): void {
    const estaBuscando = Boolean(this.buscaEl?.value.trim());

    for (const secao of this.secoes) {
      if (!secao.cabecalhoEl) {
        continue;
      }
      const deveAbrir = estaBuscando || secao.id === this.idGrupoAberto;
      secao.wrapperEl.toggleClass(`${CLS}__grupo--aberto`, deveAbrir);
      secao.cabecalhoEl.setAttribute('aria-expanded', String(deveAbrir));
    }

    // A altura mudou (grupo aberto/fechado, busca): reposiciona para o menu não passar da borda de baixo
    if (this.estaAberto) {
      window.requestAnimationFrame(() => this.reposicionarMenu());
    }

    // Com um grupo aberto, os demais ficam compactos (menos altura)
    this.menuEl?.toggleClass(`${CLS}__menu--grupo-aberto`, !estaBuscando && this.idGrupoAberto !== null);
    // Outros aberto: esconde os demais grupos e mostra só ele, com o botão Voltar
    this.menuEl?.toggleClass(`${CLS}__menu--foco-outros`, !estaBuscando && this.idGrupoAberto === 'outros');
  }

  // ==function== Filtra ações pelo texto digitado
  private handleBusca(): void {
    const termo = this.normalizarBusca(this.buscaEl?.value ?? '');
    let totalVisivel = 0;

    for (const secao of this.secoes) {
      let visiveisNaSecao = 0;

      for (const item of secao.itens) {
        const corresponde = !termo || item.textoBusca.includes(termo);
        item.linhaEl.toggleClass(`${CLS}__oculto`, !corresponde);
        if (corresponde) {
          visiveisNaSecao += 1;
        }
      }

      // Na busca, favoritos somem para não duplicar resultados
      const deveOcultarSecao = visiveisNaSecao === 0 || (Boolean(termo) && secao.id === 'favoritos');
      secao.wrapperEl.toggleClass(`${CLS}__oculto`, deveOcultarSecao);
      if (!deveOcultarSecao) {
        totalVisivel += visiveisNaSecao;
      }
    }

    this.ultimaLinhaEl?.toggleClass(`${CLS}__oculto`, Boolean(termo));
    this.vazioEl?.toggleClass(`${CLS}__oculto`, totalVisivel > 0);
    this.aplicarEstadoGrupos();
  }

  private normalizarBusca(valor: string): string {
    return valor.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  // ==function== Navegação por teclado dentro do menu
  private handleTecladoMenu(evento: KeyboardEvent): void {
    if (evento.target === this.pedidoEl) {
      return;
    }

    const itensFocaveis = this.obterItensFocaveis();
    if (itensFocaveis.length === 0) {
      return;
    }

    const indiceAtual = itensFocaveis.findIndex((item) => item === activeDocument.activeElement);

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      const proximoIndice = indiceAtual === -1 ? (passo === 1 ? 0 : itensFocaveis.length - 1) : (indiceAtual + passo + itensFocaveis.length) % itensFocaveis.length;
      itensFocaveis[proximoIndice]?.focus();
      return;
    }

    const deveExecutarPrimeiro = evento.key === 'Enter' && activeDocument.activeElement === this.buscaEl;
    if (deveExecutarPrimeiro) {
      evento.preventDefault();
      itensFocaveis.find((item) => item.hasClass(`${CLS}__acao`))?.click();
    }
  }

  private obterItensFocaveis(): HTMLButtonElement[] {
    if (!this.menuEl) {
      return [];
    }

    const seletor = `.${CLS}__ultima:not(.${CLS}__oculto):not(:disabled), .${CLS}__acao, .${CLS}__grupo-titulo`;
    return Array.from(this.menuEl.querySelectorAll<HTMLButtonElement>(seletor)).filter((item) => item.offsetParent !== null);
  }

  // ==function== Mostra no botão do Resumir quantas palavras o resumo deve ter para a seleção atual
  private atualizarEstimativa(item: ItemRenderizado, selecao: string): void {
    if (!item.estimativaEl || !item.definicao.nivel) {
      return;
    }
    const idioma = this.plugin.settings.idioma;
    // Gerar e Responder: a faixa de palavras do nível (não depende da seleção)
    if (item.definicao.grupo === 'gerar' || item.definicao.grupo === 'responder') {
      const faixa = this.plugin.settings.faixasPalavras[item.definicao.grupo][item.definicao.nivel];
      item.estimativaEl.setText(traduzir(idioma, 'menu.faixaPalavras', { min: faixa.min, max: faixa.max }));
      return;
    }
    const grupo = item.definicao.grupo as GrupoComAlvoPorSelecao;
    const palavras = estimarPalavrasNivel(selecao, grupo, item.definicao.nivel, this.plugin.settings);
    const mostrar = selecao && (grupo !== 'resumir' || selecaoAtingeMinimoResumo(selecao));
    item.estimativaEl.setText(mostrar ? traduzir(idioma, 'menu.estimativa', { palavras }) : '');
  }

  // ==function== Atualiza status da seleção e marca ações que exigem seleção
  private atualizarEstadoSelecao(): void {
    const idioma = this.plugin.settings.idioma;
    const selecao = this.obterEditor()?.getSelection().trim() ?? '';
    const quantidadePalavras = selecao ? selecao.split(/\s+/).length : 0;
    const temSelecao = quantidadePalavras > 0;

    if (this.infoSelecaoEl) {
      this.infoSelecaoEl.empty();
      const iconeEl = this.infoSelecaoEl.createSpan({ cls: `${CLS}__selecao-icone` });
      setIcon(iconeEl, temSelecao ? 'text-cursor-input' : 'info');
      this.infoSelecaoEl.createSpan({
        text: temSelecao ? traduzir(idioma, 'menu.selecao.ativa', { quantidade: quantidadePalavras }) : traduzir(idioma, 'menu.selecao.vazia')
      });
      this.infoSelecaoEl.toggleClass(`${CLS}__selecao--ativa`, temSelecao);
    }

    for (const secao of this.secoes) {
      for (const item of secao.itens) {
        this.atualizarEstimativa(item, selecao);
        const resumirSemMinimo = item.definicao.grupo === 'resumir' && !selecaoAtingeMinimoResumo(selecao);
        const estaIndisponivel = (exigeSelecao(item.definicao) && !temSelecao) || resumirSemMinimo;
        item.botaoEl.toggleClass(`${CLS}__acao--indisponivel`, estaIndisponivel);
        item.botaoEl.setAttribute('aria-disabled', String(estaIndisponivel));
        item.botaoEl.setAttribute('title', estaIndisponivel ? traduzir(idioma, 'menu.requerSelecao') : obterNomeComando(idioma, item.definicao.id));
      }
    }
  }

  // ==function== Alterna a trava do menu e salva a preferência
  private async handleAlternarFixado(): Promise<void> {
    this.plugin.settings.menuFixado = !this.plugin.settings.menuFixado;
    await this.plugin.saveSettings();
    this.atualizarBotaoFixar();
  }

  // ==function== Reflete o estado da trava no ícone (pin = fixado, pin-off = livre)
  private atualizarBotaoFixar(): void {
    if (!this.botaoFixarEl) {
      return;
    }

    const idioma = this.plugin.settings.idioma;
    const fixado = this.plugin.settings.menuFixado;
    this.botaoFixarEl.empty();
    setIcon(this.botaoFixarEl, fixado ? 'pin' : 'pin-off');
    this.botaoFixarEl.toggleClass(`${CLS}__fixar--ativo`, fixado);
    this.botaoFixarEl.setAttribute('aria-pressed', String(fixado));
    this.botaoFixarEl.setAttribute('aria-label', traduzir(idioma, fixado ? 'menu.fixar.desativar' : 'menu.fixar.ativar'));
  }

  // ==section== Posição e tamanho do menu (salvos e reaplicados ao abrir pelo botão IA)

  // ==function== Observa o redimensionamento pelo canto do menu para salvar o tamanho
  private observarTamanhoMenu(): void {
    this.observadorTamanho?.disconnect();
    this.observadorTamanho = null;
    if (!this.menuEl) {
      return;
    }
    this.observadorTamanho = new ResizeObserver(() => this.registrarTamanhoMenu());
    this.observadorTamanho.observe(this.menuEl);
  }

  // ==function== Arrasta o menu pelo título; só salva a posição se o menu realmente se mexeu
  private iniciarArraste(evento: PointerEvent, alvoEl: HTMLElement): void {
    if (!this.menuEl || evento.button !== 0) {
      return;
    }

    evento.preventDefault();
    const retangulo = this.menuEl.getBoundingClientRect();
    const deslocamentoX = evento.clientX - retangulo.left;
    const deslocamentoY = evento.clientY - retangulo.top;
    const inicioX = evento.clientX;
    const inicioY = evento.clientY;
    let ultimaPosicao = { x: retangulo.left, y: retangulo.top };
    let moveu = false;
    alvoEl.setPointerCapture(evento.pointerId);

    const aoMover = (eventoMover: PointerEvent): void => {
      // Ignora tremidas pequenas (um clique ou duplo clique não deve mover o menu)
      if (!moveu && Math.abs(eventoMover.clientX - inicioX) < 4 && Math.abs(eventoMover.clientY - inicioY) < 4) {
        return;
      }
      moveu = true;
      ultimaPosicao = this.aplicarPosicaoMenu(eventoMover.clientX - deslocamentoX, eventoMover.clientY - deslocamentoY);
    };
    const aoSoltar = (): void => {
      alvoEl.removeEventListener('pointermove', aoMover);
      alvoEl.removeEventListener('pointerup', aoSoltar);
      alvoEl.removeEventListener('pointercancel', aoSoltar);
      if (!moveu) {
        return;
      }
      this.atualizarLimitesMenu();
      this.plugin.settings.menuPosicao = ultimaPosicao;
      void this.plugin.saveSettings();
    };

    alvoEl.addEventListener('pointermove', aoMover);
    alvoEl.addEventListener('pointerup', aoSoltar);
    alvoEl.addEventListener('pointercancel', aoSoltar);
  }

  // ==function== Posiciona o menu fixo na tela, sempre com o cabeçalho visível; retorna a posição usada
  private aplicarPosicaoMenu(x: number, y: number): { x: number; y: number } {
    const menu = this.menuEl;
    if (!menu) {
      return { x, y };
    }
    // Fica sempre inteiro dentro da janela do Obsidian: se a parte de baixo passaria da borda,
    // o menu sobe (scrollHeight = altura de todo o conteúdo, mesmo se estiver limitado)
    const largura = menu.offsetWidth;
    const alturaConteudo = menu.scrollHeight;
    const xLimitado = Math.round(Math.min(Math.max(MARGEM_MENU, x), Math.max(MARGEM_MENU, window.innerWidth - largura - MARGEM_MENU)));
    const yLimitado = Math.round(Math.min(Math.max(MARGEM_MENU, y), Math.max(MARGEM_MENU, window.innerHeight - alturaConteudo - MARGEM_MENU)));
    // Posição fixa na tela pela classe; coordenadas pelo setCssProps (valores dinâmicos)
    menu.addClass(`${CLS}__menu--posicionado`);
    menu.setCssProps({ left: `${xLimitado}px`, top: `${yLimitado}px` });

    // Algum elemento do Obsidian em volta pode deslocar o "fixed": mede onde o menu ficou e compensa a diferença
    const retangulo = menu.getBoundingClientRect();
    const ajusteX = retangulo.left - xLimitado;
    const ajusteY = retangulo.top - yLimitado;
    if (Math.abs(ajusteX) > 0.5 || Math.abs(ajusteY) > 0.5) {
      menu.setCssProps({ left: `${xLimitado - ajusteX}px`, top: `${yLimitado - ajusteY}px` });
    }

    this.atualizarLimitesMenu();
    return { x: xLimitado, y: yLimitado };
  }

  // ==function== Posição padrão (sem posição salva): por cima do botão IA, começando um pouco acima dele
  private limparPosicaoMenu(): void {
    const menu = this.menuEl;
    const botao = this.botaoEl;
    if (!menu || !botao) {
      return;
    }
    menu.style.removeProperty('max-height');
    menu.style.removeProperty('max-width');
    const retangulo = botao.getBoundingClientRect();
    const x = this.plugin.settings.posicaoBotaoFlutuante === 'direita' ? retangulo.right - menu.offsetWidth : retangulo.left;
    this.aplicarPosicaoMenu(x, retangulo.top - DESLOCAMENTO_MENU_ACIMA);
  }

  // ==function== Volta à posição salva (ou à padrão) e reajusta para caber inteiro na janela
  private reposicionarMenu(): void {
    if (!this.menuEl || !this.estaAberto) {
      return;
    }
    const posicao = this.plugin.settings.menuPosicao;
    if (posicao) {
      this.aplicarPosicaoMenu(posicao.x, posicao.y);
    } else {
      this.limparPosicaoMenu();
    }
  }

  // ==function== Limite máximo: a altura acompanha os itens; só não passa da borda de baixo da janela
  private atualizarLimitesMenu(): void {
    const menu = this.menuEl;
    if (!menu) {
      return;
    }
    const topo = menu.hasClass(`${CLS}__menu--posicionado`) ? menu.getBoundingClientRect().top : 60;
    const alturaJanela = window.innerHeight - topo - MARGEM_MENU;
    menu.style.maxHeight = `${Math.max(ALTURA_MINIMA_MENU, alturaJanela)}px`;
    menu.style.maxWidth = `${window.innerWidth - MARGEM_MENU * 2}px`;
  }

  // ==function== Salva o tamanho quando o usuário redimensiona pelo canto (o navegador grava width/height no estilo)
  private registrarTamanhoMenu(): void {
    const menu = this.menuEl;
    if (!menu || !this.estaAberto || (!menu.style.width && !menu.style.height)) {
      return;
    }
    const tamanho = { largura: Math.round(menu.offsetWidth), altura: Math.round(menu.offsetHeight) };
    const atual = this.plugin.settings.menuTamanho;
    if (atual && atual.largura === tamanho.largura && atual.altura === tamanho.altura) {
      return;
    }

    this.plugin.settings.menuTamanho = tamanho;
    if (this.timerSalvarTamanho !== null) {
      window.clearTimeout(this.timerSalvarTamanho);
    }
    this.timerSalvarTamanho = window.setTimeout(() => {
      this.timerSalvarTamanho = null;
      void this.plugin.saveSettings();
    }, 300);
  }

  // ==function== Reaplica a posição e o tamanho salvos ao abrir o menu
  private aplicarGeometriaMenu(): void {
    const menu = this.menuEl;
    if (!menu) {
      return;
    }
    const { menuPosicao, menuTamanho } = this.plugin.settings;

    // Só a largura é ajustável; a altura acompanha os itens (sem rolagem)
    menu.style.removeProperty('height');
    menu.scrollTop = 0;
    if (menuTamanho) {
      menu.style.width = `${Math.min(menuTamanho.largura, window.innerWidth - MARGEM_MENU * 2)}px`;
    } else {
      menu.style.removeProperty('width');
    }

    if (menuPosicao) {
      this.aplicarPosicaoMenu(menuPosicao.x, menuPosicao.y);
    } else {
      this.limparPosicaoMenu();
    }

    // Nunca maior que os itens nem que a janela
    if (menuPosicao || menuTamanho) {
      this.atualizarLimitesMenu();
    }
  }

  // ==function== Duplo clique no título: volta o menu para junto do botão IA, com tamanho automático
  private async restaurarGeometriaMenu(): Promise<void> {
    this.plugin.settings.menuPosicao = null;
    this.plugin.settings.menuTamanho = null;
    await this.plugin.saveSettings();
    this.limparPosicaoMenu();
    this.menuEl?.style.removeProperty('width');
    this.menuEl?.style.removeProperty('height');
  }

  // ==function== Atualiza o card "repetir última ação"
  private atualizarUltimaAcao(): void {
    if (!this.ultimaAcaoEl) {
      return;
    }

    const idioma = this.plugin.settings.idioma;
    const ultimaAcao = this.plugin.obterUltimaAcaoExecutada();

    this.ultimaAcaoEl.empty();
    this.ultimaAcaoEl.disabled = !ultimaAcao;

    const iconeEl = this.ultimaAcaoEl.createSpan({ cls: `${CLS}__ultima-icone` });
    setIcon(iconeEl, 'repeat');

    const textosEl = this.ultimaAcaoEl.createSpan({ cls: `${CLS}__ultima-textos` });
    textosEl.createSpan({ cls: `${CLS}__ultima-rotulo`, text: traduzir(idioma, 'menu.ultimaAcao.rotulo') });
    textosEl.createSpan({
      cls: `${CLS}__ultima-nome`,
      text: ultimaAcao ? obterNomeComando(idioma, ultimaAcao.id) : traduzir(idioma, 'menu.ultimaAcao.vazia')
    });
  }

  private async executarAcao(definicao: DefinicaoComando, instrucaoPersonalizada?: string): Promise<void> {
    const editor = this.obterEditor();
    if (!editor || this.estaExecutando) {
      return;
    }

    // Com o menu fixado, ele continua aberto durante a geração
    if (!this.plugin.settings.menuFixado) {
      this.definirMenuAberto(false);
    }
    this.restaurarSelecaoAoAbrir(editor);
    editor.focus();
    await executarComando(this.plugin, editor, definicao, { instrucaoPersonalizada });
  }

  // ==function== Guarda a seleção no momento em que o menu abre
  private guardarSelecaoAoAbrir(): void {
    const editor = this.obterEditor();
    const texto = editor?.getSelection() ?? '';
    this.selecaoAoAbrir = editor && texto.trim()
      ? { from: editor.getCursor('from'), to: editor.getCursor('to'), texto }
      : null;
  }

  // ==function== Recoloca a seleção guardada se ela tiver sumido e o texto ainda estiver no mesmo lugar
  private restaurarSelecaoAoAbrir(editor: MarkdownView['editor']): void {
    const salva = this.selecaoAoAbrir;
    if (!salva || editor.getSelection().trim()) {
      return;
    }
    if (editor.getRange(salva.from, salva.to) !== salva.texto) {
      return;
    }
    editor.setSelection(salva.from, salva.to);
  }

  // ==function== Abre/fecha o menu; ao abrir reinicia busca e aplica grupo padrão
  private definirMenuAberto(valor: boolean, aplicarGrupoInicial = true): void {
    if (!this.menuEl) {
      this.estaAberto = false;
      return;
    }

    this.estaAberto = valor;
    if (valor) {
      this.guardarSelecaoAoAbrir();
    }
    this.menuEl.toggleClass(`${CLS}__menu--aberto`, valor);
    this.menuEl.toggleClass(`${CLS}__menu--fechado`, !valor);
    this.botaoEl?.setAttribute('aria-expanded', String(valor));

    if (!valor) {
      return;
    }

    if (aplicarGrupoInicial) {
      // O menu sempre abre com todos os grupos recolhidos
      this.idGrupoAberto = null;
      if (this.buscaEl) {
        this.buscaEl.value = '';
      }
    }

    this.handleBusca();
    this.atualizarEstadoSelecao();
    this.atualizarUltimaAcao();
    this.atualizarDicasGrupos();
    this.aplicarGeometriaMenu();
    // Com seleção ativa, o foco fica no editor para a seleção continuar visível na nota
    if (!this.selecaoAoAbrir) {
      window.setTimeout(() => this.buscaEl?.focus({ preventScroll: true }), 30);
    }
  }

  // ==function== Texto do "i" de um grupo: cada nível com a faixa de palavras (ou a descrição, quando não há faixa)
  private montarDicaGrupo(idGrupo: IdGrupoMenu): string {
    const idioma = this.plugin.settings.idioma;
    if (idGrupo === 'outros') {
      // Uma linha por ferramenta, na ordem do menu, e por último o pedido livre
      const linhasFerramentas = Object.entries(FERRAMENTAS_OUTROS).map(
        ([id, ferramenta]) => `${obterRotuloCurtoComando(idioma, id)}: ${traduzir(idioma, ferramenta.dica)}`
      );
      return [...linhasFerramentas, traduzir(idioma, 'dica.personalizado')].join('\n');
    }

    const niveis = idGrupo === 'resumir' ? ORDEM_NIVEIS_RESUMIR : NIVEIS_RESPOSTA;
    const linhas = niveis.map((nivel) => {
      const rotulo = traduzir(idioma, `menu.acao.${idGrupo}-${nivel}`);
      if (idGrupo === 'resumir') {
        return `${rotulo}: ${traduzir(idioma, 'dica.fator.resumir', { fator: this.plugin.settings.fatoresResumo[nivel] })}`;
      }
      if (idGrupo === 'expandir') {
        return `${rotulo}: ${traduzir(idioma, 'dica.expandir.nivel', { fator: this.plugin.settings.fatoresExpandir[nivel] })}`;
      }
      if (idGrupo === 'reescrever') {
        return `${rotulo}: ${traduzir(idioma, 'dica.reescrever.fator', { fator: this.plugin.settings.fatoresReescrever[nivel] })}`;
      }
      if (idGrupo === 'explicar') {
        // Explicar: com seleção, fator × tamanho; sem seleção, as faixas de palavras do nível
        const faixa = this.plugin.settings.faixasPalavras.explicar[nivel];
        return `${rotulo}: ${traduzir(idioma, 'dica.explicar.nivel', {
          fator: this.plugin.settings.fatoresExplicar[nivel],
          min: faixa.min,
          max: faixa.max
        })}`;
      }
      if (ehGrupoComFaixa(idGrupo)) {
        const faixa = this.plugin.settings.faixasPalavras[idGrupo][nivel];
        return `${rotulo}: ${traduzir(idioma, `dica.faixa.${idGrupo}`, { min: faixa.min, max: faixa.max })}`;
      }
      return `${rotulo}: ${traduzir(idioma, `dica.reescrever.${nivel}`)}`;
    });

    return linhas.join('\n');
  }

  // ==function== Atualiza as dicas dos "i" para refletir as faixas atuais das configurações
  private atualizarDicasGrupos(): void {
    this.menuEl?.querySelectorAll<HTMLButtonElement>(`.${CLS}__grupo-info`).forEach((botao) => {
      const idGrupo = botao.dataset.grupo as IdGrupoMenu | undefined;
      if (idGrupo) {
        botao.setAttribute('title', this.montarDicaGrupo(idGrupo));
      }
    });
  }

  // ==function== Estado de carregamento do botão principal
  private definirCarregando(valor: boolean): void {
    this.estaExecutando = valor;
    this.botaoPararEl?.toggleClass(`${CLS}__oculto`, !valor);

    if (!this.botaoEl) {
      return;
    }

    const idioma = this.plugin.settings.idioma;
    this.botaoEl.toggleClass(`${CLS}__botao--carregando`, valor);
    this.botaoEl.disabled = valor;
    this.botaoEl.setAttribute('aria-busy', String(valor));

    if (!valor) {
      this.renderizarEstadoPadraoDoBotao();
      return;
    }

    if (this.estaAberto && !this.plugin.settings.menuFixado) {
      this.definirMenuAberto(false);
    }

    const modeloAtivo = this.plugin.obterModeloGeracaoAtivo();
    const textoCarregando =
      this.plugin.settings.mostrarIndicadorModelo && modeloAtivo ? obterRotuloModelo(idioma, modeloAtivo) : traduzir(idioma, 'menu.botao.gerando');

    this.botaoEl.empty();
    this.botaoEl.setAttribute('aria-label', traduzir(idioma, 'menu.aria.gerando'));
    this.botaoEl.createDiv({ cls: `${CLS}__spinner` });
    this.botaoEl.createSpan({ cls: `${CLS}__texto`, text: textoCarregando });
  }

  private renderizarEstadoPadraoDoBotao(): void {
    if (!this.botaoEl) {
      return;
    }

    const idioma = this.plugin.settings.idioma;
    this.botaoEl.empty();
    this.botaoEl.setAttribute('aria-label', traduzir(idioma, 'menu.aria.abrir'));
    const iconeEl = this.botaoEl.createSpan({ cls: `${CLS}__botao-icone` });
    setIcon(iconeEl, 'sparkles');

    if (this.plugin.settings.exibirTextoBotaoFlutuante) {
      this.botaoEl.createSpan({ cls: `${CLS}__texto`, text: traduzir(idioma, 'menu.botao.rotulo') });
    }
  }

  private remover(): void {
    // A interface nova começa do zero: menu fechado e sem geração (criarInterface religa se houver uma)
    this.estaAberto = false;
    this.estaExecutando = false;
    this.idGrupoAberto = null;
    this.observadorTamanho?.disconnect();
    this.observadorTamanho = null;
    if (this.timerSalvarTamanho !== null) {
      window.clearTimeout(this.timerSalvarTamanho);
      this.timerSalvarTamanho = null;
    }
    this.raizEl?.remove();
    this.portalEl?.remove();
    this.portalEl = null;
    this.containerPai = null;
    this.raizEl = null;
    this.menuEl = null;
    this.botaoEl = null;
    this.botaoPararEl = null;
    this.botaoFixarEl = null;
    this.botaoDesfazerEl = null;
    this.botaoRefazerEl = null;
    this.buscaEl = null;
    this.infoSelecaoEl = null;
    this.ultimaAcaoEl = null;
    this.ultimaLinhaEl = null;
    this.pedidoEl = null;
    this.vazioEl = null;
    this.secoes = [];
    this.estaAberto = false;
    this.estaExecutando = false;
  }
}
