// Idiomas que tiveram textos legados (o espanhol é novo e não tem versão antiga)
export type IdiomaLegado = 'pt-BR' | 'en';

// ==types== Chaves de prompt da v4.5 (antes da estrutura intenção + nível)
export type ChavePromptLegada =
  | 'csimplificado'
  | 'cdetalhado'
  | 'cexplicado'
  | 'crelacionado'
  | 'cresumirCurto'
  | 'cresumirExplicado'
  | 'cresumirSimples'
  | 'cresumirTecnico'
  | 'cexpandir'
  | 'cexpandirCriativo'
  | 'cresponderCurto'
  | 'cresponderExplicado'
  | 'ctransformarClaro'
  | 'ctransformarProfissional'
  | 'ctransformarTecnico'
  | 'ccorrigirGramatica'
  | 'coutros';

// ==data== Textos padrão da v4.5: usados só para detectar quais prompts o usuário editou
export const PROMPTS_LEGADOS_POR_IDIOMA: Record<IdiomaLegado, Record<ChavePromptLegada, string>> = {
  'pt-BR': {
    csimplificado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Fale sobre {TITLE} de forma natural e adaptada ao tema. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    cdetalhado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Desenvolva um conteúdo detalhado sobre {TITLE} com estrutura natural e sem engessar a resposta. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    cexplicado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Explique {TITLE} em profundidade, adaptando formato e ritmo ao tipo de assunto. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    crelacionado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Gere um conteúdo relacionado a {TITLE} que complemente a nota atual com naturalidade e variedade. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    cresumirCurto: '{IDIOMA_INSTRUCAO} Faça um resumo curto e fiel do trecho abaixo. Gere {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresumirExplicado: '{IDIOMA_INSTRUCAO} Faça um resumo explicado, claro e fiel do trecho abaixo. Gere {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresumirSimples: '{IDIOMA_INSTRUCAO} Resuma o trecho abaixo em linguagem simples e fácil de entender. Gere {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresumirTecnico: '{IDIOMA_INSTRUCAO} Resuma o trecho abaixo preservando foco técnico, precisão e termos-chave. Gere {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cexpandir: '{IDIOMA_INSTRUCAO} Expanda o trecho abaixo com mais contexto e detalhes, preservando o significado, a ordem lógica e os termos importantes. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cexpandirCriativo: '{IDIOMA_INSTRUCAO} Expanda o trecho abaixo com mais contexto, exemplos, analogias e aplicações, mantendo o eixo central do texto original. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresponderCurto: '{IDIOMA_INSTRUCAO} Responda ao trecho abaixo de forma curta e precisa. Gere {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresponderExplicado: '{IDIOMA_INSTRUCAO} Responda ao trecho abaixo de forma explicada, clara e útil. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ctransformarClaro: '{IDIOMA_INSTRUCAO} Reescreva o trecho abaixo de forma mais clara, simples e organizada, mantendo o sentido. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ctransformarProfissional: '{IDIOMA_INSTRUCAO} Reescreva o trecho abaixo com tom profissional, linguagem mais refinada e melhor estrutura. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ctransformarTecnico: '{IDIOMA_INSTRUCAO} Reescreva o trecho abaixo com tom técnico, precisão conceitual e terminologia adequada. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ccorrigirGramatica: '{IDIOMA_INSTRUCAO} Corrija o trecho abaixo em gramática, ortografia, pontuação e fluidez, sem mudar o sentido. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    coutros: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Siga a instrução personalizada sobre {TITLE}. Se existir conteúdo selecionado, use-o como contexto principal. Use {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  },
  en: {
    csimplificado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Write about {TITLE} in a natural way that adapts to the subject. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    cdetalhado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Develop detailed content about {TITLE} with a natural structure instead of a rigid template. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    cexplicado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Explain {TITLE} in depth, adapting structure and pacing to the kind of request. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    crelacionado: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Generate related content about {TITLE} that complements the current note. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}',
    cresumirCurto: '{IDIOMA_INSTRUCAO} Create a brief and faithful summary of the excerpt below. Generate {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresumirExplicado: '{IDIOMA_INSTRUCAO} Create an explained, clear and faithful summary of the excerpt below. Generate {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresumirSimples: '{IDIOMA_INSTRUCAO} Summarize the excerpt below using simple and easy language. Generate {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresumirTecnico: '{IDIOMA_INSTRUCAO} Summarize the excerpt below while preserving technical focus, precision and key terminology. Generate {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cexpandir: '{IDIOMA_INSTRUCAO} Expand the excerpt below with more context and detail while preserving the meaning, logical order and important terms. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cexpandirCriativo: '{IDIOMA_INSTRUCAO} Expand the excerpt below with more context, examples, analogies and applications while keeping the core meaning of the original text. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresponderCurto: '{IDIOMA_INSTRUCAO} Answer the excerpt below briefly and precisely. Generate {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    cresponderExplicado: '{IDIOMA_INSTRUCAO} Answer the excerpt below with a clear and useful explanation. Use {PERFIL_ESCRITA}. {FAIXA_PALAVRAS}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ctransformarClaro: '{IDIOMA_INSTRUCAO} Rewrite the excerpt below in a clearer, simpler and better organized way while keeping the meaning. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ctransformarProfissional: '{IDIOMA_INSTRUCAO} Rewrite the excerpt below using a professional tone, more refined language and better structure. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ctransformarTecnico: '{IDIOMA_INSTRUCAO} Rewrite the excerpt below using technical tone, conceptual precision and appropriate terminology. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    ccorrigirGramatica: '{IDIOMA_INSTRUCAO} Correct the excerpt below for grammar, spelling, punctuation and flow without changing the meaning. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}',
    coutros: '{IDIOMA_INSTRUCAO} {OBJETIVO_INSTRUCAO} Follow the custom instruction about {TITLE}. If selected content exists, use it as the main context. Use {PERFIL_ESCRITA}. {OBSERVACOES_ADICIONAIS}\n\n{SELECT}'
  }
};
