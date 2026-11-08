import { Setting, TextAreaComponent } from 'obsidian';

import { normalizarIdiomaTraducao } from '../../data/idiomas-traducao';
import { traduzir } from '../../i18n';
import type { ChavePrompt, ChaveTipoInsercao, IntencaoComFaixa } from '../../tipos/configuracoes';
import { criarCampoAtalho, criarCampoFaixaIntencao, criarCampoFator, criarCampoInsercao, criarTituloSecao, type ContextoAba } from '../campos';
import { NIVEIS_RESPOSTA } from '../padroes';
import { ORDEM_NIVEIS_RESUMIR } from '../../utils/resumo';

// ==types== Uma aba de ação nas configurações
export type IdSecaoAcao =
  | 'gerar'
  | 'resumir'
  | 'explicar'
  | 'expandir'
  | 'reescrever'
  | 'responder'
  | 'corrigir'
  | 'traduzir'
  | 'tabela'
  | 'diagrama'
  | 'perguntas'
  | 'tituloTags'
  | 'tom'
  | 'personalizado';

interface ConfigSecaoAcao {
  id: IdSecaoAcao;
  chavePrompt: ChavePrompt;
  chaveInsercao: ChaveTipoInsercao;
  faixa: IntencaoComFaixa | null;
  notaTamanho?: string;
  /** Sem campo de atalho (o prompt é compartilhado por várias ações, como os tons) */
  semAtalho?: boolean;
}

// ==data== Ordem das abas (igual à ordem do menu)
export const SECOES_ACOES: ConfigSecaoAcao[] = [
  { id: 'gerar', chavePrompt: 'promptGerar', chaveInsercao: 'insercaoGerar', faixa: 'gerar' },
  { id: 'resumir', chavePrompt: 'promptResumir', chaveInsercao: 'insercaoResumir', faixa: 'resumir' },
  { id: 'explicar', chavePrompt: 'promptExplicar', chaveInsercao: 'insercaoExplicar', faixa: 'explicar' },
  { id: 'expandir', chavePrompt: 'promptExpandir', chaveInsercao: 'insercaoExpandir', faixa: 'expandir' },
  { id: 'reescrever', chavePrompt: 'promptReescrever', chaveInsercao: 'insercaoReescrever', faixa: null, notaTamanho: 'config.acao.reescrever.tamanho' },
  { id: 'responder', chavePrompt: 'promptResponder', chaveInsercao: 'insercaoResponder', faixa: 'responder' },
  // Grupo Outros
  { id: 'corrigir', chavePrompt: 'promptCorrigir', chaveInsercao: 'insercaoCorrigir', faixa: null },
  { id: 'traduzir', chavePrompt: 'promptTraduzir', chaveInsercao: 'insercaoTraduzir', faixa: null },
  { id: 'tabela', chavePrompt: 'promptTabela', chaveInsercao: 'insercaoTabela', faixa: null },
  { id: 'diagrama', chavePrompt: 'promptDiagrama', chaveInsercao: 'insercaoDiagrama', faixa: null },
  { id: 'perguntas', chavePrompt: 'promptPerguntas', chaveInsercao: 'insercaoPerguntas', faixa: null },
  { id: 'tituloTags', chavePrompt: 'promptTituloTags', chaveInsercao: 'insercaoTituloTags', faixa: null },
  { id: 'tom', chavePrompt: 'promptTom', chaveInsercao: 'insercaoTom', faixa: null },
  { id: 'personalizado', chavePrompt: 'promptPersonalizado', chaveInsercao: 'insercaoPersonalizado', faixa: null }
];

// ==types== Atributo da barra de abas (alvo da rolagem vinda do ícone de engrenagem do menu)
export const ATRIBUTO_ABAS_ACOES = 'acoes-abas';

// ==types== Aba selecionada (permanece entre redesenhos da aba de configurações)
let abaAtiva: IdSecaoAcao = 'gerar';

// ==function== Define qual ação fica aberta na próxima renderização
export function definirAbaAtiva(id: IdSecaoAcao): void {
  abaAtiva = id;
}

// ==function== Abas por ação (uma cor sutil por ação) e o conteúdo da aba selecionada
export function criarSecoesAcoes(containerEl: HTMLElement, ctx: ContextoAba): void {
  const idioma = ctx.plugin.settings.idioma;
  criarTituloSecao(containerEl, ctx, 'config.ia.titulo');
  const introEl = containerEl.createDiv({ cls: 'gemini-assistant-r3-config-intro' });
  introEl.createEl('p', { text: traduzir(idioma, 'config.acoes.descricao') });

  const barraEl = containerEl.createDiv({
    cls: 'gemini-assistant-r3-abas-acoes',
    attr: { 'data-secao': ATRIBUTO_ABAS_ACOES, role: 'tablist' }
  });
  const conteudoEl = containerEl.createDiv({ cls: 'gemini-assistant-r3-abas-conteudo' });

  const desenhar = (): void => {
    barraEl.empty();
    conteudoEl.empty();

    for (const secao of SECOES_ACOES) {
      const ativa = secao.id === abaAtiva;
      const botao = barraEl.createEl('button', {
        cls: 'gemini-assistant-r3-aba-acao',
        text: traduzir(idioma, `config.acao.${secao.id}.titulo`),
        attr: { type: 'button', role: 'tab', 'aria-selected': String(ativa) }
      });
      botao.toggleClass('gemini-assistant-r3-aba-acao--ativa', ativa);
      botao.addEventListener('click', () => {
        abaAtiva = secao.id;
        desenhar();
      });
    }

    // No celular a barra rola na horizontal: mantém a aba selecionada visível depois de redesenhar
    const botaoAtivo = barraEl.querySelector<HTMLElement>('.gemini-assistant-r3-aba-acao--ativa');
    if (botaoAtivo) {
      const deslocamento = botaoAtivo.getBoundingClientRect().left - barraEl.getBoundingClientRect().left;
      barraEl.scrollLeft = deslocamento - (barraEl.clientWidth - botaoAtivo.offsetWidth) / 2;
    }

    const secaoAtiva = SECOES_ACOES.find((secao) => secao.id === abaAtiva) ?? SECOES_ACOES[0];
    if (secaoAtiva) {
      criarConteudoAcao(conteudoEl, ctx, secaoAtiva);
    }
  };

  desenhar();
}

// ==function== Conteúdo de uma aba: prompt, atalho, inserção e faixas por nível
function criarConteudoAcao(containerEl: HTMLElement, ctx: ContextoAba, secao: ConfigSecaoAcao): void {
  const idioma = ctx.plugin.settings.idioma;

  containerEl.createEl('p', { cls: 'setting-item-description gemini-assistant-r3-acao-descricao', text: traduzir(idioma, `config.acao.${secao.id}.descricao`) });

  criarCampoPromptAmplo(containerEl, ctx, secao.chavePrompt);
  if (!secao.semAtalho) {
    criarCampoAtalho(containerEl, ctx, secao.chavePrompt);
  }
  criarCampoInsercao(containerEl, ctx, secao.chaveInsercao, 'config.acao.insercao.nome', 'config.acao.insercao.descricao');

  // Traduzir: idioma de destino que o modal abre marcado (qualquer idioma, em inglês ou no próprio idioma)
  if (secao.id === 'traduzir') {
    new Setting(containerEl)
      .setName(traduzir(idioma, 'config.traduzir.idioma.nome'))
      .setDesc(traduzir(idioma, 'config.traduzir.idioma.descricao'))
      .addText((campo) => {
        campo
          .setPlaceholder('English')
          .setValue(normalizarIdiomaTraducao(ctx.plugin.settings.idiomaTraducao))
          .onChange(async (valor) => {
            ctx.plugin.settings.idiomaTraducao = normalizarIdiomaTraducao(valor);
            await ctx.plugin.saveSettings();
          });
      });
  }

  // ==section== Faixas por nível (ou nota de tamanho)
  if (secao.id === 'resumir') {
    // Resumir é calculado pela seleção: o usuário define o fator de cada nível
    for (const nivel of ORDEM_NIVEIS_RESUMIR) {
      criarCampoFator(containerEl, ctx, 'resumir', nivel);
    }
  } else if (secao.id === 'reescrever') {
    // Reescrever também é calculado pela seleção (sem nota de tamanho fixo)
    for (const nivel of NIVEIS_RESPOSTA) {
      criarCampoFator(containerEl, ctx, 'reescrever', nivel);
    }
  } else if (secao.faixa) {
    // Expandir: sempre com seleção, então só o fator de cada nível
    if (secao.id === 'expandir') {
      for (const nivel of NIVEIS_RESPOSTA) {
        criarCampoFator(containerEl, ctx, 'expandir', nivel);
      }
    } else {
      // Explicar: com seleção, fator; sem seleção, faixas de palavras
      if (secao.id === 'explicar') {
        for (const nivel of NIVEIS_RESPOSTA) {
          criarCampoFator(containerEl, ctx, 'explicar', nivel);
        }
      }
      for (const nivel of NIVEIS_RESPOSTA) {
        criarCampoFaixaIntencao(containerEl, ctx, secao.faixa, nivel);
      }
    }
  } else if (secao.notaTamanho) {
    containerEl.createDiv({ cls: 'setting-item-description gemini-assistant-r3-config-nota', text: traduzir(idioma, secao.notaTamanho) });
  }
}

// ==function== Caixa do prompt ocupando a largura toda, abaixo do nome e da descrição
function criarCampoPromptAmplo(containerEl: HTMLElement, ctx: ContextoAba, chave: ChavePrompt): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;

  const blocoEl = containerEl.createDiv({ cls: 'gemini-assistant-r3-prompt-amplo' });
  blocoEl.createDiv({ cls: 'gemini-assistant-r3-prompt-amplo__nome', text: traduzir(idioma, 'config.acao.prompt.nome') });
  blocoEl.createDiv({ cls: 'setting-item-description', text: traduzir(idioma, 'config.acao.prompt.descricao') });

  new TextAreaComponent(blocoEl)
    .setValue(plugin.settings[chave])
    .onChange(async (valor) => {
      plugin.settings[chave] = valor;
      await plugin.saveSettings();
    })
    .inputEl.addClass('gemini-assistant-r3-textarea-prompt');
}
