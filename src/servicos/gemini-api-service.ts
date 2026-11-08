import { Platform, requestUrl } from 'obsidian';

import { obterRotuloModelo, traduzir } from '../i18n';
import { obterCadeiaModelos, obterModeloPrincipalEfetivo } from './ordem-modelos';
import { ehErroDeModelo, estaPausado, liberarModelo, pausarModelo } from './pausa-modelos';
import type { ConfiguracoesPlugin, ModeloGeminiDisponivel, ResultadoVelocidadeModelo } from '../tipos/configuracoes';

// ==data== Tempo máximo de espera por modelo no teste de velocidade
const LIMITE_TESTE_VELOCIDADE_MS = 15000;

// === TIPOS INTERNOS DO SERVICO | inicio ===
interface RespostaGeminiErro {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface ParteConteudoGemini {
  text?: string;
}

interface RespostaGeminiSucesso {
  candidates?: Array<{
    content?: {
      parts?: ParteConteudoGemini[];
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

export interface ResultadoGeracaoGemini {
  texto: string;
  modeloUsado: ModeloGeminiDisponivel;
  fallbackUsado: boolean;
}

interface ResultadoParcialGeracao {
  texto: string;
  finishReason?: string;
}

interface OpcoesGeracao {
  forcarModelo?: ModeloGeminiDisponivel;
  onDelta?: (delta: string) => void;
  onTentativaFallback?: (modelo: ModeloGeminiDisponivel) => void;
  onModeloAtivo?: (modelo: ModeloGeminiDisponivel) => void;
  onAviso?: (mensagem: string) => void;
  /** Chamado antes de reenviar o texto do zero (descarta deltas parciais já inseridos) */
  onReiniciar?: () => void;
  signal?: AbortSignal;
}
// === TIPOS INTERNOS DO SERVICO | fim ===

// === CLASSE DE ERRO | inicio ===
export class ErroGeminiApi extends Error {
  status?: number;
  modelo?: ModeloGeminiDisponivel;

  constructor(message: string, status?: number, modelo?: ModeloGeminiDisponivel) {
    super(message);
    this.name = 'ErroGeminiApi';
    this.status = status;
    this.modelo = modelo;
  }
}
// === CLASSE DE ERRO | fim ===

// === SERVICO GEMINI | inicio ===
export class GeminiApiService {
  private readonly configuracoes: ConfiguracoesPlugin;

  constructor(configuracoes: ConfiguracoesPlugin) {
    this.configuracoes = configuracoes;
  }

  async gerarTexto(prompt: string, opcoes?: OpcoesGeracao): Promise<ResultadoGeracaoGemini> {
    this.validarConfiguracoes();

    const modelos = this.obterModelosDaTentativa(opcoes?.forcarModelo);
    const modeloPreferido = opcoes?.forcarModelo ?? obterModeloPrincipalEfetivo(this.configuracoes);
    const erros: string[] = [];
    // ==section== fetch + ReadableStream não é confiável no app mobile (CORS); lá usamos requestUrl
    const usarStreamingReal = this.configuracoes.usarStreaming && !Platform.isMobileApp;

    for (let indice = 0; indice < modelos.length; indice += 1) {
      const modeloAtual = modelos[indice];
      if (!modeloAtual) {
        continue;
      }

      this.verificarAbortado(opcoes?.signal);
      opcoes?.onModeloAtivo?.(modeloAtual);

      // ==section== Fallback = qualquer modelo diferente do escolhido (inclusive quando o principal está pausado)
      const fallbackUsado = modeloAtual !== modeloPreferido;
      if (indice > 0) {
        opcoes?.onReiniciar?.();
      }
      if (fallbackUsado) {
        opcoes?.onTentativaFallback?.(modeloAtual);
      }

      try {
        if (usarStreamingReal && opcoes?.onDelta) {
          const textoStream = await this.gerarTextoCompletoComStreaming(prompt, modeloAtual, opcoes.onDelta, opcoes.signal);
          liberarModelo(modeloAtual);
          return { texto: textoStream, modeloUsado: modeloAtual, fallbackUsado };
        }

        const textoNormal = await this.gerarTextoCompletoSemStreaming(prompt, modeloAtual, opcoes?.signal);
        // ==section== Sem streaming real (mobile ou falha): entrega o texto inteiro de uma vez
        liberarModelo(modeloAtual);
        opcoes?.onDelta?.(textoNormal);
        return { texto: textoNormal, modeloUsado: modeloAtual, fallbackUsado };
      } catch (error) {
        if (this.foiAbortado(error, opcoes?.signal)) {
          throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'notice.geracaoCancelada'));
        }

        const mensagemErro = error instanceof Error ? error.message : String(error);
        erros.push(`${modeloAtual}: ${mensagemErro}`);

        const status = error instanceof ErroGeminiApi ? error.status : undefined;

        // ==section== 400/401 (pedido ou chave inválidos) falham igual em qualquer modelo: para a cadeia
        if (status === 400 || status === 401) {
          break;
        }

        // ==section== Erro do modelo (429, 5xx, 403, 404): pausa e vai direto ao próximo, sem repetir no modo normal
        if (ehErroDeModelo(status)) {
          pausarModelo(modeloAtual, status);
          continue;
        }

        // ==section== Falha só do streaming (conexão/leitura): tenta o mesmo modelo sem streaming
        if (usarStreamingReal && opcoes?.onDelta) {
          opcoes.onAviso?.(traduzir(this.configuracoes.idioma, 'servico.streamFalhou', { modelo: obterRotuloModelo(this.configuracoes.idioma, modeloAtual) }));

          try {
            const textoNormal = await this.gerarTextoCompletoSemStreaming(prompt, modeloAtual, opcoes.signal);
            liberarModelo(modeloAtual);
            opcoes.onReiniciar?.();
            opcoes.onDelta(textoNormal);
            return { texto: textoNormal, modeloUsado: modeloAtual, fallbackUsado };
          } catch (errorSemStreaming) {
            if (this.foiAbortado(errorSemStreaming, opcoes.signal)) {
              throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'notice.geracaoCancelada'));
            }

            const mensagemSemStreaming = errorSemStreaming instanceof Error ? errorSemStreaming.message : String(errorSemStreaming);
            erros.push(`${modeloAtual} (normal): ${mensagemSemStreaming}`);
            if (errorSemStreaming instanceof ErroGeminiApi) {
              pausarModelo(modeloAtual, errorSemStreaming.status);
            }
          }
        }
      }
    }

    const ultimaMensagem = erros[erros.length - 1] ?? 'unknown';
    throw new ErroGeminiApi(
      traduzir(this.configuracoes.idioma, 'servico.todosModelosFalharam', {
        modelos: modelos.map((modelo) => obterRotuloModelo(this.configuracoes.idioma, modelo)).join(' -> '),
        mensagem: ultimaMensagem
      })
    );
  }

  // ==function== Mede o tempo de uma resposta curta de um modelo (sem fallback)
  async medirVelocidade(modelo: ModeloGeminiDisponivel): Promise<ResultadoVelocidadeModelo> {
    this.validarConfiguracoes();
    const inicio = performance.now();

    // ==section== Cada modelo tem no máximo 15 s; depois disso conta como tempo esgotado e o teste segue
    // (a requisição não pode ser cancelada no Obsidian, então a resposta tardia é só ignorada)
    const controle = { timer: 0 };
    const limite = new Promise<'tempo-esgotado'>((resolver) => {
      controle.timer = window.setTimeout(() => resolver('tempo-esgotado'), LIMITE_TESTE_VELOCIDADE_MS);
    });

    try {
      const requisicao = this.gerarTextoSemStreaming(traduzir(this.configuracoes.idioma, 'servico.teste.prompt'), modelo);
      requisicao.catch(() => undefined);
      const resultado = await Promise.race([requisicao, limite]);
      if (resultado === 'tempo-esgotado') {
        return { modelo, ok: false, ms: null, status: null, tempoEsgotado: true };
      }
      liberarModelo(modelo);
      return { modelo, ok: true, ms: Math.round(performance.now() - inicio), status: 200 };
    } catch (error) {
      const status = error instanceof ErroGeminiApi ? error.status ?? null : null;
      pausarModelo(modelo, status ?? undefined);
      return { modelo, ok: false, ms: null, status };
    } finally {
      window.clearTimeout(controle.timer);
    }
  }

  async testarConexao(modeloForcado?: ModeloGeminiDisponivel): Promise<string> {
    const resultado = await this.gerarTexto(traduzir(this.configuracoes.idioma, 'servico.teste.prompt'), {
      forcarModelo: modeloForcado
    });
    return resultado.texto.replace(/\s+/g, ' ').trim();
  }

  private obterModelosDaTentativa(modeloForcado?: ModeloGeminiDisponivel): ModeloGeminiDisponivel[] {
    if (modeloForcado) {
      return [modeloForcado];
    }

    // ==section== Cadeia por qualidade ou por velocidade (teste); pula modelos pausados
    const modelos = obterCadeiaModelos(this.configuracoes);
    const modelosLivres = modelos.filter((modelo) => !estaPausado(modelo));
    return modelosLivres.length > 0 ? modelosLivres : modelos;
  }

  private async gerarTextoCompletoSemStreaming(prompt: string, modelo: ModeloGeminiDisponivel, signal?: AbortSignal): Promise<string> {
    let promptAtual = prompt;
    let textoCompleto = '';

    for (let tentativa = 0; tentativa < 4; tentativa += 1) {
      this.verificarAbortado(signal);
      const resultadoParcial = await this.gerarTextoSemStreaming(promptAtual, modelo, signal);
      textoCompleto += resultadoParcial.texto;

      if (!this.deveContinuarGeracao(resultadoParcial.finishReason)) {
        break;
      }

      promptAtual = this.montarPromptContinuacao(prompt, textoCompleto);
    }

    const textoLimpo = textoCompleto.trim();

    if (!textoLimpo) {
      throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'servico.semTexto', { motivo: 'empty-final' }), undefined, modelo);
    }

    return textoLimpo;
  }

  private async gerarTextoSemStreaming(prompt: string, modelo: ModeloGeminiDisponivel, signal?: AbortSignal): Promise<ResultadoParcialGeracao> {
    this.verificarAbortado(signal);

    const resposta = await requestUrl({
      url: this.montarUrlNormal(modelo),
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'x-goog-api-key': this.configuracoes.apiKey
      },
      body: JSON.stringify(this.montarCorpo(prompt)),
      throw: false
    });

    this.verificarAbortado(signal);

    if (resposta.status >= 400) {
      const jsonErro = (resposta.json ?? {}) as RespostaGeminiErro;
      const mensagemErro = jsonErro.error?.message ?? resposta.text ?? 'The Gemini API returned an error without a message.';
      throw new ErroGeminiApi(this.normalizarMensagemErro(mensagemErro, resposta.status, modelo), resposta.status, modelo);
    }

    const jsonSucesso = (resposta.json ?? {}) as RespostaGeminiSucesso;
    return this.extrairResultadoDeResposta(jsonSucesso, modelo);
  }

  private async gerarTextoCompletoComStreaming(
    prompt: string,
    modelo: ModeloGeminiDisponivel,
    onDelta: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    let promptAtual = prompt;
    let textoCompleto = '';

    for (let tentativa = 0; tentativa < 4; tentativa += 1) {
      this.verificarAbortado(signal);
      const resultadoParcial = await this.gerarTextoComStreaming(promptAtual, modelo, onDelta, signal);
      textoCompleto += resultadoParcial.texto;

      if (!this.deveContinuarGeracao(resultadoParcial.finishReason)) {
        break;
      }

      promptAtual = this.montarPromptContinuacao(prompt, textoCompleto);
    }

    const textoLimpo = textoCompleto.trim();

    if (!textoLimpo) {
      throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'servico.semTexto', { motivo: 'stream-empty' }), undefined, modelo);
    }

    return textoLimpo;
  }

  private async gerarTextoComStreaming(
    prompt: string,
    modelo: ModeloGeminiDisponivel,
    onDelta: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<ResultadoParcialGeracao> {
    this.verificarAbortado(signal);

    // ==section== requestUrl não entrega o corpo em partes; o streaming (SSE) exige fetch.
    // Só é usado no desktop (ver usarStreamingReal); no mobile o fluxo cai para requestUrl.
    const resposta = await activeWindow.fetch(this.montarUrlStreaming(modelo), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.configuracoes.apiKey
      },
      body: JSON.stringify(this.montarCorpo(prompt)),
      signal
    });

    if (!resposta.ok) {
      const textoErro = await resposta.text();
      let mensagemErro = textoErro;

      try {
        const jsonErro = JSON.parse(textoErro) as RespostaGeminiErro;
        mensagemErro = jsonErro.error?.message ?? textoErro;
      } catch {
        mensagemErro = textoErro;
      }

      throw new ErroGeminiApi(this.normalizarMensagemErro(mensagemErro, resposta.status, modelo), resposta.status, modelo);
    }

    if (!resposta.body) {
      throw new ErroGeminiApi(this.normalizarMensagemErro('Streaming body unavailable.', 500, modelo), 500, modelo);
    }

    const leitor = resposta.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let textoFinal = '';
    let finishReason: string | undefined;

    while (true) {
      this.verificarAbortado(signal);
      const { value, done } = await leitor.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const partes = buffer.split(/\r?\n\r?\n/);
      buffer = partes.pop() ?? '';

      for (const parte of partes) {
        const resultadoBloco = this.processarBlocoStreaming(parte, onDelta, (delta) => {
          textoFinal += delta;
        });

        if (resultadoBloco.finishReason) {
          finishReason = resultadoBloco.finishReason;
        }
      }

      if (done) {
        break;
      }
    }

    if (buffer.trim()) {
      const resultadoBloco = this.processarBlocoStreaming(buffer, onDelta, (delta) => {
        textoFinal += delta;
      });

      if (resultadoBloco.finishReason) {
        finishReason = resultadoBloco.finishReason;
      }
    }

    this.verificarAbortado(signal);
    const textoLimpo = textoFinal.trim();

    if (!textoLimpo) {
      throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'servico.semTexto', { motivo: 'stream-empty' }), undefined, modelo);
    }

    return {
      texto: textoLimpo,
      finishReason
    };
  }

  private extrairJsonSse(blocoSse: string): string {
    const linhas = blocoSse.split('\n');
    const linhasData = linhas
      .filter((linha) => linha.startsWith('data:'))
      .map((linha) => linha.replace(/^data:\s*/, '').trim())
      .filter((linha) => linha && linha !== '[DONE]');

    return linhasData.join('');
  }

  private processarBlocoStreaming(
    blocoSse: string,
    onDelta: (delta: string) => void,
    aoReceberDelta: (delta: string) => void
  ): { finishReason?: string } {
    const blocoJson = this.extrairJsonSse(blocoSse);

    if (!blocoJson) {
      return {};
    }

    const json = JSON.parse(blocoJson) as RespostaGeminiSucesso;
    const delta = this.extrairTextoParcial(json);

    if (delta) {
      aoReceberDelta(delta);
      onDelta(delta);
    }

    return {
      finishReason: json.candidates?.[0]?.finishReason
    };
  }

  private extrairResultadoDeResposta(resposta: RespostaGeminiSucesso, modelo: ModeloGeminiDisponivel): ResultadoParcialGeracao {
    const texto = this.extrairTextoParcial(resposta).trim();

    if (!texto) {
      const motivoBloqueio = resposta.promptFeedback?.blockReason;
      if (motivoBloqueio) {
        throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'servico.bloqueio', { motivo: motivoBloqueio }), undefined, modelo);
      }

      const motivoFinal = resposta.candidates?.[0]?.finishReason ?? 'unknown';
      throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'servico.semTexto', { motivo: motivoFinal }), undefined, modelo);
    }

    return {
      texto,
      finishReason: resposta.candidates?.[0]?.finishReason
    };
  }

  private extrairTextoParcial(resposta: RespostaGeminiSucesso): string {
    const partes = resposta.candidates?.[0]?.content?.parts ?? [];
    return partes.map((parte) => parte.text ?? '').join('');
  }

  private deveContinuarGeracao(finishReason?: string): boolean {
    return finishReason === 'MAX_TOKENS';
  }

  private montarPromptContinuacao(promptOriginal: string, textoAtual: string): string {
    const instrucaoPt = [
      'Continue exatamente de onde a resposta anterior parou.',
      'Nao recomece o texto, nao repita subtitulos ja usados e nao repita paragrafos anteriores.',
      'Escreva apenas a continuacao, mantendo o mesmo idioma, estilo e estrutura.',
      'Priorize concluir o conteudo com coerencia e finalizacao natural.'
    ].join(' ');

    const instrucaoEn = [
      'Continue exactly from where the previous answer stopped.',
      'Do not restart the text, do not repeat subtitles already used, and do not repeat previous paragraphs.',
      'Write only the continuation, keeping the same language, style and structure.',
      'Prioritize finishing the content coherently with a natural ending.'
    ].join(' ');

    const instrucao = this.configuracoes.idioma === 'pt-BR' ? instrucaoPt : instrucaoEn;

    return `${instrucao}\n\n=== ORIGINAL REQUEST ===\n${promptOriginal}\n\n=== TEXT GENERATED SO FAR ===\n${textoAtual}`;
  }

  private validarConfiguracoes(): void {
    if (!this.configuracoes.apiKey.trim()) {
      throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'servico.semApiKey'));
    }

    if (!this.configuracoes.modeloPrincipal.trim()) {
      throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'servico.semModelo'));
    }
  }

  private montarUrlNormal(modelo: ModeloGeminiDisponivel): string {
    const modeloCodificado = encodeURIComponent(modelo.trim());
    return `https://generativelanguage.googleapis.com/v1beta/models/${modeloCodificado}:generateContent`;
  }

  private montarUrlStreaming(modelo: ModeloGeminiDisponivel): string {
    const modeloCodificado = encodeURIComponent(modelo.trim());
    return `https://generativelanguage.googleapis.com/v1beta/models/${modeloCodificado}:streamGenerateContent?alt=sse`;
  }

  private montarCorpo(prompt: string): Record<string, unknown> {
    return {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: this.configuracoes.temperatura,
        maxOutputTokens: this.configuracoes.maxOutputTokens
      }
    };
  }

  private normalizarMensagemErro(mensagemOriginal: string, status: number, modelo: ModeloGeminiDisponivel): string {
    const variaveis = {
      mensagem: mensagemOriginal,
      modelo: obterRotuloModelo(this.configuracoes.idioma, modelo),
      status
    };

    if (status === 400) {
      return traduzir(this.configuracoes.idioma, 'servico.erro400', variaveis);
    }

    if (status === 403) {
      return traduzir(this.configuracoes.idioma, 'servico.erro403', variaveis);
    }

    if (status === 404) {
      return traduzir(this.configuracoes.idioma, 'servico.erro404', variaveis);
    }

    if (status === 429) {
      return traduzir(this.configuracoes.idioma, 'servico.erro429', variaveis);
    }

    if (status >= 500) {
      return traduzir(this.configuracoes.idioma, 'servico.erro500', variaveis);
    }

    return mensagemOriginal;
  }

  private verificarAbortado(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new ErroGeminiApi(traduzir(this.configuracoes.idioma, 'notice.geracaoCancelada'));
    }
  }

  private foiAbortado(error: unknown, signal?: AbortSignal): boolean {
    if (signal?.aborted) {
      return true;
    }

    if (error instanceof Error && (error.name === 'AbortError' || error.message === traduzir(this.configuracoes.idioma, 'notice.geracaoCancelada'))) {
      return true;
    }

    return false;
  }
}
// === SERVICO GEMINI | fim ===
