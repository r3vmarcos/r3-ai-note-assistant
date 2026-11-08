import { FuzzySuggestModal, setIcon, type Editor, type FuzzyMatch } from 'obsidian';

import { DEFINICOES_COMANDOS, executarComando, exigeSelecao, type DefinicaoComando } from '../comandos/editor-commands';
import { obterNomeComando, traduzir } from '../i18n';
import type GeminiAssistantR3Plugin from '../main';
import { obterGrupoMenu } from './menu-grupos';

// ==class== Paleta com busca fuzzy de todas as ações (comando e menu de contexto)
export class ModalPaletaAcoes extends FuzzySuggestModal<DefinicaoComando> {
  private readonly plugin: GeminiAssistantR3Plugin;
  private readonly editor: Editor;
  private readonly temSelecao: boolean;

  constructor(plugin: GeminiAssistantR3Plugin, editor: Editor) {
    super(plugin.app);
    this.plugin = plugin;
    this.editor = editor;
    this.temSelecao = Boolean(editor.getSelection().trim());
    this.setPlaceholder(traduzir(plugin.settings.idioma, 'menu.busca.placeholder'));
    this.modalEl.addClass('gemini-assistant-r3-paleta');
  }

  // ==function== Favoritos primeiro, depois a ordem padrão
  getItems(): DefinicaoComando[] {
    const favoritos = this.plugin.settings.acoesFavoritas;
    return [...DEFINICOES_COMANDOS].sort((a, b) => Number(favoritos.includes(b.id)) - Number(favoritos.includes(a.id)));
  }

  getItemText(definicao: DefinicaoComando): string {
    return obterNomeComando(this.plugin.settings.idioma, definicao.id);
  }

  renderSuggestion(item: FuzzyMatch<DefinicaoComando>, el: HTMLElement): void {
    const definicao = item.item;
    const grupo = obterGrupoMenu(definicao.grupo);
    const ehFavorito = this.plugin.settings.acoesFavoritas.includes(definicao.id);
    const estaIndisponivel = exigeSelecao(definicao) && !this.temSelecao;

    el.addClass('gemini-assistant-r3-paleta__item', `gemini-assistant-r3-flutuante__grupo--${definicao.grupo}`);
    el.toggleClass('gemini-assistant-r3-paleta__item--indisponivel', estaIndisponivel);

    const iconeEl = el.createSpan({ cls: 'gemini-assistant-r3-paleta__icone' });
    setIcon(iconeEl, ehFavorito ? 'star' : grupo.icone);
    el.createSpan({ cls: 'gemini-assistant-r3-paleta__texto', text: this.getItemText(definicao) });

    if (estaIndisponivel) {
      el.createSpan({ cls: 'gemini-assistant-r3-paleta__aviso', text: traduzir(this.plugin.settings.idioma, 'menu.requerSelecao.curto') });
    }
  }

  onChooseItem(definicao: DefinicaoComando): void {
    void executarComando(this.plugin, this.editor, definicao);
  }
}
