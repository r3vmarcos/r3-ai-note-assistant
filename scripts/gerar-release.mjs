// Copia os arquivos de instalação e documentação do plugin para release/ (executado por `npm run release`)
import { copyFileSync, existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ARQUIVOS = ['main.js', 'manifest.json', 'styles.css', 'README.md'];
// Campos com dados pessoais que nunca vão para o pacote (a chave de API fica só no vault de quem usa)
const CAMPOS_PRIVADOS = ['apiKey'];
const destino = join('release', 'ai-note-assistant');

mkdirSync(destino, { recursive: true });
const agora = new Date();

for (const arquivo of ARQUIVOS) {
  const caminhoDestino = join(destino, arquivo);
  copyFileSync(arquivo, caminhoDestino);
  // A cópia no Windows herda a data do original; força a data da geração
  utimesSync(caminhoDestino, agora, agora);
}

// ==section== data.json: copiado sem a chave de API e sem os resultados pessoais do teste de velocidade
if (existsSync('data.json')) {
  const configuracoes = JSON.parse(readFileSync('data.json', 'utf8'));
  for (const campo of CAMPOS_PRIVADOS) {
    if (campo in configuracoes) {
      configuracoes[campo] = '';
    }
  }
  configuracoes.resultadosVelocidade = [];
  configuracoes.testeVelocidadeEm = null;
  const caminhoDados = join(destino, 'data.json');
  writeFileSync(caminhoDados, `${JSON.stringify(configuracoes, null, 2)}\n`);
  utimesSync(caminhoDados, agora, agora);
}

console.log(`Arquivos do plugin copiados para ${destino}: ${ARQUIVOS.join(', ')}, data.json (sem a chave de API)`);
