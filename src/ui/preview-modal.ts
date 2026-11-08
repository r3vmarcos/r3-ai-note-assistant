import { ButtonComponent, DropdownComponent, Modal, Platform, setIcon, type TFile } from 'obsidian';

import { obterRotuloInsercao, obterRotuloModelo, traduzir } from '../i18n';
import type GeminiAssistantR3Plugin from '../main';
import type { ResultadoGeracaoGemini } from '../servicos/gemini-api-service';
import { MODELOS_GEMINI_DISPONIVEIS } from '../settings';
import type { ModeloGeminiDisponivel, TipoInsercao } from '../tipos/configuracoes';
import type { ContextoEditor } from '../utils/editor';
import { mostrarNoticeTemporario } from '../utils/notice';
import { ehOpcaoValida } from '../utils/validacao';

export type AcaoPreview = TipoInsercao | 'new-note' | 'cancel';

interface ResultadoPreview {
  acao: AcaoPreview;
  texto: string;
}

// ==types== Dados recebidos pelo modal
export interface DadosPreview {
  resultadoInicial: ResultadoGeracaoGemini;
  tipoInsercaoPadrao: TipoInsercao;
  contexto: ContextoEditor;
  regenerar: (modelo?: ModeloGeminiDisponivel) => Promise<ResultadoGeracaoGemini>;
}

// ==style== Prefixo de classes do modal
const CLS = 'gemini-assistant-r3-preview-modal';

// ==class== Modal de pré-visualização com edição, regeneração e escolha de inserção
export class ModalPreviewGeracao extends Modal {
  private readonly plugin: GeminiAssistantR3Plugin;
  private readonly dados: DadosPreview;
  private resolver: ((resultado: ResultadoPreview) => void) | null = null;
  private areaTexto: HTMLTextAreaElement | null = null;
  private contadorEl: HTMLDivElement | null = null;
  private chipModeloEl: HTMLSpanElement | null = null;
  private botaoRegenerar: ButtonComponent | null = null;
  private modeloSelecionado: ModeloGeminiDisponivel;
  private estaRegenerando = false;

  constructor(plugin: GeminiAssistantR3Plugin, dados: DadosPreview) {
    super(plugin.app);
    this.plugin = plugin;
    this.dados = dados;
    this.modeloSelecionado = dados.resultadoInicial.modeloUsado;
  }

  abrir(): Promise<ResultadoPreview> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      this.open();
    });
  }

  onOpen(): void {
    const idioma = this.plugin.settings.idioma;
    const { contentEl, modalEl } = this;
    contentEl.empty();
    modalEl.addClass(`${CLS}-container`);
    contentEl.addClass(CLS);
    this.setTitle(traduzir(idioma, 'preview.titulo'));

    contentEl.createEl('p', { cls: `${CLS}__descricao`, text: traduzir(idioma, 'preview.descricao') });

    // ==section== Metadados: nota, seção e modelo
    const metaEl = contentEl.createDiv({ cls: `${CLS}__meta`, attr: { 'data-dev': 'preview-meta' } });
    metaEl.createSpan({ cls: `${CLS}__tag`, text: traduzir(idioma, 'preview.contextoNota', { titulo: this.dados.contexto.tituloNota || '-' }) });
    if (this.dados.contexto.headingAtual) {
      metaEl.createSpan({ cls: `${CLS}__tag`, text: traduzir(idioma, 'preview.contextoSecao', { secao: this.dados.contexto.headingAtual }) });
    }
    this.chipModeloEl = metaEl.createSpan({ cls: `${CLS}__tag ${CLS}__tag--modelo` });
    this.atualizarChipModelo(this.dados.resultadoInicial);

    // ==section== Barra de regeneração
    const barraRegenerarEl = contentEl.createDiv({ cls: `${CLS}__regenerar`, attr: { 'data-dev': 'preview-regenerar' } });
    barraRegenerarEl.createSpan({ cls: `${CLS}__rotulo`, text: traduzir(idioma, 'preview.modelo') });
    new DropdownComponent(barraRegenerarEl)
      .addOptions(Object.fromEntries(MODELOS_GEMINI_DISPONIVEIS.map((modelo) => [modelo, obterRotuloModelo(idioma, modelo)])))
      .setValue(this.modeloSelecionado)
      .onChange((valor) => {
        if (ehOpcaoValida(MODELOS_GEMINI_DISPONIVEIS, valor)) {
          this.modeloSelecionado = valor;
        }
      });
    this.botaoRegenerar = new ButtonComponent(barraRegenerarEl)
      .setIcon('refresh-cw')
      .setButtonText(traduzir(idioma, 'preview.botao.regenerar'))
      .onClick(() => void this.handleRegenerar());

    // ==section== Texto editável + contador
    this.areaTexto = contentEl.createEl('textarea', { cls: `${CLS}__texto`, attr: { 'data-dev': 'preview-texto', spellcheck: 'true' } });
    this.areaTexto.value = this.dados.resultadoInicial.texto;
    this.areaTexto.addEventListener('input', () => this.atualizarContador());
    this.areaTexto.addEventListener('keydown', (evento) => this.handleAtalhoTextarea(evento));
    this.contadorEl = contentEl.createDiv({ cls: `${CLS}__contador` });
    this.atualizarContador();

    // ==section== Ações de inserção (padrão destacado)
    const barraAcoesEl = contentEl.createDiv({ cls: `${CLS}__acoes`, attr: { 'data-dev': 'preview-acoes' } });
    const acoesInsercao: { acao: AcaoPreview; chave: string; icone: string }[] = [
      { acao: 'below', chave: 'preview.botao.abaixo', icone: 'arrow-down-to-line' },
      { acao: 'replace', chave: 'preview.botao.substituir', icone: 'replace' },
      { acao: 'append', chave: 'preview.botao.final', icone: 'arrow-down-to-dot' },
      { acao: 'new-note', chave: 'preview.botao.novaNota', icone: 'file-plus' }
    ];

    for (const item of acoesInsercao) {
      const ehPadrao = item.acao === this.dados.tipoInsercaoPadrao;
      const botao = new ButtonComponent(barraAcoesEl).setIcon(item.icone).setButtonText(traduzir(idioma, item.chave)).onClick(() => this.finalizar(item.acao));
      if (ehPadrao) {
        botao.setCta();
      }
    }

    barraAcoesEl.createDiv({ cls: `${CLS}__espaco` });
    new ButtonComponent(barraAcoesEl).setButtonText(traduzir(idioma, 'preview.botao.cancelar')).onClick(() => this.finalizar('cancel'));

    // ==section== Dica com inserção padrão traduzida
    const teclaAtalho = Platform.isMacOS ? '⌘' : 'Ctrl';
    contentEl.createDiv({
      cls: `${CLS}__dica`,
      text: traduzir(idioma, 'preview.insercaoPadrao', {
        modo: obterRotuloInsercao(idioma, this.dados.tipoInsercaoPadrao),
        tecla: teclaAtalho
      })
    });

    window.setTimeout(() => this.areaTexto?.focus(), 30);
  }

  onClose(): void {
    if (this.resolver) {
      this.resolver({ acao: 'cancel', texto: this.areaTexto?.value ?? '' });
      this.resolver = null;
    }
    this.contentEl.empty();
  }

  // ==function== Ctrl/⌘ + Enter insere com o modo padrão
  private handleAtalhoTextarea(evento: KeyboardEvent): void {
    const deveInserirPadrao = evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey);
    if (deveInserirPadrao) {
      evento.preventDefault();
      this.finalizar(this.dados.tipoInsercaoPadrao);
    }
  }

  // ==function== Gera de novo com o modelo escolhido
  private async handleRegenerar(): Promise<void> {
    if (this.estaRegenerando || !this.areaTexto) {
      return;
    }

    const idioma = this.plugin.settings.idioma;
    this.definirRegenerando(true);

    try {
      const resultado = await this.dados.regenerar(this.modeloSelecionado);
      this.areaTexto.value = resultado.texto;
      this.atualizarChipModelo(resultado);
      this.atualizarContador();
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'unknown';
      mostrarNoticeTemporario(traduzir(idioma, 'notice.falha', { mensagem }), 5000);
    } finally {
      this.definirRegenerando(false);
    }
  }

  private definirRegenerando(valor: boolean): void {
    const idioma = this.plugin.settings.idioma;
    this.estaRegenerando = valor;
    this.contentEl.toggleClass(`${CLS}--carregando`, valor);
    this.botaoRegenerar?.setDisabled(valor).setButtonText(traduzir(idioma, valor ? 'preview.botao.regenerando' : 'preview.botao.regenerar'));
    if (this.areaTexto) {
      this.areaTexto.disabled = valor;
    }
  }

  private atualizarChipModelo(resultado: ResultadoGeracaoGemini): void {
    if (!this.chipModeloEl) {
      return;
    }

    const idioma = this.plugin.settings.idioma;
    this.chipModeloEl.empty();
    const iconeEl = this.chipModeloEl.createSpan({ cls: `${CLS}__tag-icone` });
    setIcon(iconeEl, 'cpu');
    const rotulo = obterRotuloModelo(idioma, resultado.modeloUsado);
    this.chipModeloEl.createSpan({ text: resultado.fallbackUsado ? traduzir(idioma, 'preview.modeloFallback', { modelo: rotulo }) : rotulo });
  }

  private atualizarContador(): void {
    const texto = this.areaTexto?.value ?? '';
    const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    this.contadorEl?.setText(traduzir(this.plugin.settings.idioma, 'preview.contador', { palavras, caracteres: texto.length }));
  }

  private finalizar(acao: AcaoPreview): void {
    if (this.estaRegenerando) {
      return;
    }

    const texto = this.areaTexto?.value ?? '';
    const resolver = this.resolver;
    this.resolver = null;
    this.close();
    resolver?.({ acao, texto });
  }
}

// ==function== Cria uma nota irmã com o conteúdo gerado
export async function criarNovaNotaComConteudo(plugin: GeminiAssistantR3Plugin, contexto: ContextoEditor, texto: string, nomeNota?: string): Promise<TFile> {
  const arquivoAtivo = plugin.app.workspace.getActiveFile();
  const pastaBase = arquivoAtivo?.parent?.path ?? '';
  const pastaPrefixo = pastaBase && pastaBase !== '/' ? `${pastaBase}/` : '';
  const idioma = plugin.settings.idioma;
  // Com nome explícito (Gerar com seleção) usa o nome puro; senão, o título da nota com o sufixo "-ia"
  const baseNome = nomeNota !== undefined
    ? sanitizarNome(nomeNota || traduzir(idioma, 'preview.novaNota.padrao'))
    : sanitizarNome(`${contexto.tituloNota || traduzir(idioma, 'preview.novaNota.padrao')}-ia`);

  let contador = 1;
  let caminhoFinal = `${pastaPrefixo}${baseNome}.md`;
  while (plugin.app.vault.getAbstractFileByPath(caminhoFinal)) {
    contador += 1;
    caminhoFinal = `${pastaPrefixo}${baseNome}-${contador}.md`;
  }

  const novoArquivo = await plugin.app.vault.create(caminhoFinal, texto);
  mostrarNoticeTemporario(traduzir(idioma, 'preview.novaNota.criada', { caminho: caminhoFinal }));
  await plugin.app.workspace.getLeaf('tab').openFile(novoArquivo);
  return novoArquivo;
}

function sanitizarNome(valor: string): string {
  return valor.replace(/[\\/:*?"<>|#^[\]]/g, '-').replace(/\s+/g, ' ').trim();
}
