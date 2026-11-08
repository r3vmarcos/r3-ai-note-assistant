# R3 AI Note Assistant

Generate, summarize, explain, expand, rewrite, translate and answer text right inside your Obsidian notes with Google Gemini, using a free API key.

## Features

### AI menu

- **Floating AI menu** in the editor, with search, keyboard navigation, favorites and **Repeat last action**, **Undo** and **Redo** buttons.
- **Movable and resizable.** Drag the menu by its title to place it anywhere in the Obsidian window (over the file list too) and drag its corner to change the width. The position is saved; double-click the title to reset it.
- **Tidy by design.** Groups open collapsed; when one is open, the others shrink. Opening **Other** shows only that group, with a **Back** button.
- **Word estimates** next to every level, based on the selection size or on the configured word range.

### Writing actions (four levels each: Short · Standard · Expanded · Ultra)

| Action | What it does |
| --- | --- |
| **Generate** | Without a selection, writes about the note title. **With a selection, creates a new note** named after the selected text, uses the current note as reference and turns the selection into a link to the new note. |
| **Summarize** | Summarizes the selection to a fraction of its size. |
| **Explain** | Explains the selection (or the note topic) in more depth. |
| **Expand** | Expands the selection (1.3× to 4× its size) and replaces it. |
| **Rewrite** | Rewrites the selection more clearly (0.8× to 2× its size). |
| **Answer** | Answers the question or request in the selection. |

### Other tools

| Tool | With a selection | Without a selection |
| --- | --- | --- |
| **Fix grammar** | Fixes and replaces the selection | Fixes the whole note |
| **Translate** | Translates below the selection | Translates the whole note at its end |
| **Review questions** | Questions about the selection | Questions about the whole note |
| **Change tone** | Rewrites in a formal, simple or technical tone | Rewrites the whole note |
| **Turn into table** | Markdown table (or numbered list) | — |
| **Create diagram** | Mermaid diagram with a short explanation | — |
| **Suggest title and tags** | From the selection | From the whole note |
| **Custom prompt / Ask the AI** | Free-form instruction | Free-form instruction |

- **Translate** opens a dialog with the 20 main languages as buttons and a search field for about 80 languages. You can also type any language or variant (for example "Argentine Spanish"). The result starts with a "Translation into …" heading.
- **Review questions** asks how many questions to create (3 to 20); answers stay inside collapsible callouts.
- **Change tone** asks which tone to use.
- Whole-note actions never touch the note properties (frontmatter).

### Output and models

- **Rich Markdown when it helps.** Tables, lists, headings, callouts, LaTeX formulas and **Mermaid diagrams and charts**.
- **Diagrams are validated** with Obsidian's own Mermaid before they stay in your note. If one is broken, the plugin asks Gemini for one fix; if that also fails, it turns the diagram into a table or list.
- **Writing profiles** (natural, objective, didactic, technical, academic, creative or free) define the style; the chosen level defines the length.
- **Streaming, preview and undo/redo.** See text as it is written, review it in a preview, regenerate with another model, and undo or redo up to 20 generations per note.
- **Automatic model fallback** across the free Gemini models: 3.6 Flash → 3 Flash Preview → 3.5 Flash-Lite → 3.1 Flash-Lite → 2.5 Flash. A model that fails with 429/5xx is paused for a while.
- **Speed test.** Measures the response time of every model and can **use the fastest one as default**. The test also runs automatically in the background every 5 generations.

### Settings and languages

- **Per-action settings.** Each action has its own editable prompt, hotkey, insertion point and size (word range or size factor). The gear icon in the AI menu opens that action's settings.
- **Right-click menu, command palette and per-action hotkeys.**
- **Interface in 7 languages:** Portuguese (Brazil), English, Spanish, French, German, Japanese and Simplified Chinese.
- **Built-in tutorial.** Open it from the **?** button in the AI menu, from the settings, or with the **Open tutorial** command.

## Getting started

1. Create a free Gemini API key at **[Google AI Studio](https://aistudio.google.com/app/api-keys)**.
2. In **Settings → Community plugins**, install and enable **R3 AI Note Assistant**.
3. In **Settings → R3 AI Note Assistant**, paste the key into **Gemini API key** and select **Validate now**.
4. Open a note in editing mode, select **AI** at the top of the editor, then pick an action and a level.

## Privacy and network use

- This plugin sends requests to the **Google Gemini API** (`generativelanguage.googleapis.com`). Requests are sent:
  - when you run an action, with the prompt built from the note title, the selected text (or the whole note body, for actions run without a selection) and, if **Include whole-note context** is on, the text around the selection and the start of the note;
  - when you run the model speed test, and automatically in the background every 5 generations, with a short test prompt and **no note content**.
- Your API key is stored **unencrypted** in `<vault>/.obsidian/plugins/ai-note-assistant/data.json`. Do not publish that file, and be careful when syncing your vault to public places.
- No telemetry, no analytics, no third-party services besides the Gemini API.
- The plugin only **writes** to the clipboard when you click a copy button (Pix key or e-mail in **About the project**). It never reads the clipboard.
- Use of the Gemini API is subject to [Google's terms](https://ai.google.dev/gemini-api/terms). The free plan has daily limits.

## About

This plugin is a study project by **Marcos ([r3vmarcos](https://github.com/r3vmarcos))**, made to help the community develop their projects and research.

- Suggestions: <r3vmarcos@gmail.com>
- Has this plugin helped you day to day? Support the project so it can get even better:
  - [Buy Me a Coffee](https://buymeacoffee.com/r3vmarcos)
  - **Pix** (Brazil): `319a4a14-7a65-4f0f-9439-a6c556b64557`

---

## Português (Brasil)

Gere, resuma, explique, expanda, reescreva, traduza e responda textos direto nas suas notas do Obsidian com o Google Gemini, usando uma chave gratuita.

### Como começar

1. Crie sua chave gratuita no **[Google AI Studio](https://aistudio.google.com/app/api-keys)**.
2. Em **Configurações → R3 AI Note Assistant**, cole a chave em **Chave da API do Gemini** e clique em **Validar agora**.
3. Abra uma nota no modo de edição, clique em **IA** e escolha a ação e o nível (Resumido, Padrão, Expandido ou Ultra).

### Destaques

- **Gerar com seleção** cria uma nota nova com o nome do trecho selecionado, usando a nota atual como referência, e transforma o trecho em link para ela.
- **Outros:** corrigir gramática, traduzir (20 idiomas principais e busca por qualquer outro), perguntas de revisão, mudar o tom, transformar em tabela, criar diagrama e sugerir título e tags. Corrigir, traduzir, perguntas e tom funcionam na seleção ou, sem seleção, na nota toda.
- **Menu móvel:** arraste pelo título para qualquer lugar da janela e ajuste a largura pelo canto. Duplo clique no título volta ao padrão.
- **Desfazer e Refazer** das gerações, por nota.
- Em **Configurações → Modelos**, **Testar todos** mede o tempo de resposta de cada modelo, e você pode usar o mais rápido como padrão. O teste também roda sozinho, em segundo plano, a cada 5 gerações.
- Cada ação tem seu próprio prompt, atalho, local de inserção e tamanho; o ícone de engrenagem no menu da IA leva direto até ela.

O tutorial completo está no próprio plugin: botão **?** no menu da IA, nas configurações ou no comando **Abrir tutorial**.

**Privacidade:** o texto só é enviado ao Google quando você executa uma ação (a seleção ou, nas ações sem seleção, a nota toda). O teste de velocidade, inclusive o automático, envia apenas um texto curto de teste, sem conteúdo das notas. A chave fica salva sem criptografia no `data.json` do plugin, dentro do seu vault.

**Sobre:** projeto de estudo criado por Marcos ([r3vmarcos](https://github.com/r3vmarcos)) para ajudar a comunidade a desenvolver projetos e pesquisas. Sugestões: <r3vmarcos@gmail.com>. Este plugin ajudou no seu dia a dia? Apoie o projeto para ficar ainda melhor: [Buy Me a Coffee](https://buymeacoffee.com/r3vmarcos) ou chave Pix `319a4a14-7a65-4f0f-9439-a6c556b64557`.

## Development

```bash
npm install
npm run dev      # watch
npm run build    # production build
npm run release  # build + copy the plugin files to release/ (data.json without the API key)
npm run lint
```

To test locally, copy `main.js`, `manifest.json` and `styles.css` to `<vault>/.obsidian/plugins/ai-note-assistant/`.

## License

[MIT](LICENSE)
