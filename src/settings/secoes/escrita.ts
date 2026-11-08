import { Setting } from 'obsidian';

import { obterRotuloObjetivo, obterRotuloPerfil, traduzir } from '../../i18n';
import { criarCampoNumero, criarDropdown, criarTituloSecao, criarToggle, type ContextoAba } from '../campos';
import { OBJETIVOS_DISPONIVEIS, PERFIS_DISPONIVEIS } from '../padroes';

// ==function== Seção "Escrita e conteúdo": objetivo, perfil e comportamento da geração
export function criarSecaoEscrita(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  criarTituloSecao(containerEl, ctx, 'config.escrita.titulo');

  criarDropdown(containerEl, ctx, {
    nomeTraducao: 'config.objetivo.nome',
    descricaoTraducao: 'config.objetivo.descricao',
    opcoes: OBJETIVOS_DISPONIVEIS,
    rotular: (valor) => obterRotuloObjetivo(idioma, valor),
    obterValor: () => plugin.settings.objetivoConteudo,
    aoMudar: async (valor) => {
      plugin.settings.objetivoConteudo = valor;
      await plugin.saveSettings();
    }
  });

  criarDropdown(containerEl, ctx, {
    nomeTraducao: 'config.perfil.nome',
    descricaoTraducao: 'config.perfil.descricao',
    opcoes: PERFIS_DISPONIVEIS,
    rotular: (valor) => obterRotuloPerfil(idioma, valor),
    obterValor: () => plugin.settings.perfilEscrita,
    aoMudar: async (valor) => {
      plugin.settings.perfilEscrita = valor;
      await plugin.saveSettings();
    }
  });

  criarCampoNumero(containerEl, ctx, {
    nomeTraducao: 'config.temperatura.nome',
    descricaoTraducao: 'config.temperatura.descricao',
    obterValor: () => plugin.settings.temperatura,
    aoMudar: (numero) => {
      plugin.settings.temperatura = Math.min(2, Math.max(0, numero));
    }
  });

  criarToggle(containerEl, ctx, 'config.streaming.nome', 'config.streaming.descricao', 'usarStreaming');

  criarCampoNumero(containerEl, ctx, {
    nomeTraducao: 'config.tokens.nome',
    descricaoTraducao: 'config.tokens.descricao',
    obterValor: () => plugin.settings.maxOutputTokens,
    aoMudar: (numero) => {
      plugin.settings.maxOutputTokens = Math.max(512, Math.floor(numero));
    }
  });

  criarToggle(containerEl, ctx, 'config.contexto.nome', 'config.contexto.descricao', 'incluirContextoNota');
  criarToggle(containerEl, ctx, 'config.removerTitulo.nome', 'config.removerTitulo.descricao', 'removeHeadlineEnabled');
  criarToggle(containerEl, ctx, 'config.preview.nome', 'config.preview.descricao', 'usarPreviewAntesInserir');

  // ==section== Faixas de palavras (os valores ficam em cada ação, mais abaixo); redesenha para atualizar as descrições
  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.controleTamanho.nome'))
    .setDesc(traduzir(idioma, 'config.controleTamanho.descricao'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.usarControleTamanho).onChange(async (valor) => {
        plugin.settings.usarControleTamanho = valor;
        await plugin.saveSettings();
        ctx.redesenhar();
      });
    });
}
