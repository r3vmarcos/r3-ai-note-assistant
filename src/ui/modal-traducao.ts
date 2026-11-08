import { App, Modal } from 'obsidian';

import { buscarIdiomasTraducao, normalizarIdiomaTraducao, type IdiomaTraducao } from '../data/idiomas-traducao';

// ==types== Textos do modal (vêm da tradução do plugin)
export interface TextosModalTraducao {
  titulo: string;
  busca: string;
  /** Usa {idioma} para o texto digitado */
  livre: string;
}

// ==function== Abre o modal e resolve com o idioma escolhido (nome em inglês ou texto digitado); null = cancelado
export function escolherIdiomaTraducao(app: App, atual: string, textos: TextosModalTraducao): Promise<string | null> {
  return new Promise((resolver) => {
    new ModalTraducao(app, normalizarIdiomaTraducao(atual), textos, resolver).open();
  });
}

const CLS = 'gemini-assistant-r3-traducao';

// ==class== Modal de idioma: 20 principais como botões e busca para qualquer outro
class ModalTraducao extends Modal {
  private escolha: string | null = null;
  private gradeEl: HTMLDivElement | null = null;
  private buscaEl: HTMLInputElement | null = null;

  constructor(
    app: App,
    private readonly atual: string,
    private readonly textos: TextosModalTraducao,
    private readonly resolver: (escolha: string | null) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle(this.textos.titulo);

    this.buscaEl = contentEl.createEl('input', {
      cls: `${CLS}__busca`,
      attr: { type: 'text', placeholder: this.textos.busca, spellcheck: 'false' }
    });
    this.buscaEl.addEventListener('input', () => this.renderizarGrade());
    this.buscaEl.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        this.confirmarPelaBusca();
      }
    });

    this.gradeEl = contentEl.createDiv({ cls: `${CLS}__grade` });
    this.renderizarGrade();
    window.setTimeout(() => this.buscaEl?.focus(), 30);
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolver(this.escolha);
  }

  // ==function== Botões dos idiomas encontrados; com texto sem resultado exato, oferece traduzir para o texto digitado
  private renderizarGrade(): void {
    const grade = this.gradeEl;
    if (!grade) {
      return;
    }
    grade.empty();
    const termo = this.buscaEl?.value.trim() ?? '';
    const idiomas = buscarIdiomasTraducao(termo);

    for (const idioma of idiomas) {
      this.criarBotaoIdioma(grade, idioma);
    }

    const termoMinusculo = termo.toLowerCase();
    const temCorrespondenciaExata = idiomas.some((idioma) => [idioma.en, idioma.nativo, idioma.pt].some((nome) => nome.toLowerCase() === termoMinusculo));
    if (termo && !temCorrespondenciaExata) {
      const livreEl = grade.createEl('button', { cls: `${CLS}__idioma ${CLS}__idioma--livre`, attr: { type: 'button' } });
      livreEl.createSpan({ cls: `${CLS}__nativo`, text: this.textos.livre.replace('{idioma}', termo) });
      livreEl.addEventListener('click', () => this.fechar(termo));
    }
  }

  private criarBotaoIdioma(container: HTMLElement, idioma: IdiomaTraducao): void {
    const botaoEl = container.createEl('button', { cls: `${CLS}__idioma`, attr: { type: 'button', title: idioma.en } });
    botaoEl.toggleClass(`${CLS}__idioma--atual`, idioma.en === this.atual);
    botaoEl.createSpan({ cls: `${CLS}__nativo`, text: idioma.nativo });
    if (idioma.pt.toLowerCase() !== idioma.nativo.toLowerCase()) {
      botaoEl.createSpan({ cls: `${CLS}__nome`, text: idioma.pt });
    }
    botaoEl.addEventListener('click', () => this.fechar(idioma.en));
  }

  // ==function== Enter na busca: primeiro idioma encontrado; sem resultado, o texto digitado
  private confirmarPelaBusca(): void {
    const termo = this.buscaEl?.value.trim() ?? '';
    if (!termo) {
      this.fechar(this.atual);
      return;
    }
    const [primeiro] = buscarIdiomasTraducao(termo);
    this.fechar(primeiro ? primeiro.en : termo);
  }

  private fechar(escolha: string): void {
    this.escolha = escolha;
    this.close();
  }
}
