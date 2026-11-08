import type { Editor, Menu } from 'obsidian';

import { executarComando, executarDesfazer, exigeSelecao, obterDefinicaoComando } from '../comandos/editor-commands';
import { obterNomeComando, traduzir } from '../i18n';
import type GeminiAssistantR3Plugin from '../main';

// ==function== Adiciona as ações da IA ao clique direito do editor
export function preencherMenuContexto(plugin: GeminiAssistantR3Plugin, menu: Menu, editor: Editor): void {
  if (!plugin.settings.mostrarMenuContexto) {
    return;
  }

  const idioma = plugin.settings.idioma;
  const temSelecao = Boolean(editor.getSelection().trim());
  const ultimaAcao = plugin.obterUltimaAcaoExecutada();
  const deveMostrarDesfazer = plugin.contarGeracoesDaNotaAtiva() > 0;
  const estaGerando = plugin.existeGeracaoAtiva();

  // ==section== Abre a paleta completa
  menu.addItem((item) =>
    item
      .setSection('gemini-assistant-r3')
      .setTitle(traduzir(idioma, 'contexto.abrirPaleta'))
      .setIcon('sparkles')
      .setDisabled(estaGerando)
      .onClick(() => plugin.abrirPaletaAcoes(editor))
  );

  // ==section== Repetir última ação
  if (ultimaAcao) {
    menu.addItem((item) =>
      item
        .setSection('gemini-assistant-r3')
        .setTitle(traduzir(idioma, 'contexto.repetir', { acao: obterNomeComando(idioma, ultimaAcao.id) }))
        .setIcon('repeat')
        .setDisabled(estaGerando || (exigeSelecao(ultimaAcao) && !temSelecao))
        .onClick(() => void executarComando(plugin, editor, ultimaAcao))
    );
  }

  // ==section== Favoritos (até 5)
  for (const idFavorito of plugin.settings.acoesFavoritas.slice(0, 5)) {
    const definicao = obterDefinicaoComando(idFavorito);
    if (!definicao) {
      continue;
    }

    menu.addItem((item) =>
      item
        .setSection('gemini-assistant-r3')
        .setTitle(obterNomeComando(idioma, definicao.id))
        .setIcon('star')
        .setDisabled(estaGerando || (exigeSelecao(definicao) && !temSelecao))
        .onClick(() => void executarComando(plugin, editor, definicao))
    );
  }

  // ==section== Desfazer
  if (deveMostrarDesfazer) {
    menu.addItem((item) =>
      item
        .setSection('gemini-assistant-r3')
        .setTitle(traduzir(idioma, 'menu.item.desfazer'))
        .setIcon('undo-2')
        .onClick(() => executarDesfazer(plugin, editor))
    );
  }
}
