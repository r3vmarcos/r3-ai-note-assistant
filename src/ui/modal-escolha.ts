import { App, ButtonComponent, DropdownComponent, Modal } from 'obsidian';

// ==types== Configuração do modal de escolha (uma lista e os botões cancelar/confirmar)
export interface ConfigEscolha<T extends string> {
  titulo: string;
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valorInicial: T;
  confirmar: string;
  cancelar: string;
}

// ==function== Abre o modal e resolve com a opção escolhida (null = cancelado)
export function escolherOpcao<T extends string>(app: App, config: ConfigEscolha<T>): Promise<T | null> {
  return new Promise((resolver) => {
    new ModalEscolha<T>(app, config, resolver).open();
  });
}

// ==class== Modal com uma lista de opções, usado antes de algumas ações do grupo Outros
class ModalEscolha<T extends string> extends Modal {
  private escolha: T | null = null;
  private valorAtual: T;

  constructor(
    app: App,
    private readonly config: ConfigEscolha<T>,
    private readonly resolver: (escolha: T | null) => void
  ) {
    super(app);
    this.valorAtual = config.valorInicial;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.setTitle(this.config.titulo);

    const linhaEl = contentEl.createDiv({ cls: 'gemini-assistant-r3-escolha' });
    linhaEl.createEl('label', { cls: 'gemini-assistant-r3-escolha__rotulo', text: this.config.rotulo });

    const lista = new DropdownComponent(linhaEl);
    for (const opcao of this.config.opcoes) {
      lista.addOption(opcao.valor, opcao.rotulo);
    }
    lista.setValue(this.valorAtual).onChange((valor) => {
      const opcao = this.config.opcoes.find((item) => item.valor === valor);
      if (opcao) {
        this.valorAtual = opcao.valor;
      }
    });
    // Enter confirma direto pela lista
    lista.selectEl.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        this.fechar(this.valorAtual);
      }
    });

    const botoesEl = contentEl.createDiv({ cls: 'modal-button-container' });
    new ButtonComponent(botoesEl).setButtonText(this.config.cancelar).onClick(() => this.fechar(null));
    new ButtonComponent(botoesEl)
      .setButtonText(this.config.confirmar)
      .setCta()
      .onClick(() => this.fechar(this.valorAtual));

    window.setTimeout(() => lista.selectEl.focus(), 30);
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolver(this.escolha);
  }

  private fechar(escolha: T | null): void {
    this.escolha = escolha;
    this.close();
  }
}
