import { App, PluginSettingTab } from 'obsidian';

import type GeminiAssistantR3Plugin from '../main';
import type { ContextoAba } from './campos';
import { ATRIBUTO_ABAS_ACOES, criarSecoesAcoes, definirAbaAtiva, type IdSecaoAcao } from './secoes/acoes';
import { criarSecaoFormatacao } from './secoes/formatacao';
import { criarSecaoApoio } from './secoes/apoio';
import { criarSecaoEscrita } from './secoes/escrita';
import { criarSecaoGeral } from './secoes/geral';
import { criarSecaoIdioma } from './secoes/idioma';
import { criarSecaoMenu } from './secoes/menu';
import { criarSecaoModelos } from './secoes/modelos';
import { criarSecaoUtilitarios } from './secoes/utilitarios';

// ==function== Caixa com borda que agrupa os itens de um tema
function criarGrupo(containerEl: HTMLElement): HTMLElement {
  return containerEl.createDiv({ cls: 'gemini-assistant-r3-grupo' });
}

// ==types== Atributo da caixa "Modelos" (alvo da rolagem vinda do ícone de engrenagem do menu)
const ATRIBUTO_SECAO_MODELOS = 'modelos';

// ==types== Destino da rolagem pedida pelo menu da IA
type AlvoRolagem = 'modelos' | 'acoes';

// ==class== Aba de configurações (somente orquestra as seções)
export class AbaConfiguracoesGemini extends PluginSettingTab {
  private readonly plugin: GeminiAssistantR3Plugin;
  private secaoParaRolar: IdSecaoAcao | null = null;
  private alvoRolagem: AlvoRolagem | null = null;

  constructor(app: App, plugin: GeminiAssistantR3Plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // ==function== Pede para a próxima renderização rolar até a seção de uma ação
  definirSecaoParaRolar(secao: IdSecaoAcao | null): void {
    this.secaoParaRolar = secao;
    if (secao) {
      this.alvoRolagem = 'acoes';
    }
  }

  // ==function== Pede para a próxima renderização rolar até a caixa "Modelos"
  definirRolagemModelos(): void {
    this.alvoRolagem = 'modelos';
  }

  // ==function== Pede para a próxima renderização rolar até a caixa "CONFIGURAÇÕES DA I.A."
  definirRolagemAcoes(): void {
    this.alvoRolagem = 'acoes';
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const ctx: ContextoAba = { plugin: this.plugin, redesenhar: () => this.display() };
    if (this.secaoParaRolar) {
      definirAbaAtiva(this.secaoParaRolar);
    }

    // ==section== Cada tema fica numa caixa com borda
    criarSecaoIdioma(criarGrupo(containerEl), ctx);
    criarSecaoGeral(criarGrupo(containerEl), ctx);
    criarSecaoEscrita(criarGrupo(containerEl), ctx);
    const grupoModelos = criarGrupo(containerEl);
    grupoModelos.setAttr('data-secao', ATRIBUTO_SECAO_MODELOS);
    criarSecaoModelos(grupoModelos, ctx);
    criarSecaoFormatacao(criarGrupo(containerEl), ctx);
    criarSecoesAcoes(criarGrupo(containerEl), ctx);
    criarSecaoMenu(criarGrupo(containerEl), ctx);
    criarSecaoUtilitarios(criarGrupo(containerEl), ctx);
    criarSecaoApoio(criarGrupo(containerEl), ctx);

    this.rolarParaSecaoPendente();
  }

  private rolarParaSecaoPendente(): void {
    const alvoPedido = this.alvoRolagem;
    this.secaoParaRolar = null;
    this.alvoRolagem = null;
    if (!alvoPedido) {
      return;
    }

    const idAlvo = alvoPedido === 'modelos' ? ATRIBUTO_SECAO_MODELOS : ATRIBUTO_ABAS_ACOES;
    const alvo = this.containerEl.querySelector<HTMLElement>(`[data-secao="${idAlvo}"]`);
    if (!alvo) {
      return;
    }

    window.setTimeout(() => {
      alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
      alvo.addClass('gemini-assistant-r3-config-acao--destaque');
      window.setTimeout(() => alvo.removeClass('gemini-assistant-r3-config-acao--destaque'), 1800);
    }, 60);
  }
}
