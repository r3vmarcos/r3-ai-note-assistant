import type { IdGrupoMenu } from '../tipos/configuracoes';

// ==types== Metadados visuais de um grupo do menu
export interface GrupoMenuConfig {
  id: IdGrupoMenu;
  tituloTraducao: string;
  icone: string;
}

// ==data== Intenções do menu (ordem visual). As ações de cada uma vêm de DEFINICOES_COMANDOS.grupo
export const GRUPOS_MENU: GrupoMenuConfig[] = [
  { id: 'gerar', tituloTraducao: 'menu.grupo.gerar', icone: 'pen-line' },
  { id: 'resumir', tituloTraducao: 'menu.grupo.resumir', icone: 'list' },
  { id: 'explicar', tituloTraducao: 'menu.grupo.explicar', icone: 'lightbulb' },
  { id: 'expandir', tituloTraducao: 'menu.grupo.expandir', icone: 'maximize-2' },
  { id: 'reescrever', tituloTraducao: 'menu.grupo.reescrever', icone: 'shuffle' },
  { id: 'responder', tituloTraducao: 'menu.grupo.responder', icone: 'message-circle' },
  { id: 'outros', tituloTraducao: 'menu.grupo.outros', icone: 'terminal' }
];

// ==function== Busca os metadados de um grupo
export function obterGrupoMenu(id: IdGrupoMenu): GrupoMenuConfig {
  return GRUPOS_MENU.find((grupo) => grupo.id === id) ?? GRUPOS_MENU[GRUPOS_MENU.length - 1]!;
}
