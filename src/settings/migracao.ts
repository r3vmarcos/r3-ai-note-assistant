import type { ChavePrompt, ChaveTipoInsercao, ConfiguracoesPlugin, FaixasPorIntencao, GrupoPadraoMenu, IdGrupoMenu, IdiomaSaida, IntencaoComFaixa, NivelResposta, TipoInsercao } from '../tipos/configuracoes';
import { CHAVES_DE_PROMPT, clonarFaixasPadrao, IDIOMAS_DISPONIVEIS, INTENCOES_COM_FAIXA, NIVEIS_RESPOSTA, obterPromptsPadraoPorIdioma, VERSAO_CONFIG, VERSAO_PROMPTS } from './padroes';
import { PROMPTS_LEGADOS_POR_IDIOMA, type ChavePromptLegada } from './prompts-legados';

// ==data== De onde cada template novo herda um prompt editado (ordem de prioridade)
const ORIGENS_POR_PROMPT: Record<ChavePrompt, ChavePromptLegada[]> = {
  promptGerar: ['cdetalhado', 'csimplificado', 'crelacionado'],
  promptResumir: ['cresumirExplicado', 'cresumirCurto', 'cresumirSimples', 'cresumirTecnico'],
  promptExplicar: ['cexplicado'],
  promptExpandir: ['cexpandir', 'cexpandirCriativo'],
  promptReescrever: ['ctransformarClaro', 'ctransformarProfissional', 'ctransformarTecnico'],
  promptResponder: ['cresponderExplicado', 'cresponderCurto'],
  promptCorrigir: ['ccorrigirGramatica'],
  promptTraduzir: [],
  promptTabela: [],
  promptDiagrama: [],
  promptPerguntas: [],
  promptTituloTags: [],
  promptTom: [],
  promptPersonalizado: ['coutros']
};

const CHAVES_LEGADAS = Object.keys(PROMPTS_LEGADOS_POR_IDIOMA['pt-BR']) as ChavePromptLegada[];

// ==data== Campos que deixaram de existir na v4.6
const CAMPOS_REMOVIDOS = [
  ...CHAVES_LEGADAS,
  'usarFormatacaoConfiguravel', 'permitirSubtitulos', 'permitirMarkdown', 'permitirListas', 'preferirTextoCorrido', 'usarCabecalhoResposta',
  'insercaoGeracaoLonga', 'insercaoRelacionado', 'insercaoPersonalizado',
  'geracaoSimplificadoMin', 'geracaoSimplificadoMax', 'geracaoDetalhadoMin', 'geracaoDetalhadoMax',
  'geracaoExplicadoMin', 'geracaoExplicadoMax', 'geracaoRelacionadoMin', 'geracaoRelacionadoMax',
  'resumoCurtoMin', 'resumoCurtoMax', 'resumoExplicadoMin', 'resumoExplicadoMax',
  'respostaCurtaMin', 'respostaCurtaMax', 'respostaExplicadaMin', 'respostaExplicadaMax'
];

const GRUPOS_RENOMEADOS: Record<string, IdGrupoMenu> = { transformar: 'reescrever' };

type DadosLegados = Record<string, unknown>;

export interface ResultadoMigracao {
  configuracoes: ConfiguracoesPlugin;
  migrou: boolean;
  promptsPreservados: ChavePrompt[];
}

// ==function== Um texto legado foi editado se difere do padrão antigo em qualquer idioma
function foiEditado(chave: ChavePromptLegada, valor: unknown): valor is string {
  if (typeof valor !== 'string' || !valor.trim()) {
    return false;
  }
  return (['pt-BR', 'en'] as const).every((idioma) => PROMPTS_LEGADOS_POR_IDIOMA[idioma][chave].trim() !== valor.trim());
}

function obterPromptEditado(fonte: DadosLegados, chaveNova: ChavePrompt): string | null {
  for (const chaveLegada of ORIGENS_POR_PROMPT[chaveNova]) {
    const valor = fonte[chaveLegada];
    if (foiEditado(chaveLegada, valor)) {
      return valor;
    }
  }
  return null;
}

// ==function== Monta o pacote de prompts de um idioma: editados preservados, o resto com o texto novo
function migrarPacote(fonte: DadosLegados, idioma: IdiomaSaida, preservados: Set<ChavePrompt>): Record<ChavePrompt, string> {
  const pacote = obterPromptsPadraoPorIdioma(idioma);
  for (const chave of CHAVES_DE_PROMPT) {
    const editado = obterPromptEditado(fonte, chave);
    if (editado !== null) {
      pacote[chave] = editado;
      preservados.add(chave);
    }
  }
  return pacote;
}

function migrarAtalhos(atalhosLegados: unknown): Partial<Record<ChavePrompt, string>> {
  const atalhos: Partial<Record<ChavePrompt, string>> = {};
  if (!atalhosLegados || typeof atalhosLegados !== 'object') {
    return atalhos;
  }

  const fonte = atalhosLegados as Record<string, unknown>;
  for (const chave of CHAVES_DE_PROMPT) {
    const origem = ORIGENS_POR_PROMPT[chave].find((chaveLegada) => typeof fonte[chaveLegada] === 'string' && (fonte[chaveLegada]).trim());
    if (origem) {
      atalhos[chave] = (fonte[origem] as string).trim();
    }
  }
  return atalhos;
}

function migrarGrupo<T extends GrupoPadraoMenu | IdGrupoMenu | null>(valor: T): T {
  return (typeof valor === 'string' && valor in GRUPOS_RENOMEADOS ? GRUPOS_RENOMEADOS[valor] : valor) as T;
}

// ==function== Converte configurações da v4.5 para a estrutura intenção + nível
export function migrarParaPromptsV2(configuracoes: ConfiguracoesPlugin, dadosSalvos: DadosLegados | null): ResultadoMigracao {
  const precisaMigrar = Boolean(dadosSalvos) && dadosSalvos?.versaoPrompts !== VERSAO_PROMPTS;
  if (!precisaMigrar || !dadosSalvos) {
    return { configuracoes, migrou: false, promptsPreservados: [] };
  }

  const preservados = new Set<ChavePrompt>();
  const idiomaAtual = configuracoes.idioma;
  const presetsLegados = (dadosSalvos.presetsPromptsPorIdioma ?? {}) as Record<string, DadosLegados | undefined>;

  // ==section== Prompts ativos (idioma atual) e presets de cada idioma
  const pacoteAtual = migrarPacote(dadosSalvos, idiomaAtual, preservados);
  const presetsPromptsPorIdioma = {} as ConfiguracoesPlugin['presetsPromptsPorIdioma'];
  for (const idioma of IDIOMAS_DISPONIVEIS) {
    presetsPromptsPorIdioma[idioma] = idioma === idiomaAtual ? { ...pacoteAtual } : migrarPacote(presetsLegados[idioma] ?? {}, idioma, preservados);
  }

  const resultado: ConfiguracoesPlugin = {
    ...configuracoes,
    ...pacoteAtual,
    presetsPromptsPorIdioma,
    atalhosPrompts: migrarAtalhos(dadosSalvos.atalhosPrompts),
    grupoPadraoMenu: migrarGrupo(configuracoes.grupoPadraoMenu),
    ultimoGrupoMenu: migrarGrupo(configuracoes.ultimoGrupoMenu),
    versaoPrompts: VERSAO_PROMPTS
  };

  // ==section== Remove campos antigos que vieram do data.json
  const resultadoComLegado = resultado as ConfiguracoesPlugin & Record<string, unknown>;
  for (const campo of CAMPOS_REMOVIDOS) {
    delete resultadoComLegado[campo];
  }

  return { configuracoes: resultado, migrou: true, promptsPreservados: Array.from(preservados) };
}

// ==section== v1.1: inserção e faixas de palavras individuais por ação

// ==function== Mescla faixas salvas com as padrão (ignora valores inválidos)
export function mesclarFaixas(salvas: unknown): FaixasPorIntencao {
  const faixas = clonarFaixasPadrao();
  if (!salvas || typeof salvas !== 'object') {
    return faixas;
  }

  const fonte = salvas as Partial<Record<IntencaoComFaixa, Partial<Record<NivelResposta, { min?: unknown; max?: unknown }>>>>;
  for (const intencao of INTENCOES_COM_FAIXA) {
    for (const nivel of NIVEIS_RESPOSTA) {
      const faixa = fonte[intencao]?.[nivel];
      if (typeof faixa?.min === 'number' && typeof faixa.max === 'number') {
        faixas[intencao][nivel] = { min: faixa.min, max: faixa.max };
      }
    }
  }
  return faixas;
}

const ORIGEM_INSERCAO_V2: Partial<Record<ChaveTipoInsercao, string>> = {
  insercaoResumir: 'insercaoResumo',
  insercaoExplicar: 'insercaoGerar',
  insercaoResponder: 'insercaoResposta',
  insercaoCorrigir: 'insercaoReescrever',
  insercaoPersonalizado: 'insercaoReescrever'
};

const SUFIXO_NIVEL: Record<NivelResposta, string> = { resumido: 'Resumido', padrao: 'Padrao', expandido: 'Expandido', ultra: 'Ultra' };
const GRUPO_FAIXA_V2: Record<IntencaoComFaixa, 'Longo' | 'Curto'> = { gerar: 'Longo', explicar: 'Longo', expandir: 'Longo', resumir: 'Curto', responder: 'Curto' };

function ehTipoInsercao(valor: unknown): valor is TipoInsercao {
  return valor === 'append' || valor === 'replace' || valor === 'below' || valor === 'start';
}

// ==function== Converte inserções compartilhadas e faixas longo/curto da v1.0 para valores por ação
export function migrarParaConfigV3(configuracoes: ConfiguracoesPlugin, dadosSalvos: DadosLegados | null): { configuracoes: ConfiguracoesPlugin; migrou: boolean } {
  const precisaMigrar = Boolean(dadosSalvos) && dadosSalvos?.versaoConfig !== VERSAO_CONFIG;
  if (!precisaMigrar || !dadosSalvos) {
    return { configuracoes, migrou: false };
  }

  const resultado = { ...configuracoes, versaoConfig: VERSAO_CONFIG } as ConfiguracoesPlugin & Record<string, unknown>;

  // ==section== Inserção: herda o valor que a ação usava antes
  for (const [chaveNova, chaveAntiga] of Object.entries(ORIGEM_INSERCAO_V2) as [ChaveTipoInsercao, string][]) {
    const valorNovoSalvo = dadosSalvos[chaveNova];
    const valorAntigo = dadosSalvos[chaveAntiga];
    if (!ehTipoInsercao(valorNovoSalvo) && ehTipoInsercao(valorAntigo)) {
      resultado[chaveNova] = valorAntigo;
    }
  }

  // ==section== Faixas: copia longo/curto para cada ação do grupo, se existirem
  if (!dadosSalvos.faixasPalavras) {
    for (const intencao of INTENCOES_COM_FAIXA) {
      for (const nivel of NIVEIS_RESPOSTA) {
        const prefixo = `faixa${GRUPO_FAIXA_V2[intencao]}${SUFIXO_NIVEL[nivel]}`;
        const minimo = dadosSalvos[`${prefixo}Min`];
        const maximo = dadosSalvos[`${prefixo}Max`];
        if (typeof minimo === 'number' && typeof maximo === 'number') {
          resultado.faixasPalavras[intencao][nivel] = { min: minimo, max: maximo };
        }
      }
    }
  }

  // ==section== Remove campos que deixaram de existir
  for (const campo of ['insercaoResumo', 'insercaoResposta']) {
    delete resultado[campo];
  }
  for (const grupo of ['Longo', 'Curto']) {
    for (const nivel of Object.values(SUFIXO_NIVEL)) {
      delete resultado[`faixa${grupo}${nivel}Min`];
      delete resultado[`faixa${grupo}${nivel}Max`];
    }
  }

  return { configuracoes: resultado, migrou: true };
}
