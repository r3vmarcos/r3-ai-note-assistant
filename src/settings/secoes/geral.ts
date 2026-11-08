import { Setting } from 'obsidian';

import { executarTesteConexao } from '../../comandos/editor-commands';
import { URL_CRIAR_CHAVE_API } from '../../data/sobre';
import { traduzir } from '../../i18n';
import { criarTituloSecao, type ContextoAba } from '../campos';

// ==function== Seção "Configurações do Gemini": instruções, chave da API e validação
export function criarSecaoGeral(containerEl: HTMLElement, ctx: ContextoAba): void {
  const { plugin } = ctx;
  const idioma = plugin.settings.idioma;
  criarTituloSecao(containerEl, ctx, 'config.geral.titulo');

  // ==section== Instruções e link para criar a chave
  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.tutorial.nome'))
    .setDesc(traduzir(idioma, 'config.tutorial.descricao'))
    .addButton((botao) => {
      botao.setButtonText(traduzir(idioma, 'config.tutorial.botaoChave')).onClick(() => {
        activeWindow.open(URL_CRIAR_CHAVE_API);
      });
    })
    .addButton((botao) => {
      botao
        .setCta()
        .setButtonText(traduzir(idioma, 'config.tutorial.botao'))
        .onClick(() => plugin.abrirTutorial());
    });

  // ==section== Chave da API
  let chaveTestada = plugin.settings.apiKey;
  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.apiKey.nome'))
    .setDesc(traduzir(idioma, 'config.apiKey.descricao'))
    .addText((campo) => {
      campo.inputEl.type = 'password';
      campo.inputEl.addClass('gemini-assistant-r3-campo-chave');
      campo.setPlaceholder(traduzir(idioma, 'config.apiKey.placeholder')).setValue(plugin.settings.apiKey).onChange(async (valor) => {
        plugin.settings.apiKey = valor.trim();
        await plugin.saveSettings();
      });

      // ==section== Ao sair do campo com uma chave nova, valida e mede a velocidade automaticamente
      campo.inputEl.addEventListener('blur', () => {
        const chaveNova = campo.getValue().trim();
        if (!chaveNova || chaveNova === chaveTestada) {
          return;
        }
        chaveTestada = chaveNova;
        void executarTesteConexao(plugin, () => ctx.redesenhar());
      });
    });

  new Setting(containerEl)
    .setName(traduzir(idioma, 'config.teste.nome'))
    .setDesc(traduzir(idioma, 'config.teste.descricao'))
    .addButton((botao) => {
      botao.setButtonText(traduzir(idioma, 'config.teste.botao')).onClick(() => {
        chaveTestada = plugin.settings.apiKey;
        void executarTesteConexao(plugin, () => ctx.redesenhar());
      });
    });
}
