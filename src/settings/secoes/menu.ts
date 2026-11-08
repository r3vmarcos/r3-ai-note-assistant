import { obterRotuloPosicao, obterRotuloTamanhoBotao, traduzir } from '../../i18n';
import { criarDropdown, criarTituloSecao, criarToggle, type ContextoAba } from '../campos';
import { GRUPOS_PADRAO_DISPONIVEIS, POSICOES_BOTAO_DISPONIVEIS, TAMANHOS_BOTAO_DISPONIVEIS } from '../padroes';

// ==function== Seção do botão flutuante, menu da IA e menu de contexto
export function criarSecaoMenu(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  criarTituloSecao(containerEl, ctx, 'config.menu.titulo');

  criarDropdown(containerEl, ctx, {
    nomeTraducao: 'config.posicao.nome',
    descricaoTraducao: 'config.posicao.descricao',
    opcoes: POSICOES_BOTAO_DISPONIVEIS,
    rotular: (valor) => obterRotuloPosicao(idioma, valor),
    obterValor: () => plugin.settings.posicaoBotaoFlutuante,
    aoMudar: async (valor) => {
      plugin.settings.posicaoBotaoFlutuante = valor;
      await plugin.saveSettings();
      plugin.recarregarBotaoFlutuante();
    }
  });

  criarDropdown(containerEl, ctx, {
    nomeTraducao: 'config.tamanhoBotao.nome',
    descricaoTraducao: 'config.tamanhoBotao.descricao',
    opcoes: TAMANHOS_BOTAO_DISPONIVEIS,
    rotular: (valor) => obterRotuloTamanhoBotao(idioma, valor),
    obterValor: () => plugin.settings.tamanhoBotaoFlutuante,
    aoMudar: async (valor) => {
      plugin.settings.tamanhoBotaoFlutuante = valor;
      await plugin.saveSettings();
      plugin.recarregarBotaoFlutuante();
    }
  });

  criarToggle(containerEl, ctx, 'config.botaoTexto.nome', 'config.botaoTexto.descricao', 'exibirTextoBotaoFlutuante', true);
  criarToggle(containerEl, ctx, 'config.indicadorModelo.nome', 'config.indicadorModelo.descricao', 'mostrarIndicadorModelo', true);

  criarDropdown(containerEl, ctx, {
    nomeTraducao: 'config.grupoPadrao.nome',
    descricaoTraducao: 'config.grupoPadrao.descricao',
    opcoes: GRUPOS_PADRAO_DISPONIVEIS,
    rotular: (valor) => traduzir(idioma, `config.grupoPadrao.opcao.${valor}`),
    obterValor: () => plugin.settings.grupoPadraoMenu,
    aoMudar: async (valor) => {
      plugin.settings.grupoPadraoMenu = valor;
      await plugin.saveSettings();
    }
  });

  criarToggle(containerEl, ctx, 'config.menuContexto.nome', 'config.menuContexto.descricao', 'mostrarMenuContexto');
}
