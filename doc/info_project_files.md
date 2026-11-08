# Info Project Files

## Arquivos críticos

- [`src/main.ts`](../src/main.ts) -> arquivo principal que inicializa comandos, settings, botão flutuante e estado global de geração; usado em toda a inicialização do plugin; crítico para fluxo, idioma e controle de abort.
- [`src/comandos/editor-commands.ts`](../src/comandos/editor-commands.ts) -> módulo central de comandos que executa geração, resumo, expansão, transformação, repeat, stop e desfazer; usado no editor e no menu flutuante; crítico para o fluxo de escrita no Obsidian.
- [`src/servicos/gemini-api-service.ts`](../src/servicos/gemini-api-service.ts) -> service de integração com a Gemini API; usado em streaming, fallback, continuação e validação de modelos; crítico para conectividade externa.
- [`src/settings.ts`](../src/settings.ts) -> aba de configurações com idioma global, preview, fallback, objetivo, presets e formato de saída; usada na personalização do plugin; crítica para persistência.
- [`src/ui/botao-flutuante.ts`](../src/ui/botao-flutuante.ts) -> interface do botão flutuante e submenus; usada na view Markdown; crítica para UX rápida.
- [`src/ui/preview-modal.ts`](../src/ui/preview-modal.ts) -> modal de pré-visualização da resposta; usado quando o preview está ativado; crítico para revisão antes de inserir.
- [`src/utils/prompt.ts`](../src/utils/prompt.ts) -> motor de renderização dos prompts com regras de idioma, objetivo, contexto e formatação; usado em todos os comandos; crítico para qualidade do texto gerado.
- [`src/utils/editor.ts`](../src/utils/editor.ts) -> utilitários de leitura de contexto, inserção animada, streaming e desfazer; usado nos comandos; crítico para integridade do texto na nota.
