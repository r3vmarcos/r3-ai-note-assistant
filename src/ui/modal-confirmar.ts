import { App, ButtonComponent, Modal } from 'obsidian';

// ==types== Textos do modal de confirmação
interface TextosConfirmacao {
  mensagem: string;
  confirmar: string;
  cancelar: string;
}

// ==function== Abre o modal e resolve com a escolha do usuário (true = confirmar)
export function confirmarAcao(app: App, textos: TextosConfirmacao): Promise<boolean> {
  return new Promise((resolver) => {
    new ModalConfirmar(app, textos, resolver).open();
  });
}

// ==class== Modal simples de confirmação com dois botões
class ModalConfirmar extends Modal {
  private confirmado = false;

  constructor(
    app: App,
    private readonly textos: TextosConfirmacao,
    private readonly resolver: (confirmado: boolean) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('p', { text: this.textos.mensagem });

    const botoesEl = contentEl.createDiv({ cls: 'modal-button-container' });
    new ButtonComponent(botoesEl).setButtonText(this.textos.cancelar).onClick(() => this.fechar(false));
    new ButtonComponent(botoesEl)
      .setButtonText(this.textos.confirmar)
      .setWarning()
      .onClick(() => this.fechar(true));
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolver(this.confirmado);
  }

  private fechar(confirmado: boolean): void {
    this.confirmado = confirmado;
    this.close();
  }
}
