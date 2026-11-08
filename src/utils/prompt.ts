import { descreverIdiomaTraducao } from '../data/idiomas-traducao';
import { obterInstrucaoIdioma, obterInstrucaoPerfil } from '../i18n';
import { INTENCOES_COM_FAIXA } from '../settings/padroes';
import type { ConfiguracoesPlugin, IdGrupoMenu, IdiomaSaida, IntencaoComFaixa, NivelResposta, ObjetivoConteudo, TomEscrita } from '../tipos/configuracoes';
import type { ContextoEditor } from './editor';
import { calcularPalavrasExpandir, calcularPalavrasResumo, contarPalavras } from './resumo';

// ==types== O que o prompt precisa saber sobre a ação
export interface AlvoPrompt {
  id?: string;
  grupo: IdGrupoMenu;
  nivel: NivelResposta | null;
}

// Id da ação Corrigir gramática (fica no grupo Outros, mas preserva a formatação como uma correção)
const ID_ACAO_CORRIGIR = 'corrigir-gramatica';
const ID_ACAO_TRADUZIR = 'traduzir-selecao';

// ==data== Ferramentas do grupo Outros: transformam o texto mantendo a formatação original
const ACOES_PRESERVAM_FORMATO = new Set([ID_ACAO_CORRIGIR, ID_ACAO_TRADUZIR, 'mudar-tom']);
// Todas as ferramentas (formato de saída próprio e sem contexto extra da nota)
const ACOES_FERRAMENTA = new Set([...ACOES_PRESERVAM_FORMATO, 'converter-tabela', 'criar-diagrama', 'perguntas-revisao', 'sugerir-titulo-tags']);

// ==data== Tom escolhido no modal de "Mudar o tom" (preenche {TOM})
const TEXTO_POR_TOM: Record<TomEscrita, Texto> = {
  formal: { 'pt-BR': 'mais formal', en: 'more formal', es: 'más formal', fr: 'plus formel', de: 'formeller', ja: 'よりフォーマルな', 'zh-CN': '更正式的' },
  simples: { 'pt-BR': 'mais simples e acessível', en: 'simpler and more accessible', es: 'más sencillo y accesible', fr: 'plus simple et accessible', de: 'einfacher und zugänglicher', ja: 'よりシンプルで分かりやすい', 'zh-CN': '更简单易懂的' },
  tecnico: { 'pt-BR': 'mais técnico e preciso', en: 'more technical and precise', es: 'más técnico y preciso', fr: 'plus technique et précis', de: 'technischer und präziser', ja: 'より専門的で正確な', 'zh-CN': '更专业、更精确的' }
};

// ==data== Limite de caracteres da nota usada por "Sugerir título e tags" quando não há seleção
const LIMITE_TEXTO_NOTA = 15000;

// Textos das diretrizes: o inglês é o fallback para idiomas sem tradução específica
type Texto = Partial<Record<IdiomaSaida, string>> & { en: string };

// ==function== Escolhe o texto do idioma atual
function t(idioma: IdiomaSaida, texto: Texto): string {
  return texto[idioma] ?? texto.en;
}

// ==function== Monta o prompt final: template + variáveis + instrução do usuário + diretrizes
export function renderizarPrompt(alvo: AlvoPrompt, template: string, contexto: ContextoEditor, configuracoes: ConfiguracoesPlugin, instrucaoPersonalizada = ''): string {
  const idioma = configuracoes.idioma;
  const promptBase = template
    .replace(/\{TITLE\}/g, contexto.tituloNota)
    .replace(/\{IDIOMA_DESTINO\}/g, descreverIdiomaTraducao(configuracoes.idiomaTraducao))
    .replace(/\{TOM\}/g, obterTom(alvo, configuracoes))
    .replace(/\{QUANTIDADE_PERGUNTAS\}/g, String(configuracoes.quantidadePerguntas))
    .replace(/\{SELECT\}/g, contexto.selecao)
    .replace(/\{FAIXA_PALAVRAS\}/g, montarFaixaPalavras(alvo, configuracoes, contexto))
    .replace(/\{PERFIL_ESCRITA\}/g, obterInstrucaoPerfil(idioma, configuracoes.perfilEscrita))
    .replace(/\{IDIOMA_INSTRUCAO\}/g, obterInstrucaoIdioma(idioma))
    .replace(/\{OBJETIVO_INSTRUCAO\}/g, obterInstrucaoObjetivo(idioma, configuracoes.objetivoConteudo))
    .replace(/\{OBSERVACOES_ADICIONAIS\}/g, obterObservacoes(alvo, idioma))
    .replace(/\{NIVEL\}/g, alvo.nivel ? obterInstrucaoNivel(alvo, idioma) : '')
    .replace(/\{CONTEXTO_NOTA\}/g, configuracoes.incluirContextoNota ? contexto.resumoContexto : '')
    // Por último: a seleção ou, sem seleção, a nota inteira (limitada)
    .replace(/\{TEXTO_ALVO\}/g, contexto.selecao.trim() ? contexto.selecao : contexto.textoCompleto.slice(0, LIMITE_TEXTO_NOTA));

  const promptComContexto = anexarContextoNota(alvo, promptBase, template, contexto, configuracoes);
  const promptComInstrucao = aplicarInstrucaoPersonalizada(promptComContexto, instrucaoPersonalizada, idioma);
  return `${montarDiretrizes(alvo, configuracoes)}\n\n${promptComInstrucao}`.trim();
}

// ==function== Contexto da nota vai ao final quando o template não usa {CONTEXTO_NOTA}
const GRUPOS_COM_CONTEXTO: IdGrupoMenu[] = ['gerar', 'explicar', 'expandir', 'responder', 'outros'];

function anexarContextoNota(alvo: AlvoPrompt, prompt: string, template: string, contexto: ContextoEditor, configuracoes: ConfiguracoesPlugin): string {
  // As ferramentas do grupo Outros trabalham só com o texto selecionado
  const usaContexto = GRUPOS_COM_CONTEXTO.includes(alvo.grupo) && !(alvo.id && ACOES_FERRAMENTA.has(alvo.id));
  if (!usaContexto || !configuracoes.incluirContextoNota || template.includes('{CONTEXTO_NOTA}') || !contexto.resumoContexto) {
    return prompt;
  }
  const rotulo = configuracoes.idioma === 'pt-BR' ? 'Contexto da nota (use só como referência)' : 'Note context (reference only)';
  return `${prompt}\n\n${rotulo}:\n${contexto.resumoContexto}`;
}

// ==function== Insere a instrução digitada no menu ({INSTRUCAO} no template ou bloco ao final)
function aplicarInstrucaoPersonalizada(prompt: string, instrucao: string, idioma: IdiomaSaida): string {
  const instrucaoLimpa = instrucao.trim();
  if (!instrucaoLimpa) {
    return prompt.replace(/\{INSTRUCAO\}/g, '');
  }
  if (prompt.includes('{INSTRUCAO}')) {
    return prompt.replace(/\{INSTRUCAO\}/g, instrucaoLimpa);
  }
  const rotulo = idioma === 'pt-BR' ? 'Instrução do usuário' : 'User instruction';
  return `${prompt}\n\n${rotulo}:\n${instrucaoLimpa}`;
}

// ==section== Diretrizes (nível + formato + regras da intenção)
export function montarDiretrizes(alvo: AlvoPrompt, configuracoes: ConfiguracoesPlugin): string {
  const idioma = configuracoes.idioma;
  const linhas: string[] = [t(idioma, { 'pt-BR': 'Diretrizes de saída:', en: 'Output guidelines:' })];
  const adicionar = (texto: Texto): void => {
    linhas.push(`- ${t(idioma, texto)}`);
  };

  // Traduzir escreve no idioma de destino; as demais ações, no idioma do plugin
  if (alvo.id === ID_ACAO_TRADUZIR) {
    const destino = descreverIdiomaTraducao(configuracoes.idiomaTraducao);
    adicionar({ 'pt-BR': `escreva a tradução em ${destino};`, en: `write the translation in ${destino};` });
  } else {
    adicionar({ 'pt-BR': 'escreva em português do Brasil;', en: 'write in English;' });
  }

  if (alvo.nivel) {
    linhas.push(`- ${obterInstrucaoNivel(alvo, idioma)}`);
  }

  if (configuracoes.perfilEscrita === 'livre') {
    adicionar({
      'pt-BR': 'no perfil Livre, não imponha tom fixo nem estrutura padrão; siga a forma que o conteúdo pedir;',
      en: 'in the Free profile, do not impose a fixed tone or standard structure; follow the form the content calls for;'
    });
  }

  linhas.push(...montarRegrasFormato(alvo, configuracoes).map((regra) => `- ${regra}`));
  linhas.push(...montarRegrasIntencao(alvo, configuracoes).map((regra) => `- ${regra}`));

  adicionar({ 'pt-BR': 'comece direto pelo conteúdo, sem introduções genéricas nem conclusões artificiais;', en: 'start directly with the content, without generic introductions or artificial conclusions;' });
  adicionar({ 'pt-BR': 'não escreva rótulos como "Resposta:" ou "Resumo:" no início;', en: 'do not write labels such as "Answer:" or "Summary:" at the start;' });
  adicionar({ 'pt-BR': 'entregue apenas o texto final em Markdown, sem envolver a resposta inteira em bloco de código.', en: 'deliver only the final Markdown text, without wrapping the whole answer in a code block.' });

  return linhas.join('\n');
}

// ==function== Texto do nível (tamanho e profundidade, decisão 4)
function obterInstrucaoNivel(alvo: AlvoPrompt, idioma: IdiomaSaida): string {
  if (alvo.grupo === 'reescrever') {
    const mapaReescrita: Record<NivelResposta, Texto> = {
      resumido: { 'pt-BR': 'nível RESUMIDO: deixe o texto mais curto e direto que o original, mantendo só o essencial;', en: 'SHORT level: make the text shorter and more direct than the original, keeping only the essentials;' },
      padrao: { 'pt-BR': 'nível PADRÃO: mantenha um tamanho próximo ao do original;', en: 'STANDARD level: keep a length close to the original;' },
      expandido: { 'pt-BR': 'nível EXPANDIDO: desenvolva um pouco mais as ideias do original, sem inventar fatos;', en: 'EXPANDED level: develop the original ideas a bit further without inventing facts;' },
      ultra: { 'pt-BR': 'nível ULTRA: desenvolva o original em profundidade máxima, com mais exemplos e detalhes, sem inventar fatos;', en: 'ULTRA level: develop the original in maximum depth, with more examples and details, without inventing facts;' }
    };
    return t(idioma, mapaReescrita[alvo.nivel ?? 'padrao']);
  }

  const mapa: Record<NivelResposta, Texto> = {
    resumido: {
      'pt-BR': 'nível RESUMIDO: entregue só o essencial, com poucas frases, sem exemplos nem desvios;',
      en: 'SHORT level: deliver only the essentials in a few sentences, without examples or digressions;'
    },
    padrao: {
      'pt-BR': 'nível PADRÃO: resposta completa e equilibrada, cobrindo os pontos principais sem se alongar;',
      en: 'STANDARD level: a complete, balanced answer that covers the main points without running long;'
    },
    expandido: {
      'pt-BR': 'nível EXPANDIDO: aprofunde com contexto, exemplos, comparações, nuances e exceções relevantes;',
      en: 'EXPANDED level: go deeper with context, examples, comparisons, nuances and relevant exceptions;'
    },
    ultra: {
      'pt-BR': 'nível ULTRA: aprofunde ao máximo o conteúdo, com contexto, exemplos, comparações e nuances, mas dentro do tamanho indicado, sem repetir ideias;',
      en: 'ULTRA level: go as deep as possible with context, examples, comparisons and nuances, but within the indicated length, without repeating ideas;'
    }
  };
  return t(idioma, mapa[alvo.nivel ?? 'padrao']);
}

// ==function== Regras de formatação automática (decisões 7 a 12 + preset da decisão 14)
function montarRegrasFormato(alvo: AlvoPrompt, configuracoes: ConfiguracoesPlugin): string[] {
  const idioma = configuracoes.idioma;
  const regras: string[] = [];
  const ehRico = configuracoes.estiloResposta === 'rico';
  // Correção, tradução e tons mantêm a formatação original e não acrescentam elementos
  if (alvo.id && ACOES_PRESERVAM_FORMATO.has(alvo.id)) {
    regras.push(t(idioma, { 'pt-BR': 'preserve exatamente a formatação Markdown existente; não acrescente tabelas, listas, títulos, callouts nem diagramas;', en: 'preserve the existing Markdown formatting exactly; do not add tables, lists, headings, callouts or diagrams;' }));
    return regras;
  }

  // Tabela, diagrama, perguntas e título/tags têm formato de saída próprio
  const regrasFerramenta = obterRegrasFerramenta(alvo, configuracoes);
  if (regrasFerramenta) {
    return regrasFerramenta;
  }

  regras.push(
    t(idioma, {
      'pt-BR': `escolha o formato pela leitura: ${ehRico ? 'prefira elementos visuais sempre que deixarem o conteúdo mais fácil de escanear' : 'use elementos de formatação só quando melhorarem a leitura'}; texto corrido para argumentação e narrativa;`,
      en: `choose the format for readability: ${ehRico ? 'prefer visual elements whenever they make the content easier to scan' : 'use formatting elements only when they improve readability'}; flowing prose for arguments and narrative;`
    })
  );

  regras.push(
    configuracoes.formatoTabelas
      ? t(idioma, { 'pt-BR': 'use tabela Markdown quando comparar 2 ou mais itens em 2 ou mais atributos, ou quando houver dados tabulares; cabeçalho curto, células curtas;', en: 'use a Markdown table when comparing 2 or more items across 2 or more attributes, or for tabular data; short headers and cells;' })
      : t(idioma, { 'pt-BR': 'não use tabelas;', en: 'do not use tables;' })
  );

  regras.push(
    configuracoes.formatoListas
      ? t(idioma, { 'pt-BR': 'use listas para passos, requisitos ou itens independentes; listas numeradas só quando a ordem importar;', en: 'use lists for steps, requirements or independent items; numbered lists only when order matters;' })
      : t(idioma, { 'pt-BR': 'não use listas nem tópicos; escreva em parágrafos conectados;', en: 'do not use lists or bullet points; write connected paragraphs;' })
  );

  const podeUsarTitulos = configuracoes.formatoTitulos && (alvo.nivel === 'expandido' || alvo.nivel === 'ultra' || alvo.grupo === 'outros');
  regras.push(
    podeUsarTitulos
      ? t(idioma, { 'pt-BR': 'use títulos ## e ### só quando a resposta tiver 3 ou mais partes; nunca use # nem repita o título da nota;', en: 'use ## and ### headings only when the answer has 3 or more parts; never use # or repeat the note title;' })
      : t(idioma, { 'pt-BR': 'não use títulos (#, ##, ###);', en: 'do not use headings (#, ##, ###);' })
  );

  if (configuracoes.formatoNegrito) {
    regras.push(t(idioma, { 'pt-BR': 'use **negrito** com moderação, só em termos-chave;', en: 'use **bold** sparingly, only on key terms;' }));
  }

  if (configuracoes.formatoCallouts) {
    regras.push(
      t(idioma, {
        'pt-BR': `use callouts do Obsidian (> [!tip], > [!warning], > [!example], > [!info]) só para dica, alerta ou exemplo real; no máximo ${ehRico ? 3 : 2} por resposta;`,
        en: `use Obsidian callouts (> [!tip], > [!warning], > [!example], > [!info]) only for a real tip, warning or example; at most ${ehRico ? 3 : 2} per answer;`
      })
    );
  } else {
    regras.push(t(idioma, { 'pt-BR': 'não use callouts (> [!...]);', en: 'do not use callouts (> [!...]);' }));
  }

  regras.push(
    configuracoes.formatoLatex
      ? t(idioma, { 'pt-BR': 'em matemática, física ou química, escreva fórmulas em LaTeX: $...$ na linha e $$...$$ em bloco; fora disso, não use LaTeX;', en: 'for math, physics or chemistry, write formulas in LaTeX: $...$ inline and $$...$$ for blocks; otherwise do not use LaTeX;' })
      : t(idioma, { 'pt-BR': 'escreva fórmulas em texto simples, sem LaTeX;', en: 'write formulas in plain text, without LaTeX;' })
  );

  // No nível Resumido não cabe diagrama
  regras.push(...montarRegrasDiagramas(configuracoes, ehRico, alvo.nivel === 'resumido'));
  return regras;
}

// ==function== Regras de Mermaid (decisões 11 e 12)
function montarRegrasDiagramas(configuracoes: ConfiguracoesPlugin, ehRico: boolean, bloquear: boolean): string[] {
  const idioma = configuracoes.idioma;
  const tipos: string[] = [];
  if (bloquear) {
    return [t(idioma, { 'pt-BR': 'não use diagramas Mermaid nem blocos de código neste nível;', en: 'do not use Mermaid diagrams or code blocks at this level;' })];
  }
  if (configuracoes.formatoDiagramas) {
    tipos.push('flowchart', 'sequenceDiagram', 'timeline', 'mindmap');
  }
  if (configuracoes.formatoGraficos) {
    tipos.push('pie', 'quadrantChart', 'xychart-beta');
  }

  if (tipos.length === 0) {
    return [t(idioma, { 'pt-BR': 'não use diagramas Mermaid nem blocos de código (exceto código, se o tema for programação);', en: 'do not use Mermaid diagrams or code blocks (except code, if the subject is programming);' })];
  }

  const limite = ehRico ? 2 : 1;
  return [
    t(idioma, {
      'pt-BR': `quando o conteúdo tiver processo, hierarquia, cronologia ou proporções, inclua no máximo ${limite} diagrama Mermaid em bloco \`\`\`mermaid, sempre com texto explicando; tipos permitidos: ${tipos.join(', ')};`,
      en: `when the content has a process, hierarchy, chronology or proportions, include at most ${limite} Mermaid diagram in a \`\`\`mermaid block, always with explanatory text; allowed types: ${tipos.join(', ')};`
    }),
    regraSintaxeMermaid(idioma),
    t(idioma, { 'pt-BR': 'não use outros blocos de código, exceto se o tema for programação;', en: 'do not use other code blocks unless the subject is programming;' })
  ];
}

// ==function== Regra de sintaxe do Mermaid (rótulos entre aspas, sem estilos)
function regraSintaxeMermaid(idioma: IdiomaSaida): string {
  return t(idioma, {
    'pt-BR': 'no Mermaid use sintaxe simples e válida: todo rótulo entre colchetes ou parênteses deve ficar entre aspas duplas quando tiver espaço, acento ou pontuação (ex.: D["Núcleo Externo (Líquido)"], nunca D[Núcleo Externo (Líquido)]); sem estilos, cores nem comentários;',
    en: 'in Mermaid use simple, valid syntax: every label inside brackets or parentheses must be in double quotes when it has spaces, accents or punctuation (e.g. D["Outer Core (Liquid)"], never D[Outer Core (Liquid)]); no styles, colors or comments;'
  });
}

// ==function== Formato de saída das ferramentas do grupo Outros (null = ação comum)
function obterRegrasFerramenta(alvo: AlvoPrompt, configuracoes: ConfiguracoesPlugin): string[] | null {
  const idioma = configuracoes.idioma;

  switch (alvo.id) {
    case 'converter-tabela':
      return [
        t(idioma, {
          'pt-BR': 'responda somente com a tabela Markdown (ou a lista numerada), sem texto antes ou depois; cabeçalho e células curtos;',
          en: 'reply only with the Markdown table (or the numbered list), with no text before or after; short headers and cells;'
        })
      ];
    case 'criar-diagrama': {
      // Os diagramas são o objetivo da ação, então valem mesmo com "Diagramas" desligado nas configurações
      const tipos = ['flowchart', 'sequenceDiagram', 'timeline', 'mindmap', ...(configuracoes.formatoGraficos ? ['pie', 'quadrantChart', 'xychart-beta'] : [])];
      return [
        t(idioma, {
          'pt-BR': `use exatamente um bloco \`\`\`mermaid, com um destes tipos: ${tipos.join(', ')};`,
          en: `use exactly one \`\`\`mermaid block, with one of these types: ${tipos.join(', ')};`
        }),
        regraSintaxeMermaid(idioma),
        t(idioma, { 'pt-BR': 'não use títulos, tabelas nem outros blocos de código;', en: 'do not use headings, tables or other code blocks;' })
      ];
    }
    case 'perguntas-revisao':
      return [
        // A quantidade escolhida no modal vale mesmo se o prompt editado citar outro número
        t(idioma, {
          'pt-BR': `crie exatamente ${configuracoes.quantidadePerguntas} perguntas; essa quantidade tem prioridade sobre qualquer outra citada no pedido;`,
          en: `create exactly ${configuracoes.quantidadePerguntas} questions; this number takes priority over any other mentioned in the request;`
        }),
        t(idioma, {
          'pt-BR': 'formato: cada pergunta em um callout recolhível do Obsidian, "> [!question]- Pergunta", com a resposta nas linhas seguintes dentro do mesmo callout (cada linha começando com "> "); deixe uma linha em branco entre os callouts; não use títulos;',
          en: 'format: each question in a collapsible Obsidian callout, "> [!question]- Question", with the answer on the following lines inside the same callout (each line starting with "> "); leave a blank line between callouts; do not use headings;'
        })
      ];
    case 'sugerir-titulo-tags':
      return [
        t(idioma, {
          'pt-BR': 'formato: exatamente duas linhas, "**Título:** ..." e "**Tags:** #tag-um #tag-dois"; nada além disso;',
          en: 'format: exactly two lines, "**Title:** ..." and "**Tags:** #tag-one #tag-two"; nothing else;'
        })
      ];
    default:
      return null;
  }
}

// ==function== Tom pedido (vazio para ações que não são "Mudar o tom")
function obterTom(alvo: AlvoPrompt, configuracoes: ConfiguracoesPlugin): string {
  if (alvo.id !== 'mudar-tom') {
    return '';
  }
  const tom = TEXTO_POR_TOM[configuracoes.tomPadrao] ?? TEXTO_POR_TOM.formal;
  return t(configuracoes.idioma, tom);
}

// ==function== Regras específicas de cada intenção (decisão 6 para Resumir)
function montarRegrasIntencao(alvo: AlvoPrompt, configuracoes: ConfiguracoesPlugin): string[] {
  const idioma = configuracoes.idioma;
  const regras: string[] = [];

  if (alvo.grupo === 'resumir') {
    const quantidade = alvo.nivel === 'resumido' ? '2 a 3' : alvo.nivel === 'padrao' ? '3 a 7' : '5 a 9';
    regras.push(
      configuracoes.formatoListas
        ? t(idioma, {
            'pt-BR': `formato do resumo: uma primeira linha em negrito com a ideia central em uma frase e, abaixo, ${quantidade} tópicos-chave curtos;`,
            en: `summary format: a first bold line with the core idea in one sentence and, below it, ${quantidade} short key points;`
          })
        : t(idioma, { 'pt-BR': 'formato do resumo: uma frase com a ideia central seguida de um parágrafo curto;', en: 'summary format: one sentence with the core idea followed by a short paragraph;' })
    );
  }

  if (alvo.grupo === 'resumir' || alvo.grupo === 'expandir' || alvo.grupo === 'reescrever') {
    regras.push(t(idioma, { 'pt-BR': 'preserve o sentido do trecho original; não invente fatos;', en: 'preserve the meaning of the original excerpt; do not invent facts;' }));
  }

  if (alvo.grupo === 'expandir') {
    regras.push(t(idioma, { 'pt-BR': 'mantenha coerência com a nota atual e não repita o trecho original na resposta;', en: 'keep coherence with the current note and do not repeat the original excerpt in the answer;' }));
  }

  return regras;
}

// ==function== Faixa de palavras configurada para a ação e o nível
function montarFaixaPalavras(alvo: AlvoPrompt, configuracoes: ConfiguracoesPlugin, contexto: ContextoEditor): string {
  const idioma = configuracoes.idioma;
  const semFaixa = t(idioma, {
    'pt-BR': 'use o tamanho necessário para completar o conteúdo com coerência, respeitando o nível pedido',
    en: 'use the length needed to complete the content coherently, respecting the requested level'
  });

  // Resumir: o alvo é calculado a partir do tamanho do texto selecionado e do fator do nível
  if (alvo.grupo === 'resumir' && alvo.nivel) {
    const palavrasOriginais = contarPalavras(contexto.selecao);
    const palavrasAlvo = calcularPalavrasResumo(palavrasOriginais, configuracoes.fatoresResumo[alvo.nivel]);
    return t(idioma, {
      'pt-BR': `resuma em cerca de ${palavrasAlvo} palavras (o trecho original tem ${palavrasOriginais}), mantendo o essencial`,
      en: `summarize in about ${palavrasAlvo} words (the original excerpt has ${palavrasOriginais}), keeping the essentials`
    });
  }

  const grupoComFaixa = (INTENCOES_COM_FAIXA as string[]).includes(alvo.grupo) ? (alvo.grupo as IntencaoComFaixa) : null;
  const ehTextoLongo = alvo.grupo === 'gerar' || alvo.grupo === 'explicar' || alvo.grupo === 'expandir';
  const perfilSemFaixa = ['natural', 'livre'].includes(configuracoes.perfilEscrita) && ehTextoLongo;
  // Explicar com seleção: o alvo vem do fator do nível (sem seleção, valem as faixas abaixo)
  // (vale também nos perfis Natural e Livre: o tamanho pedido tem prioridade sobre a orientação de extensão do perfil)
  if (alvo.grupo === 'explicar' && alvo.nivel && contexto.selecao.trim()) {
    const palavrasOriginais = contarPalavras(contexto.selecao);
    const palavrasAlvo = calcularPalavrasResumo(palavrasOriginais, configuracoes.fatoresExplicar[alvo.nivel]);
    return t(idioma, {
      'pt-BR': `explique em cerca de ${palavrasAlvo} palavras (o trecho original tem ${palavrasOriginais}); esse tamanho tem prioridade sobre qualquer outra orientação de extensão`,
      en: `explain in about ${palavrasAlvo} words (the original excerpt has ${palavrasOriginais}); this length takes priority over any other length guidance`
    });
  }

  // Reescrever: com seleção, o alvo é a seleção × fator do nível
  if (alvo.grupo === 'reescrever' && alvo.nivel && contexto.selecao.trim()) {
    const palavrasOriginais = contarPalavras(contexto.selecao);
    const palavrasAlvo = calcularPalavrasResumo(palavrasOriginais, configuracoes.fatoresReescrever[alvo.nivel]);
    return t(idioma, {
      'pt-BR': `reescreva em cerca de ${palavrasAlvo} palavras (o trecho original tem ${palavrasOriginais}); esse tamanho tem prioridade sobre qualquer outra orientação de extensão`,
      en: `rewrite in about ${palavrasAlvo} words (the original excerpt has ${palavrasOriginais}); this length takes priority over any other length guidance`
    });
  }

  // Expandir: sempre com seleção, o alvo é a seleção × fator do nível (o texto substitui a seleção)
  if (alvo.grupo === 'expandir' && alvo.nivel && contexto.selecao.trim()) {
    const palavrasOriginais = contarPalavras(contexto.selecao);
    const palavrasAlvo = calcularPalavrasExpandir(palavrasOriginais, configuracoes.fatoresExpandir[alvo.nivel]);
    return t(idioma, {
      'pt-BR': `expanda em cerca de ${palavrasAlvo} palavras (o trecho original tem ${palavrasOriginais}); esse tamanho tem prioridade sobre qualquer outra orientação de extensão`,
      en: `expand to about ${palavrasAlvo} words (the original excerpt has ${palavrasOriginais}); this length takes priority over any other length guidance`
    });
  }

  const faixa = grupoComFaixa && alvo.nivel ? configuracoes.faixasPalavras?.[grupoComFaixa]?.[alvo.nivel] : undefined;

  // Gerar com nível escolhido no menu: a faixa do nível é obrigatória e vale mesmo nos perfis Natural/Livre
  // e com o controle de tamanho desligado (o usuário pediu esse tamanho explicitamente)
  if (alvo.grupo === 'gerar' && alvo.nivel && faixa) {
    return t(idioma, {
      'pt-BR': `escreva entre ${faixa.min} e ${faixa.max} palavras; o mínimo de ${faixa.min} palavras é obrigatório e tem prioridade sobre qualquer outra orientação de extensão; nunca corte a resposta no meio`,
      en: `write between ${faixa.min} and ${faixa.max} words; the minimum of ${faixa.min} words is mandatory and takes priority over any other length guidance; never cut the answer in the middle`
    });
  }

  if (!configuracoes.usarControleTamanho || perfilSemFaixa || !faixa) {
    return semFaixa;
  }

  return t(idioma, {
    'pt-BR': `em média entre ${faixa.min} e ${faixa.max} palavras, usando a faixa só como referência e nunca cortando a resposta no meio`,
    en: `an average of ${faixa.min} to ${faixa.max} words, using the range only as guidance and never cutting the answer in the middle`
  });
}

function obterObservacoes(alvo: AlvoPrompt, idioma: IdiomaSaida): string {
  const mapa: Partial<Record<IdGrupoMenu, Texto>> = {
    gerar: { 'pt-BR': 'Varie a estrutura conforme o assunto; não siga um molde fixo.', en: 'Vary the structure according to the subject; do not follow a fixed template.' },
    explicar: { 'pt-BR': 'Conecte as ideias e use exemplos concretos quando ajudarem a entender.', en: 'Connect ideas and use concrete examples when they help understanding.' },
    responder: { 'pt-BR': 'Se a pergunta for objetiva, responda primeiro e explique depois.', en: 'If the question is objective, answer first and explain afterwards.' },
    reescrever: { 'pt-BR': 'Não acrescente informações novas.', en: 'Do not add new information.' },
    outros: { 'pt-BR': 'Mantenha clareza, boa progressão e formato limpo.', en: 'Keep clarity, good progression and clean formatting.' }
  };
  const texto = mapa[alvo.grupo];
  return texto ? t(idioma, texto) : '';
}

function obterInstrucaoObjetivo(idioma: IdiomaSaida, objetivo: ObjetivoConteudo): string {
  const mapa: Record<ObjetivoConteudo, Texto> = {
    livre: { 'pt-BR': 'Deixe a própria solicitação definir a direção e a profundidade.', en: 'Let the request itself define the direction and depth.' },
    geral: { 'pt-BR': 'O objetivo é um texto geral, útil e equilibrado.', en: 'The goal is a general, useful and balanced text.' },
    estudo: { 'pt-BR': 'O objetivo é ajudar em estudo, revisão e compreensão.', en: 'The goal is to help with study, review and understanding.' },
    profissional: { 'pt-BR': 'O objetivo é um texto profissional, aplicável ao trabalho.', en: 'The goal is a professional text applicable to work.' },
    tecnico: { 'pt-BR': 'O objetivo é um texto técnico, preciso e operacional.', en: 'The goal is a technical, precise and operational text.' },
    apresentacao: { 'pt-BR': 'O objetivo é um texto claro, impactante e fácil de apresentar.', en: 'The goal is a clear, impactful, presentation-friendly text.' }
  };
  return t(idioma, mapa[objetivo] ?? mapa.geral);
}

// ==function== Remove título repetido no início (# Título da nota)
export function removerTituloRepetido(texto: string, tituloNota: string): string {
  const tituloEscapado = escaparRegex(tituloNota.trim());
  if (!tituloEscapado) {
    return texto.trim();
  }
  const regexCabecalhoMarkdown = new RegExp(`^\\s{0,3}#{1,6}\\s+${tituloEscapado}\\s*\\n+`, 'i');
  const regexTituloSimples = new RegExp(`^${tituloEscapado}\\s*\\n+`, 'i');
  return texto.replace(regexCabecalhoMarkdown, '').replace(regexTituloSimples, '').trim();
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==section== Prompts auxiliares de diagrama (decisão 13)
export function montarPromptCorrecaoMermaid(codigo: string, erro: string, configuracoes: ConfiguracoesPlugin): string {
  const idioma = configuracoes.idioma;
  const tiposPermitidos = [
    ...(configuracoes.formatoDiagramas ? ['flowchart', 'sequenceDiagram', 'timeline', 'mindmap'] : []),
    ...(configuracoes.formatoGraficos ? ['pie', 'quadrantChart', 'xychart-beta'] : [])
  ];
  const tipos = (tiposPermitidos.length > 0 ? tiposPermitidos : ['flowchart']).join(', ');

  return t(idioma, {
    'pt-BR': `O diagrama Mermaid abaixo tem erro de sintaxe e não renderiza no Obsidian.\nErro informado: ${erro}\n\nCorrija mantendo o mesmo conteúdo. Use sintaxe simples e válida, rótulos entre aspas quando tiverem espaços, acentos ou pontuação, sem estilos nem comentários. Se o tipo de diagrama não for suportado, use outro destes: ${tipos}.\nResponda SOMENTE com um bloco \`\`\`mermaid contendo o diagrama corrigido.\n\n\`\`\`mermaid\n${codigo}\n\`\`\``,
    en: `The Mermaid diagram below has a syntax error and does not render in Obsidian.\nReported error: ${erro}\n\nFix it while keeping the same content. Use simple, valid syntax, quote labels that contain spaces, accents or punctuation, and do not use styles or comments. If the diagram type is not supported, use one of these: ${tipos}.\nReply ONLY with a \`\`\`mermaid block containing the fixed diagram.\n\n\`\`\`mermaid\n${codigo}\n\`\`\``
  });
}

export function montarPromptConversaoMermaid(codigo: string, configuracoes: ConfiguracoesPlugin): string {
  const idioma = configuracoes.idioma;
  return t(idioma, {
    'pt-BR': `Converta o conteúdo do diagrama Mermaid abaixo em uma tabela Markdown. Se o conteúdo não tiver colunas naturais (por exemplo, um fluxo de passos), use uma lista numerada. Responda SOMENTE com a tabela ou a lista, em português do Brasil, sem bloco de código e sem Mermaid.\n\n${codigo}`,
    en: `Convert the content of the Mermaid diagram below into a Markdown table. If the content has no natural columns (for example, a flow of steps), use a numbered list. Reply ONLY with the table or list, in English, without a code block and without Mermaid.\n\n${codigo}`
  });
}
