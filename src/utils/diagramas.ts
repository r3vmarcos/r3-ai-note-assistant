import { loadMermaid } from 'obsidian';

// ==types== API mínima do Mermaid que usamos (a versão vem embutida no Obsidian)
interface MermaidParser {
  parse: (codigo: string, opcoes?: { suppressErrors?: boolean }) => unknown;
}

// ==types== Resultado da validação de um bloco
export interface ResultadoValidacao {
  valido: boolean;
  erro: string;
}

// ==types== Funções que chamam o Gemini para consertar um diagrama
export interface ReparadorDiagrama {
  corrigir: (codigo: string, erro: string) => Promise<string>;
  converter: (codigo: string) => Promise<string>;
  deveParar?: () => boolean;
  aoAvisar?: (etapa: 'validando' | 'corrigindo' | 'convertendo') => void;
}

// ==types== Resumo do que aconteceu com os diagramas da resposta
export interface RelatorioDiagramas {
  texto: string;
  total: number;
  corrigidos: number;
  convertidos: number;
  removidos: number;
}

const REGEX_BLOCO_MERMAID = /```mermaid[^\n]*\n([\s\S]*?)```/g;

let mermaidCache: Promise<MermaidParser | null> | null = null;

// ==function== Carrega o Mermaid do Obsidian uma vez (null se indisponível)
function obterMermaid(): Promise<MermaidParser | null> {
  if (!mermaidCache) {
    mermaidCache = loadMermaid()
      .then((mermaid: unknown) => {
        const candidato = mermaid as Partial<MermaidParser> | null;
        return candidato && typeof candidato.parse === 'function' ? (candidato as MermaidParser) : null;
      })
      .catch(() => null);
  }
  return mermaidCache;
}

// ==function== Valida a sintaxe de um diagrama (aceita parse síncrono ou assíncrono)
export async function validarCodigoMermaid(codigo: string): Promise<ResultadoValidacao> {
  const mermaid = await obterMermaid();
  if (!mermaid) {
    return { valido: true, erro: '' };
  }

  try {
    const resultado = await Promise.resolve(mermaid.parse(codigo.trim()));
    return resultado === false ? { valido: false, erro: 'parse returned false' } : { valido: true, erro: '' };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    return { valido: false, erro: mensagem.split('\n').slice(0, 6).join('\n') };
  }
}

// ==function== Extrai o código de um bloco ```mermaid (ou o texto inteiro, se vier sem cercas)
export function extrairCodigoMermaid(resposta: string): string {
  const bloco = /```(?:mermaid)?[^\n]*\n([\s\S]*?)```/.exec(resposta);
  return (bloco?.[1] ?? resposta).trim();
}

// ==function== Remove cercas de código que a IA às vezes coloca em volta de tabela/lista
function limparCercas(texto: string): string {
  return texto.replace(/^```[a-z]*\s*\n/i, '').replace(/\n```\s*$/, '').trim();
}

// ==data== Rótulos ID[texto] com caracteres que o Mermaid só aceita entre aspas
const REGEX_ROTULO_SEM_ASPAS = /(\w+)\[([^\]"\n]*[()<>{}#&;:|][^\]"\n]*)\]/g;

// ==function== Coloca entre aspas os rótulos problemáticos (não depende do Mermaid estar carregado)
export function sanitizarRotulosMermaid(codigo: string): string {
  return codigo.replace(REGEX_ROTULO_SEM_ASPAS, (_trecho, id: string, rotulo: string) => `${id}["${rotulo.trim()}"]`);
}

export function contemDiagrama(texto: string): boolean {
  REGEX_BLOCO_MERMAID.lastIndex = 0;
  return REGEX_BLOCO_MERMAID.test(texto);
}

// ==function== Valida cada diagrama; inválido → 1 correção → se falhar, tabela/lista → se falhar, remove
export async function revisarDiagramas(texto: string, reparador: ReparadorDiagrama): Promise<RelatorioDiagramas> {
  const relatorio: RelatorioDiagramas = { texto, total: 0, corrigidos: 0, convertidos: 0, removidos: 0 };
  const blocos = Array.from(texto.matchAll(REGEX_BLOCO_MERMAID));
  if (blocos.length === 0) {
    return relatorio;
  }

  reparador.aoAvisar?.('validando');
  relatorio.total = blocos.length;
  const substituicoes: { original: string; novo: string }[] = [];

  for (const bloco of blocos) {
    const original = bloco[0];
    const codigoOriginal = (bloco[1] ?? '').trim();
    const codigo = sanitizarRotulosMermaid(codigoOriginal);
    const validacao = await validarCodigoMermaid(codigo);
    if (validacao.valido) {
      if (codigo !== codigoOriginal) {
        substituicoes.push({ original, novo: `\`\`\`mermaid\n${codigo}\n\`\`\`` });
        relatorio.corrigidos += 1;
      }
      continue;
    }

    // Geração cancelada: mantém o texto como veio
    if (reparador.deveParar?.()) {
      return relatorio;
    }

    // ==section== Tentativa 1: pedir correção ao Gemini
    try {
      reparador.aoAvisar?.('corrigindo');
      const corrigido = extrairCodigoMermaid(await reparador.corrigir(codigo, validacao.erro));
      if (corrigido && (await validarCodigoMermaid(corrigido)).valido) {
        substituicoes.push({ original, novo: `\`\`\`mermaid\n${corrigido}\n\`\`\`` });
        relatorio.corrigidos += 1;
        continue;
      }
    } catch {
      // segue para a conversão
    }

    // ==section== Tentativa 2: converter em tabela ou lista
    try {
      reparador.aoAvisar?.('convertendo');
      const convertido = limparCercas(await reparador.converter(codigo));
      if (convertido && !contemDiagrama(convertido)) {
        substituicoes.push({ original, novo: convertido });
        relatorio.convertidos += 1;
        continue;
      }
    } catch {
      // segue para a remoção
    }

    substituicoes.push({ original, novo: '' });
    relatorio.removidos += 1;
  }

  let textoFinal = texto;
  for (const { original, novo } of substituicoes) {
    textoFinal = textoFinal.replace(original, novo);
  }
  relatorio.texto = textoFinal.replace(/\n{3,}/g, '\n\n').trim();
  return relatorio;
}
