import { Setting } from 'obsidian';

import { traduzir } from '../../i18n';
import type { ChaveFormato, EstiloResposta } from '../../tipos/configuracoes';
import { criarDropdown, criarTituloSecao, type ContextoAba } from '../campos';
import { CHAVES_FORMATO, ESTILOS_RESPOSTA, PRESETS_ESTILO } from '../padroes';

// ==function== Seção "Estilo da resposta": preset + ajustes avançados (decisão 14)
export function criarSecaoFormatacao(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  criarTituloSecao(containerEl, ctx, 'config.formatacao.titulo');

  criarDropdown(containerEl, ctx, {
    nomeTraducao: 'config.estilo.nome',
    descricaoTraducao: 'config.estilo.descricao',
    opcoes: ESTILOS_RESPOSTA,
    rotular: (estilo) => traduzir(idioma, `config.estilo.opcao.${estilo}`),
    obterValor: () => plugin.settings.estiloResposta,
    aoMudar: async (estilo: EstiloResposta) => {
      plugin.settings.estiloResposta = estilo;
      if (estilo !== 'personalizado') {
        Object.assign(plugin.settings, PRESETS_ESTILO[estilo]);
      }
      await plugin.saveSettings();
      ctx.redesenhar();
    }
  });

  // ==section== Avançado: cada elemento individual; mudar um vira "Personalizado"
  criarTituloSecao(containerEl, ctx, 'config.formatoAvancado.titulo');
  for (const chave of CHAVES_FORMATO) {
    criarToggleFormato(containerEl, ctx, chave);
  }
}

function criarToggleFormato(containerEl: HTMLElement, ctx: ContextoAba, chave: ChaveFormato): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;

  new Setting(containerEl)
    .setName(traduzir(idioma, `config.${chave}.nome`))
    .setDesc(traduzir(idioma, `config.${chave}.descricao`))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings[chave]).onChange(async (valor) => {
        plugin.settings[chave] = valor;
        const estiloAnterior = plugin.settings.estiloResposta;
        plugin.settings.estiloResposta = 'personalizado';
        await plugin.saveSettings();
        if (estiloAnterior !== 'personalizado') {
          ctx.redesenhar();
        }
      });
    });
}
