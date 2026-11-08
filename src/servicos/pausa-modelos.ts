import type { ModeloGeminiDisponivel } from '../tipos/configuracoes';

// ==style== Tempo de pausa por tipo de erro (ms). Editável.
const PAUSA_LIMITE_USO = 30 * 60 * 1000; // 429: cota/limite do plano gratuito
const PAUSA_INDISPONIVEL = 3 * 60 * 1000; // 500/502/503/504: sobrecarga temporária
const PAUSA_SEM_ACESSO = 6 * 60 * 60 * 1000; // 403/404: modelo sem acesso para esta chave

// ==types== Registro de pausa de um modelo
interface PausaModelo {
  ate: number;
  status: number;
}

// ==data== Pausas em memória (zeram ao recarregar o plugin)
const pausas = new Map<ModeloGeminiDisponivel, PausaModelo>();

// ==function== Duração da pausa para um status HTTP (null = não pausa)
function obterDuracaoPausa(status: number | undefined): number | null {
  if (status === 429) return PAUSA_LIMITE_USO;
  if (status === 403 || status === 404) return PAUSA_SEM_ACESSO;
  if (status !== undefined && status >= 500) return PAUSA_INDISPONIVEL;
  return null;
}

// ==function== Indica se o erro é do modelo (vale pular para o próximo sem repetir o mesmo)
export function ehErroDeModelo(status: number | undefined): boolean {
  return obterDuracaoPausa(status) !== null;
}

// ==function== Pausa o modelo conforme o erro recebido
export function pausarModelo(modelo: ModeloGeminiDisponivel, status: number | undefined): void {
  const duracao = obterDuracaoPausa(status);
  if (duracao !== null && status !== undefined) {
    pausas.set(modelo, { ate: Date.now() + duracao, status });
  }
}

// ==function== Libera o modelo (ex.: respondeu com sucesso)
export function liberarModelo(modelo: ModeloGeminiDisponivel): void {
  pausas.delete(modelo);
}

// ==function== Verifica se o modelo está pausado agora
export function estaPausado(modelo: ModeloGeminiDisponivel): boolean {
  const pausa = pausas.get(modelo);
  if (!pausa) {
    return false;
  }

  if (Date.now() >= pausa.ate) {
    pausas.delete(modelo);
    return false;
  }

  return true;
}

// ==function== Lista os modelos pausados com minutos restantes (para exibir nas configurações)
export function listarPausas(): { modelo: ModeloGeminiDisponivel; status: number; minutosRestantes: number }[] {
  return Array.from(pausas.entries())
    .filter(([modelo]) => estaPausado(modelo))
    .map(([modelo, pausa]) => ({ modelo, status: pausa.status, minutosRestantes: Math.max(1, Math.ceil((pausa.ate - Date.now()) / 60000)) }));
}

// ==function== Remove todas as pausas
export function limparPausas(): void {
  pausas.clear();
}
