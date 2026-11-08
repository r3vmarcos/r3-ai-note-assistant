import { ButtonComponent, Modal, Notice, setIcon } from 'obsidian';

import { CHAVE_PIX, EMAIL_CONTATO, NOME_CRIADOR, URL_BUYMEACOFFEE, URL_GITHUB_CRIADOR } from '../data/sobre';
import { traduzir } from '../i18n';
import type GeminiAssistantR3Plugin from '../main';

// ==style== Prefixo de classes (reaproveita o visual do tutorial)
const CLS = 'gemini-assistant-r3-tutorial';

// ==class== Bloco "Sobre o projeto": criador, contato e apoio via Pix
export class BlocoSobre {
  private readonly plugin: GeminiAssistantR3Plugin;

  constructor(plugin: GeminiAssistantR3Plugin) {
    this.plugin = plugin;
  }

  private t(chave: string): string {
    return traduzir(this.plugin.settings.idioma, chave);
  }

  // ==function== Renderiza o bloco Sobre (criador, contato e Pix) dentro do container
  render(container: HTMLElement): void {
    const sobreEl = container.createDiv({ cls: `${CLS}__sobre`, attr: { 'data-dev': 'tutorial-sobre' } });
    const tituloEl = sobreEl.createDiv({ cls: `${CLS}__secao-titulo` });
    const iconeEl = tituloEl.createSpan({ cls: `${CLS}__sobre-icone` });
    setIcon(iconeEl, 'heart-handshake');
    tituloEl.createSpan({ text: this.t('tutorial.sobre.titulo') });

    sobreEl.createEl('p', { text: traduzir(this.plugin.settings.idioma, 'tutorial.sobre.texto', { criador: NOME_CRIADOR }) });

    const linhaGithubEl = sobreEl.createDiv({ cls: `${CLS}__contato` });
    linhaGithubEl.createSpan({ cls: `${CLS}__rotulo`, text: 'GitHub' });
    linhaGithubEl.createEl('a', { text: URL_GITHUB_CRIADOR.replace('https://', ''), href: URL_GITHUB_CRIADOR, attr: { target: '_blank', rel: 'noopener' } });

    this.criarLinhaCopiavel(sobreEl, this.t('tutorial.sobre.sugestoes'), EMAIL_CONTATO, `mailto:${EMAIL_CONTATO}`);

    this.renderApoio(sobreEl);
  }

  // ==function== Cartão de apoio: Buy Me a Coffee para todos; Pix apenas para o idioma pt-BR
  renderApoio(container: HTMLElement): void {
    const apoioEl = container.createDiv({ cls: `${CLS}__apoio-bloco` });
    // Chamada para apoiar o projeto (todos os idiomas)
    apoioEl.createEl('p', { cls: `${CLS}__apoio ${CLS}__apoio-chamada`, text: this.t('tutorial.sobre.chamadaApoio') });

    const linhaCafeEl = apoioEl.createDiv({ cls: `${CLS}__contato` });
    linhaCafeEl.createSpan({ cls: `${CLS}__rotulo`, text: 'Buy Me a Coffee' });
    linhaCafeEl.createEl('a', {
      text: URL_BUYMEACOFFEE.replace('https://', ''),
      href: URL_BUYMEACOFFEE,
      attr: { target: '_blank', rel: 'noopener' }
    });

    if (this.plugin.settings.idioma === 'pt-BR') {
      apoioEl.createEl('p', { cls: `${CLS}__apoio`, text: this.t('tutorial.sobre.apoio') });
      this.criarLinhaCopiavel(apoioEl, this.t('tutorial.sobre.pix'), CHAVE_PIX, null, true);
    }
  }

  // ==function== Linha com rótulo, valor e botão de copiar
  private criarLinhaCopiavel(container: HTMLElement, rotulo: string, valor: string, href: string | null, monoespacado = false): void {
    const linhaEl = container.createDiv({ cls: `${CLS}__contato` });
    linhaEl.createSpan({ cls: `${CLS}__rotulo`, text: rotulo });

    const clsValor = `${CLS}__valor${monoespacado ? ` ${CLS}__valor--mono` : ''}`;
    if (href) {
      linhaEl.createEl('a', { cls: clsValor, text: valor, href });
    } else {
      linhaEl.createSpan({ cls: clsValor, text: valor });
    }

    const botaoCopiar = linhaEl.createEl('button', { cls: `${CLS}__copiar`, attr: { type: 'button', 'aria-label': this.t('tutorial.copiar') } });
    setIcon(botaoCopiar, 'copy');
    botaoCopiar.addEventListener('click', () => {
      void this.handleCopiar(valor);
    });
  }

  private async handleCopiar(valor: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(valor);
      new Notice(this.t('tutorial.copiado'), 2000);
    } catch {
      new Notice(valor, 6000);
    }
  }
}

// ==class== Modal "Sobre o projeto" aberto pelo botão do menu
export class ModalSobre extends Modal {
  private readonly plugin: GeminiAssistantR3Plugin;

  constructor(plugin: GeminiAssistantR3Plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    modalEl.addClass(`${CLS}-container`);
    contentEl.addClass(CLS);
    this.setTitle(traduzir(this.plugin.settings.idioma, 'tutorial.sobre.titulo'));
    new BlocoSobre(this.plugin).render(contentEl);

    const rodapeEl = contentEl.createDiv({ cls: `${CLS}__rodape` });
    new ButtonComponent(rodapeEl).setButtonText(traduzir(this.plugin.settings.idioma, 'tutorial.fechar')).onClick(() => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
