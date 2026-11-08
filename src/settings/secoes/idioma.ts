import { obterRotuloIdioma } from '../../i18n';
import { criarDropdown, criarTituloSecao, type ContextoAba } from '../campos';
import { aplicarPromptsDoIdiomaNaConfiguracao, IDIOMAS_DISPONIVEIS, salvarPresetAtualDoIdioma } from '../padroes';

// ==function== Seção "Idioma": idioma global do plugin (interface, comandos e prompts padrão)
export function criarSecaoIdioma(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  criarTituloSecao(containerEl, ctx, 'config.idioma.titulo');

  criarDropdown(containerEl, ctx, {
    nomeTraducao: 'config.idioma.nome',
    descricaoTraducao: 'config.idioma.descricao',
    opcoes: IDIOMAS_DISPONIVEIS,
    rotular: (valor) => obterRotuloIdioma(idioma, valor),
    obterValor: () => plugin.settings.idioma,
    aoMudar: async (idiomaSelecionado) => {
      plugin.settings = salvarPresetAtualDoIdioma(plugin.settings, plugin.settings.idioma);
      plugin.settings = aplicarPromptsDoIdiomaNaConfiguracao(plugin.settings, idiomaSelecionado);
      await plugin.saveSettings();
      plugin.atualizarIdiomaGlobal();
      ctx.redesenhar();
    }
  });
}
