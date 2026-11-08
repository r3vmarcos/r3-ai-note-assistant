import { MODELOS_GEMINI_DISPONIVEIS } from '../settings/padroes';
import type { ConfiguracoesPlugin, ModeloGeminiDisponivel, ResultadoVelocidadeModelo } from '../tipos/configuracoes';

// ==function== Ranking do último teste: os que responderam (mais rápido primeiro), depois os demais na ordem de qualidade
export function ordenarPorVelocidade(resultados: ResultadoVelocidadeModelo[]): ModeloGeminiDisponivel[] {
  const respondidos = resultados
    .filter((resultado) => resultado.ok && resultado.ms !== null && MODELOS_GEMINI_DISPONIVEIS.includes(resultado.modelo))
    .sort((a, b) => (a.ms ?? Infinity) - (b.ms ?? Infinity))
    .map((resultado) => resultado.modelo);

  const restantes = MODELOS_GEMINI_DISPONIVEIS.filter((modelo) => !respondidos.includes(modelo));
  return [...respondidos, ...restantes];
}

// ==function== Indica se o modelo principal deve ser o mais rápido do último teste
export function usaOrdemPorVelocidade(configuracoes: ConfiguracoesPlugin): boolean {
  return configuracoes.usarModeloMaisRapido && configuracoes.resultadosVelocidade.some((resultado) => resultado.ok);
}

// ==function== Ordem base dos modelos: a manual do usuário (se houver), senão a do teste de velocidade ou de qualidade
export function obterOrdemBase(configuracoes: ConfiguracoesPlugin): ModeloGeminiDisponivel[] {
  const manual = [...new Set(configuracoes.ordemModelos)].filter((modelo) => MODELOS_GEMINI_DISPONIVEIS.includes(modelo));
  if (manual.length > 0) {
    return [...manual, ...MODELOS_GEMINI_DISPONIVEIS.filter((modelo) => !manual.includes(modelo))];
  }
  return usaOrdemPorVelocidade(configuracoes) ? ordenarPorVelocidade(configuracoes.resultadosVelocidade) : [...MODELOS_GEMINI_DISPONIVEIS];
}

// ==function== Ordem personalizada pelo usuário? (falso = automática)
export function ordemEhPersonalizada(configuracoes: ConfiguracoesPlugin): boolean {
  return configuracoes.ordemModelos.length > 0;
}

// ==function== Modelo que começa a geração (o mais rápido do teste ou o escolhido manualmente)
export function obterModeloPrincipalEfetivo(configuracoes: ConfiguracoesPlugin): ModeloGeminiDisponivel {
  return usaOrdemPorVelocidade(configuracoes) ? obterOrdemBase(configuracoes)[0] ?? configuracoes.modeloPrincipal : configuracoes.modeloPrincipal;
}

// ==function== Cadeia de tentativas: o principal primeiro e depois a ordem base, sem repetir
export function obterCadeiaModelos(configuracoes: ConfiguracoesPlugin): ModeloGeminiDisponivel[] {
  const principal = obterModeloPrincipalEfetivo(configuracoes);
  if (!configuracoes.usarFallbackAutomatico) {
    return [principal];
  }
  return [principal, ...obterOrdemBase(configuracoes).filter((modelo) => modelo !== principal)];
}
