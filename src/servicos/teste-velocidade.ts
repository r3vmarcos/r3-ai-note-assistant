import { obterRotuloModelo, traduzir } from '../i18n';
import type GeminiAssistantR3Plugin from '../main';
import { MODELOS_GEMINI_DISPONIVEIS } from '../settings/padroes';
import type { IdiomaSaida, ModeloGeminiDisponivel, ResultadoVelocidadeModelo } from '../tipos/configuracoes';
import { finalizarNotice } from '../utils/notice';
import { GeminiApiService } from './gemini-api-service';
import { ordenarPorVelocidade } from './ordem-modelos';

// ==function== Mede todos os modelos um por um (mais justo que em paralelo) e salva o ranking
export async function executarTesteVelocidade(
  plugin: GeminiAssistantR3Plugin,
  aoProgresso: (atual: number, total: number, modelo: ModeloGeminiDisponivel) => void = () => undefined
): Promise<ResultadoVelocidadeModelo[]> {
  const servico = new GeminiApiService(plugin.settings);
  const resultados: ResultadoVelocidadeModelo[] = [];
  const total = MODELOS_GEMINI_DISPONIVEIS.length;

  for (const [indice, modelo] of MODELOS_GEMINI_DISPONIVEIS.entries()) {
    aoProgresso(indice + 1, total, modelo);
    resultados.push(await servico.medirVelocidade(modelo));
  }

  plugin.settings.resultadosVelocidade = resultados;
  plugin.settings.testeVelocidadeEm = Date.now();
  await plugin.saveSettings();
  plugin.recarregarBotaoFlutuante();
  return resultados;
}

// ==function== Mostra no notice o resultado do teste (modelo mais rápido ou aviso de que nenhum respondeu)
export function finalizarResumoTeste(
  idioma: IdiomaSaida,
  notice: Parameters<typeof finalizarNotice>[0],
  resultados: ResultadoVelocidadeModelo[]
): void {
  const maisRapido = ordenarPorVelocidade(resultados)[0];
  const algumOk = resultados.some((resultado) => resultado.ok);
  finalizarNotice(
    notice,
    algumOk && maisRapido
      ? traduzir(idioma, 'config.velocidade.concluido', { modelo: obterRotuloModelo(idioma, maisRapido) })
      : traduzir(idioma, 'config.velocidade.nenhum'),
    5000
  );
}
