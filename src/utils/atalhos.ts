// ==data== Teclas modificadoras reconhecidas
const MODIFICADORES = ['ctrl', 'alt', 'shift', 'meta'] as const;
const MODIFICADORES_OBRIGATORIOS = ['ctrl', 'alt', 'meta'];

// ==function== Normaliza texto digitado pelo usuário ("Ctrl + Alt + 1" → "ctrl+alt+1")
export function normalizarTextoAtalho(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace('control', 'ctrl')
    .replace('command', 'meta')
    .replace('cmd', 'meta')
    .replace('option', 'alt');
}

// ==function== Monta a combinação de um KeyboardEvent no mesmo formato normalizado
export function converterEventoEmAtalho(evento: KeyboardEvent): string | null {
  const tecla = normalizarTextoAtalho(evento.key);
  if (!tecla || (MODIFICADORES as readonly string[]).includes(tecla) || tecla === 'control') {
    return null;
  }

  const partes: string[] = [];
  if (evento.ctrlKey) partes.push('ctrl');
  if (evento.altKey) partes.push('alt');
  if (evento.shiftKey) partes.push('shift');
  if (evento.metaKey) partes.push('meta');
  partes.push(tecla);

  return partes.join('+');
}

// ==function== Atalho válido = vazio ou com Ctrl/Alt/Meta (evita sequestrar a digitação)
export function validarAtalho(valor: string): boolean {
  const normalizado = normalizarTextoAtalho(valor);
  if (!normalizado) {
    return true;
  }

  const partes = normalizado.split('+');
  const tecla = partes[partes.length - 1] ?? '';
  const possuiModificador = partes.some((parte) => MODIFICADORES_OBRIGATORIOS.includes(parte));

  return possuiModificador && Boolean(tecla) && !(MODIFICADORES as readonly string[]).includes(tecla);
}
