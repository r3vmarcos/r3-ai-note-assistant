import { Setting } from 'obsidian';

import { traduzir } from '../../i18n';
import { mostrarNoticeTemporario } from '../../utils/notice';
import { criarTituloSecao, type ContextoAba } from '../campos';
import { aplicarPromptsDoIdiomaNaConfiguracao, clonarFaixasPadrao, salvarPresetAtualDoIdioma } from '../padroes';

// ==function== Presets por idioma, restauração e explicação dos atalhos
export function criarSecaoUtilitarios(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  criarTituloSecao(containerEl, ctx, 'config.utilitarios.titulo');

  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.presets.salvar.nome'))
    .setDesc(traduzir(idioma, 'config.presets.salvar.descricao'))
    .addButton((botao) => {
      botao.setButtonText(traduzir(idioma, 'config.presets.salvar.botao')).onClick(async () => {
        plugin.settings = salvarPresetAtualDoIdioma(plugin.settings, plugin.settings.idioma);
        await plugin.saveSettings();
        mostrarNoticeTemporario(traduzir(plugin.settings.idioma, 'notice.presetSalvo'));
      });
    });

  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.restaurar.nome'))
    .setDesc(traduzir(idioma, 'config.restaurar.descricao'))
    .addButton((botao) => {
      botao.setButtonText(traduzir(idioma, 'config.restaurar.botao')).onClick(async () => {
        plugin.settings = aplicarPromptsDoIdiomaNaConfiguracao(plugin.settings, plugin.settings.idioma);
        await plugin.saveSettings();
        mostrarNoticeTemporario(traduzir(plugin.settings.idioma, 'notice.promptsRestaurados'));
        ctx.redesenhar();
      });
    });

  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.restaurarFaixas.nome'))
    .setDesc(traduzir(idioma, 'config.restaurarFaixas.descricao'))
    .addButton((botao) => {
      botao.setButtonText(traduzir(idioma, 'config.restaurarFaixas.botao')).onClick(async () => {
        plugin.settings.faixasPalavras = clonarFaixasPadrao();
        await plugin.saveSettings();
        mostrarNoticeTemporario(traduzir(plugin.settings.idioma, 'config.restaurarFaixas.ok'));
        ctx.redesenhar();
      });
    });

  containerEl.createDiv({ cls: 'setting-item-description gemini-assistant-r3-config-nota', text: traduzir(idioma, 'config.hotkeys.descricao') });
}
