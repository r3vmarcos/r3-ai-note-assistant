import { BlocoSobre } from '../../ui/bloco-sobre';
import type { ContextoAba } from '../campos';

// ==function== Seção final das configurações: mesmo conteúdo do modal "Sobre o projeto" do menu da IA
export function criarSecaoApoio(containerEl: HTMLElement, ctx: ContextoAba): void {
  new BlocoSobre(ctx.plugin).render(containerEl);
}
