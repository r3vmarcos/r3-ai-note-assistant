import { Setting, type ButtonComponent } from 'obsidian';

import { obterRotuloModelo, traduzir } from '../../i18n';
import { obterModeloPrincipalEfetivo, obterOrdemBase, ordemEhPersonalizada, ordenarPorVelocidade, usaOrdemPorVelocidade } from '../../servicos/ordem-modelos';
import { limparPausas, listarPausas } from '../../servicos/pausa-modelos';
import { executarTesteVelocidade, finalizarResumoTeste } from '../../servicos/teste-velocidade';
import type { ConfiguracoesPlugin, ModeloGeminiDisponivel, ResultadoVelocidadeModelo } from '../../tipos/configuracoes';
import { criarNoticeProgresso, mostrarNoticeTemporario } from '../../utils/notice';
import { criarTituloSecao, criarToggle, type ContextoAba } from '../campos';
import { MODELOS_GEMINI_DISPONIVEIS } from '../padroes';

// ==types== Valor do seletor que significa "usar o modelo mais rápido do teste"
const VALOR_MAIS_RAPIDO = 'mais-rapido';

// ==function== Seção de modelos: principal, ordem do fallback, teste de velocidade e pausas
export function criarSecaoModelos(containerEl: HTMLElement, ctx: ContextoAba): void {
  criarTituloSecao(containerEl, ctx, 'config.modelos.titulo');
  criarSeletorPrincipal(containerEl, ctx);
  criarToggle(containerEl, ctx, 'config.fallback.nome', 'config.fallback.descricao', 'usarFallbackAutomatico');
  renderizarOrdem(containerEl, ctx);
  criarBotaoTesteVelocidade(containerEl, ctx);
  renderizarResultados(containerEl, ctx);
  renderizarPausas(containerEl, ctx);
}

// ==function== Seletor do modelo principal, com "Modelo mais rápido" como padrão
function criarSeletorPrincipal(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  const configuracoes = plugin.settings;
  const principalEfetivo = obterModeloPrincipalEfetivo(configuracoes);

  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.modeloPrincipal.nome'))
    .setDesc(descreverPrincipal(configuracoes, principalEfetivo))
    .addDropdown((dropdown) => {
      dropdown.addOption(VALOR_MAIS_RAPIDO, traduzir(idioma, 'config.modeloPrincipal.maisRapido'));
      for (const modelo of MODELOS_GEMINI_DISPONIVEIS) {
        dropdown.addOption(modelo, obterRotuloModelo(idioma, modelo));
      }

      dropdown.setValue(configuracoes.usarModeloMaisRapido ? VALOR_MAIS_RAPIDO : configuracoes.modeloPrincipal).onChange(async (valor) => {
        if (valor === VALOR_MAIS_RAPIDO) {
          configuracoes.usarModeloMaisRapido = true;
        } else if (MODELOS_GEMINI_DISPONIVEIS.some((modelo) => modelo === valor)) {
          configuracoes.usarModeloMaisRapido = false;
          configuracoes.modeloPrincipal = valor as ModeloGeminiDisponivel;
        } else {
          return;
        }

        await plugin.saveSettings();
        plugin.recarregarBotaoFlutuante();
        ctx.redesenhar();
      });
    });
}

// ==function== Texto de apoio do seletor principal, conforme o modo atual
function descreverPrincipal(configuracoes: ConfiguracoesPlugin, principalEfetivo: ModeloGeminiDisponivel): string {
  const idioma = configuracoes.idioma;
  if (usaOrdemPorVelocidade(configuracoes)) {
    return traduzir(idioma, 'config.modeloPrincipal.porVelocidade', { modelo: obterRotuloModelo(idioma, principalEfetivo) });
  }
  if (configuracoes.usarModeloMaisRapido) {
    return traduzir(idioma, 'config.modeloPrincipal.semTeste', { modelo: obterRotuloModelo(idioma, principalEfetivo) });
  }
  return traduzir(idioma, 'config.modeloPrincipal.descricao');
}

// ==function== Lista da cadeia de fallback, com setas para o usuário mudar a ordem
function renderizarOrdem(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  const personalizada = ordemEhPersonalizada(plugin.settings);
  const principal = obterModeloPrincipalEfetivo(plugin.settings);
  const cadeia: ModeloGeminiDisponivel[] = [principal, ...obterOrdemBase(plugin.settings).filter((modelo) => modelo !== principal)];

  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.ordem.nome'))
    .setDesc(traduzir(idioma, personalizada ? 'config.ordem.personalizada' : 'config.ordem.automatica'))
    .addButton((botao) => {
      botao
        .setButtonText(traduzir(idioma, 'config.ordem.restaurar'))
        .setDisabled(!personalizada)
        .onClick(async () => {
          plugin.settings.ordemModelos = [];
          await plugin.saveSettings();
          ctx.redesenhar();
        });
    });

  for (const [indice, modelo] of cadeia.entries()) {
    const rotulo = indice === 0 ? `${obterRotuloModelo(idioma, modelo)} · ${traduzir(idioma, 'config.velocidade.principal')}` : obterRotuloModelo(idioma, modelo);
    const linha = new Setting(containerEl).setName(`${indice + 1}. ${rotulo}`);
    if (indice === 0) {
      continue;
    }

    linha
      .addExtraButton((botao) => {
        botao
          .setIcon('arrow-up')
          .setTooltip(traduzir(idioma, 'config.ordem.subir'))
          .setDisabled(indice === 1)
          .onClick(() => void moverModelo(ctx, cadeia, indice, -1));
      })
      .addExtraButton((botao) => {
        botao
          .setIcon('arrow-down')
          .setTooltip(traduzir(idioma, 'config.ordem.descer'))
          .setDisabled(indice === cadeia.length - 1)
          .onClick(() => void moverModelo(ctx, cadeia, indice, 1));
      });
  }
}

// ==function== Troca a posição de um modelo da cadeia (o principal nunca sai do topo)
async function moverModelo(ctx: ContextoAba, cadeia: ModeloGeminiDisponivel[], indice: number, deslocamento: number): Promise<void> {
  const destino = indice + deslocamento;
  if (destino < 1 || destino >= cadeia.length) {
    return;
  }

  const novaOrdem = [...cadeia];
  const atual = novaOrdem[indice];
  const vizinho = novaOrdem[destino];
  if (!atual || !vizinho) {
    return;
  }
  novaOrdem[indice] = vizinho;
  novaOrdem[destino] = atual;
  ctx.plugin.settings.ordemModelos = novaOrdem;
  await ctx.plugin.saveSettings();
  ctx.redesenhar();
}

// ==function== Botão de teste de velocidade (também roda sozinho ao validar a chave)
function criarBotaoTesteVelocidade(containerEl: HTMLElement, ctx: ContextoAba): void {
  const idioma = ctx.plugin.settings.idioma;
  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.velocidade.nome'))
    .setDesc(traduzir(idioma, 'config.velocidade.descricao', { quantidade: MODELOS_GEMINI_DISPONIVEIS.length }))
    .addButton((botao) => {
      botao
        .setCta()
        .setButtonText(traduzir(idioma, 'config.velocidade.botao'))
        .onClick(() => {
          void handleTestarVelocidade(ctx, botao);
        });
    });
}

// ==function== Testa os modelos com notice de progresso e atualiza a tela ao final
async function handleTestarVelocidade(ctx: ContextoAba, botao: ButtonComponent): Promise<void> {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;

  if (!plugin.settings.apiKey.trim()) {
    mostrarNoticeTemporario(traduzir(idioma, 'servico.semApiKey'));
    return;
  }

  const notice = criarNoticeProgresso(traduzir(idioma, 'config.velocidade.iniciando'));
  botao.setDisabled(true);

  try {
    const resultados = await executarTesteVelocidade(plugin, (atual, total, modelo) => {
      botao.setButtonText(`${atual}/${total}…`);
      notice.setMessage(traduzir(idioma, 'config.velocidade.progresso', { atual, total, modelo: obterRotuloModelo(idioma, modelo) }));
    });
    finalizarResumoTeste(idioma, notice, resultados);
  } finally {
    botao.setDisabled(false);
  }

  ctx.redesenhar();
}

// ==function== Tabela com o ranking do último teste
function renderizarResultados(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  const resultados = plugin.settings.resultadosVelocidade;
  const blocoEl = containerEl.createDiv({ cls: 'gemini-assistant-r3-velocidade', attr: { 'data-dev': 'config-velocidade' } });

  if (resultados.length === 0) {
    blocoEl.createDiv({ cls: 'gemini-assistant-r3-velocidade__vazio', text: traduzir(idioma, 'config.velocidade.vazio') });
    return;
  }

  const ordem = ordenarPorVelocidade(resultados);
  const maisLento = Math.max(...resultados.map((resultado) => resultado.ms ?? 0), 1);
  const principal = obterModeloPrincipalEfetivo(plugin.settings);

  if (plugin.settings.testeVelocidadeEm) {
    const data = new Date(plugin.settings.testeVelocidadeEm).toLocaleString(idioma === 'pt-BR' ? 'pt-BR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
    blocoEl.createDiv({ cls: 'gemini-assistant-r3-velocidade__data', text: traduzir(idioma, 'config.velocidade.data', { data }) });
  }

  const tabelaEl = blocoEl.createEl('table', { cls: 'gemini-assistant-r3-velocidade__tabela' });
  for (const [indice, modelo] of ordem.entries()) {
    const resultado = resultados.find((item: ResultadoVelocidadeModelo) => item.modelo === modelo);
    const linhaEl = tabelaEl.createEl('tr');
    linhaEl.toggleClass('gemini-assistant-r3-velocidade__linha--falha', !resultado?.ok);
    linhaEl.toggleClass('gemini-assistant-r3-velocidade__linha--principal', modelo === principal);

    linhaEl.createEl('td', { cls: 'gemini-assistant-r3-velocidade__posicao', text: resultado?.ok ? String(indice + 1) : '—' });
    const nomeEl = linhaEl.createEl('td', { cls: 'gemini-assistant-r3-velocidade__modelo', text: obterRotuloModelo(idioma, modelo) });
    if (modelo === principal) {
      nomeEl.createSpan({ cls: 'gemini-assistant-r3-velocidade__selo', text: traduzir(idioma, 'config.velocidade.principal') });
    }

    const barraTd = linhaEl.createEl('td', { cls: 'gemini-assistant-r3-velocidade__barra-celula' });
    if (resultado?.ok && resultado.ms !== null) {
      const barraEl = barraTd.createDiv({ cls: 'gemini-assistant-r3-velocidade__barra' });
      barraEl.setCssProps({ '--gar3-largura-barra': `${Math.max(6, Math.round((resultado.ms / maisLento) * 100))}%` });
    }

    const tempo = resultado?.ok && resultado.ms !== null
      ? `${(resultado.ms / 1000).toFixed(1)} s`
      : resultado?.tempoEsgotado
        ? traduzir(idioma, 'config.velocidade.tempoEsgotado')
        : resultado
          ? traduzir(idioma, 'config.velocidade.falhou', { status: resultado.status ?? '?' })
          : traduzir(idioma, 'config.velocidade.naoTestado');
    linhaEl.createEl('td', { cls: 'gemini-assistant-r3-velocidade__tempo', text: tempo });
  }
}

// ==function== Modelos pausados após erro (429, 5xx, 403/404)
function renderizarPausas(containerEl: HTMLElement, ctx: ContextoAba): void {
  const idioma = ctx.plugin.settings.idioma;
  const pausas = listarPausas();
  const descricaoPausas =
    pausas.length === 0
      ? traduzir(idioma, 'config.pausas.vazio')
      : pausas
          .map((pausa) => traduzir(idioma, 'config.pausas.item', { modelo: obterRotuloModelo(idioma, pausa.modelo), status: pausa.status, minutos: pausa.minutosRestantes }))
          .join(' · ');

  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.pausas.nome'))
    .setDesc(descricaoPausas)
    .addButton((botao) => {
      botao
        .setButtonText(traduzir(idioma, 'config.pausas.botao'))
        .setDisabled(pausas.length === 0)
        .onClick(() => {
          limparPausas();
          mostrarNoticeTemporario(traduzir(idioma, 'config.pausas.liberados'));
          ctx.redesenhar();
        });
    });
}
