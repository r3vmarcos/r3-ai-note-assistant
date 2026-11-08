import { Notice } from 'obsidian';

// ==data== Durações padrão (ms)
export const DURACAO_NOTICE_CURTA = 2500;
export const DURACAO_NOTICE_MEDIA = 3500;
export const DURACAO_NOTICE_LONGA = 4500;

// ==function== Mostra um aviso que some sozinho
export function mostrarNoticeTemporario(mensagem: string, duracaoMs = DURACAO_NOTICE_MEDIA): Notice {
  return new Notice(mensagem, duracaoMs);
}

// ==function== Cria um aviso fixo (para progresso) que deve ser finalizado depois
export function criarNoticeProgresso(mensagem: string): Notice {
  return new Notice(mensagem, 0);
}

// ==function== Troca a mensagem de um aviso fixo e agenda o fechamento
export function finalizarNotice(notice: Notice, mensagem: string | null, duracaoMs = DURACAO_NOTICE_LONGA): void {
  if (mensagem !== null) {
    notice.setMessage(mensagem);
  }

  window.setTimeout(() => notice.hide(), duracaoMs);
}
