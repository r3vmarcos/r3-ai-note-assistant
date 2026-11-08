import type {
  ChaveFormato,
  ChaveTipoInsercao,
  FaixasPorIntencao,
  IntencaoComFaixa,
  ChavePrompt,
  ConfiguracoesPlugin,
  EstiloResposta,
  GrupoPadraoMenu,
  IdiomaSaida,
  ModeloGeminiDisponivel,
  NivelResposta,
  ObjetivoConteudo,
  PerfilEscrita,
  PosicaoBotaoFlutuante,
  PresetsPromptsPorIdioma,
  TamanhoBotaoFlutuante,
  TipoInsercao
} from '../tipos/configuracoes';

// ==data== Modelos de texto gratuitos, do melhor para o pior (também é a ordem do fallback)
// Verificados na documentação oficial da Gemini API (tabela de preços: Free tier "Free of charge").
// Fora da lista, de propósito: Live/TTS (não geram texto via generateContent), gemini-2.0-flash
// (descontinuado), gemma-3 (sem código na API) e gemma-4 (plano gratuito não confirmado).
export const MODELOS_GEMINI_DISPONIVEIS: ModeloGeminiDisponivel[] = [
  'gemini-3.6-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

// ==data== Versões de migração (modelos e estrutura de prompts)
export const VERSAO_LISTA_MODELOS = 5;
export const VERSAO_PROMPTS = 2;
export const VERSAO_CONFIG = 3;

// ==data== Opções dos dropdowns
export const IDIOMAS_DISPONIVEIS: IdiomaSaida[] = ['en', 'pt-BR', 'es', 'fr', 'de', 'ja', 'zh-CN'];
export const PERFIS_DISPONIVEIS: PerfilEscrita[] = ['livre', 'natural', 'objetivo', 'didatico', 'tecnico', 'academico', 'criativo'];
export const POSICOES_BOTAO_DISPONIVEIS: PosicaoBotaoFlutuante[] = ['esquerda', 'direita'];
export const TIPOS_INSERCAO_DISPONIVEIS: TipoInsercao[] = ['start', 'below', 'append', 'replace'];
export const TAMANHOS_BOTAO_DISPONIVEIS: TamanhoBotaoFlutuante[] = ['compacto', 'medio', 'grande'];
export const OBJETIVOS_DISPONIVEIS: ObjetivoConteudo[] = ['livre', 'geral', 'estudo', 'profissional', 'tecnico', 'apresentacao'];
export const GRUPOS_PADRAO_DISPONIVEIS: GrupoPadraoMenu[] = ['nenhum', 'ultimo', 'gerar', 'resumir', 'explicar', 'expandir', 'reescrever', 'responder', 'outros'];
export const NIVEIS_RESPOSTA: NivelResposta[] = ['resumido', 'padrao', 'expandido', 'ultra'];
export const ESTILOS_RESPOSTA: EstiloResposta[] = ['rico', 'equilibrado', 'simples', 'personalizado'];

export const CHAVES_DE_PROMPT: ChavePrompt[] = [
  'promptGerar',
  'promptResumir',
  'promptExplicar',
  'promptExpandir',
  'promptReescrever',
  'promptResponder',
  'promptCorrigir',
  'promptTraduzir',
  'promptTabela',
  'promptDiagrama',
  'promptPerguntas',
  'promptTituloTags',
  'promptTom',
  'promptPersonalizado'
];

export const CHAVES_FORMATO: ChaveFormato[] = [
  'formatoTabelas',
  'formatoListas',
  'formatoTitulos',
  'formatoCallouts',
  'formatoDiagramas',
  'formatoGraficos',
  'formatoLatex',
  'formatoNegrito'
];

// ==data== Presets de estilo: cada um liga/desliga os elementos de formato
export const PRESETS_ESTILO: Record<Exclude<EstiloResposta, 'personalizado'>, Record<ChaveFormato, boolean>> = {
  rico: {
    formatoTabelas: true,
    formatoListas: true,
    formatoTitulos: true,
    formatoCallouts: true,
    formatoDiagramas: true,
    formatoGraficos: true,
    formatoLatex: true,
    formatoNegrito: true
  },
  equilibrado: {
    formatoTabelas: true,
    formatoListas: true,
    formatoTitulos: true,
    formatoCallouts: true,
    formatoDiagramas: true,
    formatoGraficos: true,
    formatoLatex: true,
    formatoNegrito: true
  },
  simples: {
    formatoTabelas: false,
    formatoListas: false,
    formatoTitulos: false,
    formatoCallouts: false,
    formatoDiagramas: false,
    formatoGraficos: false,
    formatoLatex: true,
    formatoNegrito: true
  }
};

// ==data== Faixas padrão por ação e nível (palavras)
export const INTENCOES_COM_FAIXA: IntencaoComFaixa[] = ['gerar', 'resumir', 'explicar', 'expandir', 'responder'];
export const FAIXAS_PADRAO: FaixasPorIntencao = {
  gerar: { resumido: { min: 150, max: 300 }, padrao: { min: 350, max: 800 }, expandido: { min: 900, max: 1500 }, ultra: { min: 2000, max: 5000 } },
  resumir: { resumido: { min: 20, max: 60 }, padrao: { min: 60, max: 150 }, expandido: { min: 150, max: 300 }, ultra: { min: 300, max: 600 } },
  explicar: { resumido: { min: 100, max: 200 }, padrao: { min: 300, max: 500 }, expandido: { min: 700, max: 1200 }, ultra: { min: 1500, max: 2500 } },
  expandir: { resumido: { min: 100, max: 200 }, padrao: { min: 250, max: 450 }, expandido: { min: 500, max: 900 }, ultra: { min: 1500, max: 2500 } },
  responder: { resumido: { min: 10, max: 50 }, padrao: { min: 60, max: 150 }, expandido: { min: 150, max: 350 }, ultra: { min: 400, max: 800 } }
};

// ==function== Cópia profunda das faixas padrão (evita compartilhar referência)
// ==data== Tamanho do resumo em relação à seleção: Pouco 0,8× · Normal ½ · Compacto ⅓ · Ultra ⅕
// (as chaves são os níveis internos: expandido = Pouco, padrao = Normal, resumido = Compacto, ultra = Ultra)
export const FATORES_RESUMO_PADRAO: Record<NivelResposta, number> = {
  resumido: 0.33,
  padrao: 0.5,
  expandido: 0.8,
  ultra: 0.2
};

// ==data== Tamanho da explicação em relação à seleção (com seleção); sem seleção valem as faixas de palavras
export const FATORES_EXPLICAR_PADRAO: Record<NivelResposta, number> = {
  resumido: 3,
  padrao: 4,
  expandido: 6,
  ultra: 10
};

// ==data== Tamanho do Expandir em relação à seleção (sempre com seleção): Compacto 1.3×, Padrão 2×, Expandido 3×, Ultra 4×
export const FATORES_EXPANDIR_PADRAO: Record<NivelResposta, number> = {
  resumido: 1.3,
  padrao: 2,
  expandido: 3,
  ultra: 4
};

// ==data== Tamanho do Reescrever em relação à seleção (sempre com seleção): Resumido 0.8×, Normal 1×, Expandido 1.3×, Ultra 2×
export const FATORES_REESCREVER_PADRAO: Record<NivelResposta, number> = {
  resumido: 0.8,
  padrao: 1,
  expandido: 1.3,
  ultra: 2
};

export function clonarFaixasPadrao(): FaixasPorIntencao {
  return JSON.parse(JSON.stringify(FAIXAS_PADRAO)) as FaixasPorIntencao;
}

// ==data== Inserção padrão por ação
export const INSERCAO_PADRAO: Record<ChaveTipoInsercao, TipoInsercao> = {
  insercaoGerar: 'start',
  insercaoResumir: 'replace',
  insercaoExplicar: 'below',
  insercaoExpandir: 'replace',
  insercaoReescrever: 'below',
  insercaoResponder: 'below',
  insercaoCorrigir: 'replace',
  insercaoTraduzir: 'below',
  insercaoTabela: 'below',
  insercaoDiagrama: 'below',
  insercaoPerguntas: 'below',
  insercaoTituloTags: 'below',
  insercaoTom: 'replace',
  insercaoPersonalizado: 'below'
};

type PacotePromptsPadrao = Record<ChavePrompt, string>;

// ==data== Templates padrão por intenção. O nível e as regras de formato entram pelas diretrizes.
const PROMPTS_PADRAO_POR_IDIOMA: Record<IdiomaSaida, PacotePromptsPadrao> = {
  'pt-BR': {
    promptGerar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Escreva sobre {TITLE}, adaptando a forma ao tipo de assunto. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    promptResumir: '{IDIOMA_INSTRUCAO} Resuma o trecho abaixo com fidelidade, sem acrescentar informações que não estejam nele. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExplicar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Explique o trecho abaixo de forma clara e didática. Se não houver trecho, explique o tema {TITLE}. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExpandir: '{IDIOMA_INSTRUCAO} Expanda o trecho abaixo com mais contexto e detalhes, preservando o sentido, a ordem lógica e os termos importantes. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptReescrever: '{IDIOMA_INSTRUCAO} Reescreva o trecho abaixo com mais clareza e melhor organização, mantendo o sentido. Use {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptResponder: '{IDIOMA_INSTRUCAO} Responda à pergunta ou ao pedido do trecho abaixo de forma precisa e útil. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptCorrigir: '{IDIOMA_INSTRUCAO} Corrija gramática, ortografia, pontuação e fluidez do trecho abaixo, sem mudar o sentido, o tom nem a formatação existente. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTraduzir: 'Traduza o trecho abaixo para {IDIOMA_DESTINO}, com fidelidade e naturalidade, preservando a formatação Markdown, os links e os termos técnicos. Não explique a tradução. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTabela: '{IDIOMA_INSTRUCAO} Organize o conteúdo do trecho abaixo em uma tabela Markdown, com colunas que façam sentido para os dados. Se o conteúdo não tiver colunas naturais (por exemplo, uma sequência de passos), use uma lista numerada. Não invente dados. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptDiagrama: '{IDIOMA_INSTRUCAO} Represente o conteúdo do trecho abaixo em um diagrama Mermaid, escolhendo o tipo mais adequado (fluxo, sequência, linha do tempo ou mapa mental). Depois do diagrama, escreva uma frase curta explicando o que ele mostra. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPerguntas: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Crie {QUANTIDADE_PERGUNTAS} perguntas de revisão sobre o trecho abaixo, cada uma com a resposta, baseadas somente no conteúdo dele. Varie entre perguntas de fato, de compreensão e de aplicação. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTituloTags: '{IDIOMA_INSTRUCAO} Analise o texto abaixo e sugira um título curto e de 3 a 8 tags do Obsidian, em minúsculas e com hífen no lugar de espaços. {OBSERVACOES_ADICIONAIS}\n\n{TEXTO_ALVO}',
    promptTom: '{IDIOMA_INSTRUCAO} Reescreva o trecho abaixo com um tom {TOM}, mantendo o sentido, as informações e a formatação Markdown. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPersonalizado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Siga a instrução do usuário sobre {TITLE}. Se houver trecho selecionado, use-o como contexto principal. Use {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  },
  fr: {
    promptGerar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Écris sur {TITLE}, en adaptant la forme au type de sujet. Utilise {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    promptResumir: '{IDIOMA_INSTRUCAO} Résume fidèlement l’extrait ci-dessous, sans ajouter d’informations qui n’y figurent pas. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExplicar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Explique l’extrait ci-dessous de manière claire et pédagogique. S’il n’y a pas d’extrait, explique le sujet {TITLE}. Utilise {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExpandir: '{IDIOMA_INSTRUCAO} Développe l’extrait ci-dessous avec plus de contexte et de détails, en préservant le sens, l’ordre logique et les termes importants. Utilise {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptReescrever: '{IDIOMA_INSTRUCAO} Réécris l’extrait ci-dessous avec plus de clarté et une meilleure organisation, en gardant le sens. Utilise {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptResponder: '{IDIOMA_INSTRUCAO} Réponds de manière précise et utile à la question ou à la demande de l’extrait ci-dessous. Utilise {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptCorrigir: '{IDIOMA_INSTRUCAO} Corrige la grammaire, l’orthographe, la ponctuation et la fluidité de l’extrait ci-dessous, sans changer le sens, le ton ni la mise en forme existante. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTraduzir: 'Traduis l’extrait ci-dessous en {IDIOMA_DESTINO}, avec fidélité et naturel, en préservant la mise en forme Markdown, les liens et les termes techniques. N’explique pas la traduction. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTabela: '{IDIOMA_INSTRUCAO} Organise le contenu de l’extrait ci-dessous dans un tableau Markdown, avec des colonnes adaptées aux données. Si le contenu n’a pas de colonnes naturelles (par exemple, une suite d’étapes), utilise une liste numérotée. N’invente pas de données. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptDiagrama: '{IDIOMA_INSTRUCAO} Représente le contenu de l’extrait ci-dessous dans un diagramme Mermaid, en choisissant le type le plus adapté (flux, séquence, chronologie ou carte mentale). Après le diagramme, écris une phrase courte expliquant ce qu’il montre. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPerguntas: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Crée {QUANTIDADE_PERGUNTAS} questions de révision sur l’extrait ci-dessous, chacune avec sa réponse, basées uniquement sur son contenu. Varie entre questions factuelles, de compréhension et d’application. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTituloTags: '{IDIOMA_INSTRUCAO} Analyse le texte ci-dessous et propose un titre court et 3 à 8 tags Obsidian, en minuscules, avec un tiret à la place des espaces. {OBSERVACOES_ADICIONAIS}\n\n{TEXTO_ALVO}',
    promptTom: '{IDIOMA_INSTRUCAO} Réécris l’extrait ci-dessous avec un ton {TOM}, en gardant le sens, les informations et la mise en forme Markdown. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPersonalizado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Suis l’instruction de l’utilisateur concernant {TITLE}. S’il y a un extrait sélectionné, utilise-le comme contexte principal. Utilise {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  },
  de: {
    promptGerar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Schreibe über {TITLE} und passe die Form an die Art des Themas an. Verwende {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    promptResumir: '{IDIOMA_INSTRUCAO} Fasse den folgenden Abschnitt getreu zusammen, ohne Informationen hinzuzufügen, die nicht darin enthalten sind. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExplicar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Erkläre den folgenden Abschnitt klar und didaktisch. Gibt es keinen Abschnitt, erkläre das Thema {TITLE}. Verwende {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExpandir: '{IDIOMA_INSTRUCAO} Erweitere den folgenden Abschnitt um mehr Kontext und Details, unter Wahrung des Sinns, der logischen Reihenfolge und der wichtigen Begriffe. Verwende {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptReescrever: '{IDIOMA_INSTRUCAO} Formuliere den folgenden Abschnitt klarer und besser gegliedert um, ohne den Sinn zu verändern. Verwende {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptResponder: '{IDIOMA_INSTRUCAO} Beantworte die Frage oder Anfrage des folgenden Abschnitts präzise und hilfreich. Verwende {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptCorrigir: '{IDIOMA_INSTRUCAO} Korrigiere Grammatik, Rechtschreibung, Zeichensetzung und Lesefluss des folgenden Abschnitts, ohne Sinn, Ton oder bestehende Formatierung zu ändern. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTraduzir: 'Übersetze den folgenden Abschnitt in diese Sprache: {IDIOMA_DESTINO}. Übersetze treu und natürlich und behalte Markdown-Formatierung, Links und Fachbegriffe bei. Erkläre die Übersetzung nicht. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTabela: '{IDIOMA_INSTRUCAO} Ordne den Inhalt des folgenden Abschnitts in einer Markdown-Tabelle mit sinnvollen Spalten an. Hat der Inhalt keine natürlichen Spalten (zum Beispiel eine Abfolge von Schritten), verwende eine nummerierte Liste. Erfinde keine Daten. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptDiagrama: '{IDIOMA_INSTRUCAO} Stelle den Inhalt des folgenden Abschnitts als Mermaid-Diagramm dar und wähle den passendsten Typ (Ablauf, Sequenz, Zeitleiste oder Mindmap). Schreibe nach dem Diagramm einen kurzen Satz, der erklärt, was es zeigt. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPerguntas: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Erstelle {QUANTIDADE_PERGUNTAS} Wiederholungsfragen zum folgenden Abschnitt, jeweils mit Antwort, nur auf Grundlage seines Inhalts. Mische Fakten-, Verständnis- und Anwendungsfragen. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTituloTags: '{IDIOMA_INSTRUCAO} Analysiere den folgenden Text und schlage einen kurzen Titel sowie 3 bis 8 Obsidian-Tags vor, kleingeschrieben und mit Bindestrich statt Leerzeichen. {OBSERVACOES_ADICIONAIS}\n\n{TEXTO_ALVO}',
    promptTom: '{IDIOMA_INSTRUCAO} Formuliere den folgenden Abschnitt so um, dass der Ton {TOM} ist, und behalte Sinn, Informationen und Markdown-Formatierung bei. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPersonalizado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Folge der Anweisung des Nutzers zu {TITLE}. Gibt es einen markierten Abschnitt, verwende ihn als Hauptkontext. Verwende {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  },
  ja: {
    promptGerar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} {TITLE}について、テーマに合った形式で書いてください。{PERFIL_ESCRITA}を使用してください。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}',
    promptResumir: '{IDIOMA_INSTRUCAO} 以下の抜粋を、そこに書かれていない情報を加えずに忠実に要約してください。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExplicar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} 以下の抜粋を、明確で分かりやすく説明してください。抜粋がない場合は、{TITLE}というテーマを説明してください。{PERFIL_ESCRITA}を使用してください。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExpandir: '{IDIOMA_INSTRUCAO} 以下の抜粋に、意味、論理の順序、重要な用語を保ちながら、文脈と詳細を加えて展開してください。{PERFIL_ESCRITA}を使用してください。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptReescrever: '{IDIOMA_INSTRUCAO} 以下の抜粋を、意味を保ったまま、より明確で整理された文章に書き換えてください。{PERFIL_ESCRITA}を使用してください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptResponder: '{IDIOMA_INSTRUCAO} 以下の抜粋にある質問や依頼に、正確で役立つ形で答えてください。{PERFIL_ESCRITA}を使用してください。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptCorrigir: '{IDIOMA_INSTRUCAO} 以下の抜粋の文法、綴り、句読点、文の流れを、意味、トーン、既存の書式を変えずに修正してください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTraduzir: '以下の抜粋を{IDIOMA_DESTINO}に翻訳してください。忠実かつ自然に訳し、Markdownの書式、リンク、専門用語は保ってください。翻訳の説明は書かないでください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTabela: '{IDIOMA_INSTRUCAO} 以下の抜粋の内容を、データに合った列を持つMarkdownの表に整理してください。自然な列がない場合（例：手順の流れ）は番号付きリストを使ってください。データを作り出さないでください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptDiagrama: '{IDIOMA_INSTRUCAO} 以下の抜粋の内容を、最も適した種類（フローチャート、シーケンス、タイムライン、マインドマップ）のMermaid図で表してください。図の後に、何を示しているかを短い一文で説明してください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPerguntas: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} 以下の抜粋について、内容だけに基づいた復習問題を{QUANTIDADE_PERGUNTAS}問、それぞれ答え付きで作成してください。事実、理解、応用の問題を組み合わせてください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTituloTags: '{IDIOMA_INSTRUCAO} 以下のテキストを分析し、短いタイトルと3〜8個のObsidianタグを提案してください。タグは小文字で、スペースの代わりにハイフンを使ってください。{OBSERVACOES_ADICIONAIS}\n\n{TEXTO_ALVO}',
    promptTom: '{IDIOMA_INSTRUCAO} 以下の抜粋を、{TOM}トーンで書き直してください。意味、情報、Markdownの書式は保ってください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPersonalizado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} {TITLE}に関するユーザーの指示に従ってください。選択された抜粋がある場合は、それを主な文脈として使用してください。{PERFIL_ESCRITA}を使用してください。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  },
  'zh-CN': {
    promptGerar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} 围绕{TITLE}撰写内容，并根据主题类型调整形式。使用{PERFIL_ESCRITA}。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}',
    promptResumir: '{IDIOMA_INSTRUCAO} 忠实地总结下面的片段，不要添加其中没有的信息。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExplicar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} 清晰、有条理地解释下面的片段。如果没有片段，请解释主题{TITLE}。使用{PERFIL_ESCRITA}。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExpandir: '{IDIOMA_INSTRUCAO} 为下面的片段补充更多上下文和细节，同时保留原意、逻辑顺序和重要术语。使用{PERFIL_ESCRITA}。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptReescrever: '{IDIOMA_INSTRUCAO} 在保持原意的前提下，将下面的片段改写得更清晰、组织更好。使用{PERFIL_ESCRITA}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptResponder: '{IDIOMA_INSTRUCAO} 准确、有用地回答下面片段中的问题或请求。使用{PERFIL_ESCRITA}。{FAIXA_PALAVRAS}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptCorrigir: '{IDIOMA_INSTRUCAO} 修正下面片段的语法、拼写、标点和行文流畅度，不改变原意、语气或现有格式。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTraduzir: '将下面的片段翻译成{IDIOMA_DESTINO}，忠实自然，保留 Markdown 格式、链接和专业术语。不要解释翻译。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTabela: '{IDIOMA_INSTRUCAO} 将下面片段的内容整理成 Markdown 表格，列要符合数据的含义。如果内容没有自然的列（例如一系列步骤），请使用编号列表。不要编造数据。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptDiagrama: '{IDIOMA_INSTRUCAO} 用 Mermaid 图表示下面片段的内容，选择最合适的类型（流程图、时序图、时间线或思维导图）。在图之后，用一句简短的话说明它展示了什么。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPerguntas: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} 根据下面的片段创建 {QUANTIDADE_PERGUNTAS} 道复习题，每题附答案，只依据片段内容。混合事实题、理解题和应用题。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTituloTags: '{IDIOMA_INSTRUCAO} 分析下面的文本，建议一个简短的标题和 3 到 8 个 Obsidian 标签，使用小写，并用连字符代替空格。{OBSERVACOES_ADICIONAIS}\n\n{TEXTO_ALVO}',
    promptTom: '{IDIOMA_INSTRUCAO} 用{TOM}语气改写下面的片段，保留原意、信息和 Markdown 格式。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPersonalizado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} 遵循用户关于{TITLE}的指令。如果有选中的片段，请将其作为主要上下文。使用{PERFIL_ESCRITA}。{OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  },
  es: {
    promptGerar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Escribe sobre {TITLE}, adaptando la forma al tipo de tema. Usa {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    promptResumir: '{IDIOMA_INSTRUCAO} Resume el fragmento siguiente con fidelidad, sin agregar información que no esté en él. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExplicar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Explica el fragmento siguiente de forma clara y didáctica. Si no hay fragmento, explica el tema {TITLE}. Usa {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExpandir: '{IDIOMA_INSTRUCAO} Expande el fragmento siguiente con más contexto y detalles, preservando el sentido, el orden lógico y los términos importantes. Usa {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptReescrever: '{IDIOMA_INSTRUCAO} Reescribe el fragmento siguiente con más claridad y mejor organización, manteniendo el sentido. Usa {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptResponder: '{IDIOMA_INSTRUCAO} Responde a la pregunta o al pedido del fragmento siguiente de forma precisa y útil. Usa {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptCorrigir: '{IDIOMA_INSTRUCAO} Corrige gramática, ortografía, puntuación y fluidez del fragmento siguiente, sin cambiar el sentido, el tono ni el formato existente. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTraduzir: 'Traduce el fragmento siguiente a {IDIOMA_DESTINO}, con fidelidad y naturalidad, preservando el formato Markdown, los enlaces y los términos técnicos. No expliques la traducción. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTabela: '{IDIOMA_INSTRUCAO} Organiza el contenido del fragmento siguiente en una tabla Markdown, con columnas que tengan sentido para los datos. Si el contenido no tiene columnas naturales (por ejemplo, una secuencia de pasos), usa una lista numerada. No inventes datos. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptDiagrama: '{IDIOMA_INSTRUCAO} Representa el contenido del fragmento siguiente en un diagrama Mermaid, eligiendo el tipo más adecuado (flujo, secuencia, línea de tiempo o mapa mental). Después del diagrama, escribe una frase corta que explique lo que muestra. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPerguntas: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Crea {QUANTIDADE_PERGUNTAS} preguntas de repaso sobre el fragmento siguiente, cada una con su respuesta, basadas solo en su contenido. Combina preguntas de hechos, de comprensión y de aplicación. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTituloTags: '{IDIOMA_INSTRUCAO} Analiza el texto siguiente y sugiere un título corto y de 3 a 8 etiquetas de Obsidian, en minúsculas y con guion en lugar de espacios. {OBSERVACOES_ADICIONAIS}\n\n{TEXTO_ALVO}',
    promptTom: '{IDIOMA_INSTRUCAO} Reescribe el fragmento siguiente con un tono {TOM}, manteniendo el sentido, la información y el formato Markdown. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPersonalizado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Sigue la instrucción del usuario sobre {TITLE}. Si hay un fragmento seleccionado, úsalo como contexto principal. Usa {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  },
  en: {
    promptGerar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Write about {TITLE}, adapting the form to the kind of subject. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    promptResumir: '{IDIOMA_INSTRUCAO} Summarize the excerpt below faithfully, without adding information that is not in it. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExplicar: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Explain the excerpt below clearly and didactically. If there is no excerpt, explain the topic {TITLE}. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptExpandir: '{IDIOMA_INSTRUCAO} Expand the excerpt below with more context and detail while preserving the meaning, logical order and important terms. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptReescrever: '{IDIOMA_INSTRUCAO} Rewrite the excerpt below with more clarity and better organization while keeping the meaning. Use {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptResponder: '{IDIOMA_INSTRUCAO} Answer the question or request in the excerpt below precisely and usefully. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptCorrigir: '{IDIOMA_INSTRUCAO} Correct grammar, spelling, punctuation and flow in the excerpt below without changing the meaning, tone or existing formatting. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTraduzir: 'Translate the excerpt below into {IDIOMA_DESTINO}, faithfully and naturally, preserving Markdown formatting, links and technical terms. Do not explain the translation. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTabela: '{IDIOMA_INSTRUCAO} Organize the content of the excerpt below into a Markdown table with columns that make sense for the data. If the content has no natural columns (for example, a sequence of steps), use a numbered list. Do not invent data. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptDiagrama: '{IDIOMA_INSTRUCAO} Represent the content of the excerpt below as a Mermaid diagram, choosing the most suitable type (flowchart, sequence, timeline or mind map). After the diagram, write one short sentence explaining what it shows. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPerguntas: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Create {QUANTIDADE_PERGUNTAS} review questions about the excerpt below, each with its answer, based only on its content. Mix factual, comprehension and application questions. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptTituloTags: '{IDIOMA_INSTRUCAO} Analyze the text below and suggest a short title and 3 to 8 Obsidian tags, lowercase, with hyphens instead of spaces. {OBSERVACOES_ADICIONAIS}\n\n{TEXTO_ALVO}',
    promptTom: '{IDIOMA_INSTRUCAO} Rewrite the excerpt below in a {TOM} tone, keeping the meaning, the information and the Markdown formatting. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    promptPersonalizado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Follow the user instruction about {TITLE}. If there is a selected excerpt, use it as the main context. Use {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  }
};

// ==section== Funções de presets de prompt por idioma
export function obterPromptsPadraoPorIdioma(idioma: IdiomaSaida): PacotePromptsPadrao {
  return { ...PROMPTS_PADRAO_POR_IDIOMA[idioma] };
}

export function capturarPromptsAtuais(configuracoes: ConfiguracoesPlugin): PacotePromptsPadrao {
  const pacote = {} as PacotePromptsPadrao;

  for (const chave of CHAVES_DE_PROMPT) {
    pacote[chave] = configuracoes[chave];
  }

  return pacote;
}

export function aplicarPromptsDoIdiomaNaConfiguracao(configuracoes: ConfiguracoesPlugin, idioma: IdiomaSaida): ConfiguracoesPlugin {
  const presetSalvo = configuracoes.presetsPromptsPorIdioma?.[idioma] ?? {};
  const padrao = obterPromptsPadraoPorIdioma(idioma);

  return {
    ...configuracoes,
    idioma,
    ...padrao,
    ...presetSalvo
  };
}

export function salvarPresetAtualDoIdioma(configuracoes: ConfiguracoesPlugin, idioma: IdiomaSaida): ConfiguracoesPlugin {
  const presetsPromptsPorIdioma: PresetsPromptsPorIdioma = {
    ...configuracoes.presetsPromptsPorIdioma,
    [idioma]: capturarPromptsAtuais(configuracoes)
  };

  return {
    ...configuracoes,
    presetsPromptsPorIdioma
  };
}

// ==function== Idioma inicial: português do Brasil só se o sistema estiver em pt-BR; caso contrário, inglês
export function obterIdiomaPadraoDoSistema(): IdiomaSaida {
  const idiomaSistema = typeof navigator === 'undefined' ? '' : navigator.language;
  return idiomaSistema.toLowerCase().startsWith('pt-br') ? 'pt-BR' : 'en';
}

const IDIOMA_INICIAL = obterIdiomaPadraoDoSistema();

export const CONFIGURACOES_PADRAO: ConfiguracoesPlugin = {
  apiKey: '',
  idioma: IDIOMA_INICIAL,
  modeloPrincipal: 'gemini-3.6-flash',
  usarFallbackAutomatico: true,
  usarModeloMaisRapido: true,
  ordemModelos: [],
  resultadosVelocidade: [],
  testeVelocidadeEm: null,
  geracoesDesdeTeste: 0,
  versaoModelos: VERSAO_LISTA_MODELOS,
  versaoPrompts: VERSAO_PROMPTS,
  versaoConfig: VERSAO_CONFIG,
  usarStreaming: true,
  usarPreviewAntesInserir: false,
  usarControleTamanho: false,
  incluirContextoNota: true,
  temperatura: 0.7,
  maxOutputTokens: 8192,
  removeHeadlineEnabled: true,
  perfilEscrita: 'natural',
  objetivoConteudo: 'geral',
  estiloResposta: 'equilibrado',
  ...PRESETS_ESTILO.equilibrado,
  posicaoBotaoFlutuante: 'esquerda',
  tamanhoBotaoFlutuante: 'medio',
  exibirTextoBotaoFlutuante: true,
  mostrarIndicadorModelo: true,
  grupoPadraoMenu: 'ultimo',
  ultimoGrupoMenu: null,
  acoesFavoritas: [],
  mostrarMenuContexto: true,
  menuFixado: false,
  menuPosicao: null,
  menuTamanho: null,
  ...INSERCAO_PADRAO,
  faixasPalavras: clonarFaixasPadrao(),
  fatoresResumo: { ...FATORES_RESUMO_PADRAO },
  fatoresExplicar: { ...FATORES_EXPLICAR_PADRAO },
  fatoresExpandir: { ...FATORES_EXPANDIR_PADRAO },
  fatoresReescrever: { ...FATORES_REESCREVER_PADRAO },
  idiomaTraducao: 'English',
  quantidadePerguntas: 10,
  tomPadrao: 'formal',
  presetsPromptsPorIdioma: {
    'pt-BR': obterPromptsPadraoPorIdioma('pt-BR'),
    en: obterPromptsPadraoPorIdioma('en'),
    es: obterPromptsPadraoPorIdioma('es'),
    fr: obterPromptsPadraoPorIdioma('fr'),
    de: obterPromptsPadraoPorIdioma('de'),
    ja: obterPromptsPadraoPorIdioma('ja'),
    'zh-CN': obterPromptsPadraoPorIdioma('zh-CN')
  },
  atalhosPrompts: {},
  ...obterPromptsPadraoPorIdioma(IDIOMA_INICIAL)
};
