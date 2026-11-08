import { ButtonComponent, Modal, setIcon } from 'obsidian';

import { URL_CRIAR_CHAVE_API } from '../data/sobre';
import { BlocoSobre } from './bloco-sobre';
import { traduzir } from '../i18n';
import type GeminiAssistantR3Plugin from '../main';

// ==style== Prefixo de classes do modal
const CLS = 'gemini-assistant-r3-tutorial';

// ==data== Intenções explicadas no tutorial (ícone + chave de texto)
const INTENCOES_TUTORIAL: { icone: string; chave: string }[] = [
  { icone: 'pen-line', chave: 'gerar' },
  { icone: 'list', chave: 'resumir' },
  { icone: 'lightbulb', chave: 'explicar' },
  { icone: 'maximize-2', chave: 'expandir' },
  { icone: 'shuffle', chave: 'reescrever' },
  { icone: 'message-circle', chave: 'responder' }
];

// ==class== Modal com o passo a passo do plugin e a seção "Sobre"
export class ModalTutorial extends Modal {
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
    this.setTitle(this.t('tutorial.titulo'));

    contentEl.createEl('p', { cls: `${CLS}__intro`, text: this.t('tutorial.intro') });

    this.criarPassoChave(contentEl);
    this.criarPassoConfigurar(contentEl);
    this.criarPassoUsar(contentEl);
    this.criarIntencoes(contentEl);
    this.criarDicas(contentEl);
    this.criarPrivacidade(contentEl);
    new BlocoSobre(this.plugin).render(contentEl);

    // ==button== Fechar
    const rodapeEl = contentEl.createDiv({ cls: `${CLS}__rodape` });
    new ButtonComponent(rodapeEl).setButtonText(this.t('tutorial.fechar')).onClick(() => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private t(chave: string): string {
    return traduzir(this.plugin.settings.idioma, chave);
  }

  // ==function== Cabeçalho de uma etapa numerada
  private criarSecao(container: HTMLElement, numero: string | null, chaveTitulo: string, dataDev: string): HTMLElement {
    const secaoEl = container.createDiv({ cls: `${CLS}__secao`, attr: { 'data-dev': dataDev } });
    const tituloEl = secaoEl.createDiv({ cls: `${CLS}__secao-titulo` });
    if (numero) {
      tituloEl.createSpan({ cls: `${CLS}__numero`, text: numero });
    }
    tituloEl.createSpan({ text: this.t(chaveTitulo) });
    return secaoEl;
  }

  // ==section== Passo 1: criar a chave
  private criarPassoChave(container: HTMLElement): void {
    const secaoEl = this.criarSecao(container, '1', 'tutorial.chave.titulo', 'tutorial-chave');
    secaoEl.createEl('p', { text: this.t('tutorial.chave.texto') });

    const acoesEl = secaoEl.createDiv({ cls: `${CLS}__acoes` });
    new ButtonComponent(acoesEl)
      .setCta()
      .setIcon('key-round')
      .setButtonText(this.t('tutorial.chave.botao'))
      .onClick(() => {
        activeWindow.open(URL_CRIAR_CHAVE_API);
      });
    acoesEl.createEl('a', { cls: `${CLS}__link`, text: URL_CRIAR_CHAVE_API, href: URL_CRIAR_CHAVE_API, attr: { target: '_blank', rel: 'noopener' } });
  }

  // ==section== Passo 2: colar a chave
  private criarPassoConfigurar(container: HTMLElement): void {
    const secaoEl = this.criarSecao(container, '2', 'tutorial.configurar.titulo', 'tutorial-configurar');
    secaoEl.createEl('p', { text: this.t('tutorial.configurar.texto') });
  }

  // ==section== Passo 3: usar na nota
  private criarPassoUsar(container: HTMLElement): void {
    const secaoEl = this.criarSecao(container, '3', 'tutorial.usar.titulo', 'tutorial-usar');
    const listaEl = secaoEl.createEl('ul', { cls: `${CLS}__lista` });
    for (const indice of [1, 2, 3, 4]) {
      listaEl.createEl('li', { text: this.t(`tutorial.usar.item${indice}`) });
    }
  }

  // ==section== O que cada intenção faz + níveis
  private criarIntencoes(container: HTMLElement): void {
    const secaoEl = this.criarSecao(container, null, 'tutorial.intencoes.titulo', 'tutorial-intencoes');
    const gradeEl = secaoEl.createDiv({ cls: `${CLS}__grade` });

    for (const intencao of INTENCOES_TUTORIAL) {
      const itemEl = gradeEl.createDiv({ cls: `${CLS}__intencao gemini-assistant-r3-flutuante__grupo--${intencao.chave}` });
      const iconeEl = itemEl.createSpan({ cls: `${CLS}__intencao-icone` });
      setIcon(iconeEl, intencao.icone);
      const textosEl = itemEl.createDiv({ cls: `${CLS}__intencao-textos` });
      textosEl.createEl('strong', { text: this.t(`menu.grupo.${intencao.chave}`) });
      textosEl.createSpan({ text: this.t(`tutorial.intencao.${intencao.chave}`) });
    }

    secaoEl.createEl('p', { cls: `${CLS}__nota`, text: this.t('tutorial.niveis') });
  }

  // ==section== Dicas rápidas
  private criarDicas(container: HTMLElement): void {
    const secaoEl = this.criarSecao(container, null, 'tutorial.dicas.titulo', 'tutorial-dicas');
    const listaEl = secaoEl.createEl('ul', { cls: `${CLS}__lista` });
    for (const indice of [1, 2, 3, 4, 5]) {
      listaEl.createEl('li', { text: this.t(`tutorial.dicas.item${indice}`) });
    }
  }

  // ==section== Privacidade
  private criarPrivacidade(container: HTMLElement): void {
    const secaoEl = this.criarSecao(container, null, 'tutorial.privacidade.titulo', 'tutorial-privacidade');
    secaoEl.createEl('p', { text: this.t('tutorial.privacidade.texto') });
  }
}
