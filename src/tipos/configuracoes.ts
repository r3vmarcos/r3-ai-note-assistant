// ==types== Idioma e modelos
export type IdiomaSaida = 'pt-BR' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh-CN';

// ==types== Modelos de texto do plano gratuito (ordem de qualidade em MODELOS_GEMINI_DISPONIVEIS)
export type ModeloGeminiDisponivel =
  | 'gemini-3.6-flash'
  | 'gemini-3-flash-preview'
  | 'gemini-3.5-flash-lite'
  | 'gemini-3.1-flash-lite'
  | 'gemini-2.5-flash';

// ==types== Opções de comportamento
export type TipoInsercao = 'append' | 'replace' | 'below' | 'start';
export type TomEscrita = 'formal' | 'simples' | 'tecnico';
export type PerfilEscrita ='livre' | 'natural' | 'objetivo' | 'didatico' | 'tecnico' | 'academico' | 'criativo';
export type PosicaoBotaoFlutuante = 'esquerda' | 'direita';
export type ObjetivoConteudo = 'livre' | 'geral' | 'estudo' | 'profissional' | 'tecnico' | 'apresentacao';
export type TamanhoBotaoFlutuante = 'compacto' | 'medio' | 'grande';

// ==types== Intenções (grupos do menu) e níveis de resposta
export type IdGrupoMenu = 'gerar' | 'resumir' | 'explicar' | 'expandir' | 'reescrever' | 'responder' | 'outros';
export type GrupoPadraoMenu = 'nenhum' | 'ultimo' | IdGrupoMenu;
export type NivelResposta = 'resumido' | 'padrao' | 'expandido' | 'ultra';

// ==types== Estilo da resposta (preset) e chaves de formato avançado
export type EstiloResposta = 'rico' | 'equilibrado' | 'simples' | 'personalizado';
export type ChaveFormato =
  | 'formatoTabelas'
  | 'formatoListas'
  | 'formatoTitulos'
  | 'formatoCallouts'
  | 'formatoDiagramas'
  | 'formatoGraficos'
  | 'formatoLatex'
  | 'formatoNegrito';

// ==types== Um template por intenção (o nível entra pelas diretrizes)
export type ChavePrompt =
  | 'promptGerar'
  | 'promptResumir'
  | 'promptExplicar'
  | 'promptExpandir'
  | 'promptReescrever'
  | 'promptResponder'
  | 'promptCorrigir'
  | 'promptTraduzir'
  | 'promptTabela'
  | 'promptDiagrama'
  | 'promptPerguntas'
  | 'promptTituloTags'
  | 'promptTom'
  | 'promptPersonalizado';

// ==types== Uma inserção por ação
export type ChaveTipoInsercao =
  | 'insercaoGerar'
  | 'insercaoResumir'
  | 'insercaoExplicar'
  | 'insercaoExpandir'
  | 'insercaoReescrever'
  | 'insercaoResponder'
  | 'insercaoCorrigir'
  | 'insercaoTraduzir'
  | 'insercaoTabela'
  | 'insercaoDiagrama'
  | 'insercaoPerguntas'
  | 'insercaoTituloTags'
  | 'insercaoTom'
  | 'insercaoPersonalizado';

export type PresetsPromptsPorIdioma = Record<IdiomaSaida, Partial<Record<ChavePrompt, string>>>;
export type AtalhosPrompts = Partial<Record<ChavePrompt, string>>;

// ==types== Faixas de palavras por ação e nível (Reescrever segue o tamanho do original)
export type IntencaoComFaixa = 'gerar' | 'resumir' | 'explicar' | 'expandir' | 'responder';
export interface FaixaPalavras {
  min: number;
  max: number;
}
export type FaixasPorIntencao = Record<IntencaoComFaixa, Record<NivelResposta, FaixaPalavras>>;

// ==types== Resultado do teste de velocidade de um modelo
export interface ResultadoVelocidadeModelo {
  modelo: ModeloGeminiDisponivel;
  ok: boolean;
  ms: number | null;
  status: number | null;
  /** Não respondeu dentro do limite do teste (15 s) */
  tempoEsgotado?: boolean;
}

// ==types== Configurações persistidas no data.json
export interface ConfiguracoesPlugin extends Record<ChavePrompt, string>, Record<ChaveFormato, boolean>, Record<ChaveTipoInsercao, TipoInsercao> {
  apiKey: string;
  idioma: IdiomaSaida;
  modeloPrincipal: ModeloGeminiDisponivel;
  usarFallbackAutomatico: boolean;
  usarModeloMaisRapido: boolean;
  ordemModelos: ModeloGeminiDisponivel[];
  resultadosVelocidade: ResultadoVelocidadeModelo[];
  testeVelocidadeEm: number | null;
  /** Gerações concluídas desde o último teste automático de velocidade */
  geracoesDesdeTeste: number;
  versaoModelos: number;
  versaoPrompts: number;
  versaoConfig: number;
  faixasPalavras: FaixasPorIntencao;
  /** Tamanho do resumo em relação à seleção, por nível (0.8 = 80%, 0.5 = metade) */
  fatoresResumo: Record<NivelResposta, number>;
  /** Tamanho da explicação em relação à seleção, por nível (2 = o dobro); sem seleção usa as faixas */
  fatoresExplicar: Record<NivelResposta, number>;
  /** Tamanho do texto expandido em relação à seleção, por nível (1.3 = 130%); sempre com seleção */
  fatoresExpandir: Record<NivelResposta, number>;
  /** Tamanho do texto reescrito em relação à seleção, por nível (0.8 = 80%); sempre com seleção */
  fatoresReescrever: Record<NivelResposta, number>;
  /** Idioma de destino da ação Traduzir: nome em inglês (ex.: "Japanese") ou texto digitado; o modal lembra a última escolha */
  idiomaTraducao: string;
  /** Quantidade de perguntas de revisão; o modal lembra a última escolha */
  quantidadePerguntas: number;
  /** Tom da ação Mudar o tom; o modal lembra a última escolha */
  tomPadrao: TomEscrita;
  usarStreaming: boolean;
  usarPreviewAntesInserir: boolean;
  usarControleTamanho: boolean;
  incluirContextoNota: boolean;
  temperatura: number;
  maxOutputTokens: number;
  removeHeadlineEnabled: boolean;
  perfilEscrita: PerfilEscrita;
  objetivoConteudo: ObjetivoConteudo;
  estiloResposta: EstiloResposta;
  posicaoBotaoFlutuante: PosicaoBotaoFlutuante;
  tamanhoBotaoFlutuante: TamanhoBotaoFlutuante;
  exibirTextoBotaoFlutuante: boolean;
  mostrarIndicadorModelo: boolean;
  menuFixado: boolean;
  /** Posição do menu IA na tela, definida pelo modo Mover (null = junto do botão IA) */
  menuPosicao: { x: number; y: number } | null;
  /** Tamanho do menu IA, definido pelo modo Mover (null = tamanho automático) */
  menuTamanho: { largura: number; altura: number } | null;
  grupoPadraoMenu: GrupoPadraoMenu;
  ultimoGrupoMenu: IdGrupoMenu | null;
  acoesFavoritas: string[];
  mostrarMenuContexto: boolean;
  presetsPromptsPorIdioma: PresetsPromptsPorIdioma;
  atalhosPrompts: AtalhosPrompts;
}

// ==types== Registro de uma inserção (usado para desfazer)
export interface RegistroUltimaGeracao {
  caminhoArquivo: string;
  prefixoInserido: string;
  textoInserido: string;
  inicioInsercao: { line: number; ch: number };
  fimInsercao: { line: number; ch: number };
  textoRemovido: string;
  inicioRemocao: { line: number; ch: number };
  fimRemocao: { line: number; ch: number };
}
