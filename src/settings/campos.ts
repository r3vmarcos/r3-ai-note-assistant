import { Setting } from 'obsidian';

import { obterRotuloInsercao, traduzir } from '../i18n';
import type GeminiAssistantR3Plugin from '../main';
import type { ChavePrompt, ChaveTipoInsercao, ConfiguracoesPlugin, IntencaoComFaixa, NivelResposta } from '../tipos/configuracoes';
import { validarAtalho } from '../utils/atalhos';
import { converterInteiro, ehOpcaoValida } from '../utils/validacao';
import { TIPOS_INSERCAO_DISPONIVEIS } from './padroes';
import { fatorDoNivel, type GrupoComAlvoPorSelecao } from '../utils/resumo';

// ==types== Contexto compartilhado pelas seções da aba
export interface ContextoAba {
  plugin: GeminiAssistantR3Plugin;
  redesenhar: () => void;
}

// ==types== Chaves agrupadas por tipo de valor
type ChaveBooleana = { [K in keyof ConfiguracoesPlugin]: ConfiguracoesPlugin[K] extends boolean ? K : never }[keyof ConfiguracoesPlugin];

// ==function== Título de seção
export function criarTituloSecao(containerEl: HTMLElement, ctx: ContextoAba, chaveTraducao: string): void {
  new Setting(containerEl).setName(traduzir(ctx.plugin.settings.idioma, chaveTraducao)).setHeading();
}

// ==function== Toggle ligado a uma chave booleana
export function criarToggle(
  containerEl: HTMLElement,
  ctx: ContextoAba,
  nomeTraducao: string,
  descricaoTraducao: string,
  chave: ChaveBooleana,
  recarregarBotao = false
): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;

  new Setting(containerEl)
    .setName(traduzir(idioma, nomeTraducao))
    .setDesc(traduzir(idioma, descricaoTraducao))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings[chave]).onChange(async (valor) => {
        plugin.settings[chave] = valor;
        await plugin.saveSettings();
        if (recarregarBotao) {
          plugin.recarregarBotaoFlutuante();
        }
      });
    });
}

// ==function== Dropdown genérico com validação de opção
export function criarDropdown<T extends string>(
  containerEl: HTMLElement,
  ctx: ContextoAba,
  config: {
    nomeTraducao: string;
    descricaoTraducao: string;
    opcoes: readonly T[];
    rotular: (opcao: T) => string;
    obterValor: () => T;
    aoMudar: (valor: T) => void | Promise<void>;
  }
): void {
  const idioma = ctx.plugin.settings.idioma;

  new Setting(containerEl)
    .setName(traduzir(idioma, config.nomeTraducao))
    .setDesc(traduzir(idioma, config.descricaoTraducao))
    .addDropdown((dropdown) => {
      for (const opcao of config.opcoes) {
        dropdown.addOption(opcao, config.rotular(opcao));
      }

      dropdown.setValue(config.obterValor()).onChange(async (valor) => {
        if (ehOpcaoValida(config.opcoes, valor)) {
          await config.aoMudar(valor);
        }
      });
    });
}

// ==function== Seletor do tipo de inserção
export function criarCampoInsercao(containerEl: HTMLElement, ctx: ContextoAba, chave: ChaveTipoInsercao, nomeTraducao: string, descricaoTraducao: string): void {
  const { plugin } = ctx;

  criarDropdown(containerEl, ctx, {
    nomeTraducao,
    descricaoTraducao,
    opcoes: TIPOS_INSERCAO_DISPONIVEIS,
    rotular: (tipo) => obterRotuloInsercao(plugin.settings.idioma, tipo),
    obterValor: () => plugin.settings[chave],
    aoMudar: async (valor) => {
      plugin.settings[chave] = valor;
      await plugin.saveSettings();
    }
  });
}

// ==function== Campo numérico simples (com limites)
export function criarCampoNumero(
  containerEl: HTMLElement,
  ctx: ContextoAba,
  config: { nomeTraducao: string; descricaoTraducao: string; obterValor: () => number; aoMudar: (valor: number) => void }
): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;

  new Setting(containerEl)
    .setName(traduzir(idioma, config.nomeTraducao))
    .setDesc(traduzir(idioma, config.descricaoTraducao))
    .addText((campo) => {
      campo.setValue(String(config.obterValor())).onChange(async (valor) => {
        const numero = Number(valor);
        if (!Number.isFinite(numero)) {
          return;
        }
        config.aoMudar(numero);
        await plugin.saveSettings();
      });
    });
}

// ==function== Faixa mínima/máxima de palavras de uma ação em um nível
export function criarCampoFaixaIntencao(containerEl: HTMLElement, ctx: ContextoAba, intencao: IntencaoComFaixa, nivel: NivelResposta): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  const faixa = plugin.settings.faixasPalavras[intencao][nivel];
  const descricao = plugin.settings.usarControleTamanho ? traduzir(idioma, 'config.faixa.descricao') : traduzir(idioma, 'config.faixa.desligada');

  const handleMudanca = async (campo: 'min' | 'max', valor: string): Promise<void> => {
    const numero = converterInteiro(valor);
    if (numero === null) {
      return;
    }
    plugin.settings.faixasPalavras[intencao][nivel][campo] = numero;
    await plugin.saveSettings();
  };

  new Setting(containerEl)
    .setName(traduzir(idioma, `config.nivel.${nivel}`))
    .setDesc(descricao)
    .addText((campo) => {
      campo.inputEl.type = 'number';
      campo.inputEl.addClass('gemini-assistant-r3-campo-numero');
      campo.setPlaceholder(traduzir(idioma, 'config.tamanho.min')).setValue(String(faixa.min)).onChange((valor) => handleMudanca('min', valor));
    })
    .addText((campo) => {
      campo.inputEl.type = 'number';
      campo.inputEl.addClass('gemini-assistant-r3-campo-numero');
      campo.setPlaceholder(traduzir(idioma, 'config.tamanho.max')).setValue(String(faixa.max)).onChange((valor) => handleMudanca('max', valor));
    });
}

// ==function== Fator do Resumir por nível: tamanho do resumo em relação à seleção (0.8 = 80%)
export function criarCampoFator(containerEl: HTMLElement, ctx: ContextoAba, grupo: GrupoComAlvoPorSelecao, nivel: NivelResposta): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;

  new Setting(containerEl)
    .setName(traduzir(idioma, `menu.acao.${grupo}-${nivel}`))
    .setDesc(traduzir(idioma, 'config.fator.descricao'))
    .addText((campo) => {
      campo.inputEl.type = 'number';
      campo.inputEl.step = '0.05';
      campo.inputEl.addClass('gemini-assistant-r3-campo-numero');
      campo.setValue(String(fatorDoNivel(plugin.settings, grupo, nivel))).onChange(async (valor) => {
        const numero = Number(valor);
        if (!Number.isFinite(numero) || numero <= 0) {
          return;
        }
        // Resumir reduz (fração até 1); Explicar e Expandir ampliam (múltiplo até 10)
        const fatores = grupo === 'resumir'
          ? plugin.settings.fatoresResumo
          : grupo === 'expandir'
            ? plugin.settings.fatoresExpandir
            : grupo === 'reescrever' ? plugin.settings.fatoresReescrever : plugin.settings.fatoresExplicar;
        fatores[nivel] = Math.min(grupo === 'resumir' ? 1 : 10, numero);
        await plugin.saveSettings();
      });
    });
}

// ==function== Atalho de teclado da ação (com validação de modificador)
export function criarCampoAtalho(containerEl: HTMLElement, ctx: ContextoAba, chave: ChavePrompt): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;

  const descricaoAtalho = traduzir(idioma, 'config.promptAtalho.descricao');
  const settingAtalho = new Setting(containerEl).setName(traduzir(idioma, 'config.promptAtalho.nome')).setDesc(descricaoAtalho);

  settingAtalho.addText((campo) => {
    campo
      .setPlaceholder(traduzir(idioma, 'config.promptAtalho.placeholder'))
      .setValue(plugin.settings.atalhosPrompts[chave] ?? '')
      .onChange(async (valor) => {
        const atalhoValido = validarAtalho(valor);
        campo.inputEl.toggleClass('gemini-assistant-r3-campo-invalido', !atalhoValido);
        settingAtalho.setDesc(atalhoValido ? descricaoAtalho : traduzir(idioma, 'config.promptAtalho.invalido'));

        if (!atalhoValido) {
          return;
        }

        plugin.settings.atalhosPrompts = { ...plugin.settings.atalhosPrompts, [chave]: valor.trim() };
        await plugin.saveSettings();
        plugin.recarregarBotaoFlutuante();
      });
  });
}
