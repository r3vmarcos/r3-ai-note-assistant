// ==types== Um idioma de destino da ação Traduzir
export interface IdiomaTraducao {
  /** Nome em inglês: é o valor salvo e o que vai no prompt */
  en: string;
  /** Nome no próprio idioma (mostrado no botão) */
  nativo: string;
  /** Nome em português (ajuda na busca) */
  pt: string;
}

// ==data== Os 20 idiomas principais (aparecem como botões no modal)
export const IDIOMAS_TRADUCAO_PRINCIPAIS: IdiomaTraducao[] = [
  { en: 'English', nativo: 'English', pt: 'Inglês' },
  { en: 'Spanish', nativo: 'Español', pt: 'Espanhol' },
  { en: 'Brazilian Portuguese', nativo: 'Português (Brasil)', pt: 'Português do Brasil' },
  { en: 'European Portuguese', nativo: 'Português (Portugal)', pt: 'Português de Portugal' },
  { en: 'French', nativo: 'Français', pt: 'Francês' },
  { en: 'German', nativo: 'Deutsch', pt: 'Alemão' },
  { en: 'Italian', nativo: 'Italiano', pt: 'Italiano' },
  { en: 'Japanese', nativo: '日本語', pt: 'Japonês' },
  { en: 'Simplified Chinese', nativo: '简体中文', pt: 'Chinês simplificado' },
  { en: 'Traditional Chinese', nativo: '繁體中文', pt: 'Chinês tradicional' },
  { en: 'Korean', nativo: '한국어', pt: 'Coreano' },
  { en: 'Russian', nativo: 'Русский', pt: 'Russo' },
  { en: 'Arabic', nativo: 'العربية', pt: 'Árabe' },
  { en: 'Hindi', nativo: 'हिन्दी', pt: 'Hindi' },
  { en: 'Dutch', nativo: 'Nederlands', pt: 'Holandês' },
  { en: 'Turkish', nativo: 'Türkçe', pt: 'Turco' },
  { en: 'Polish', nativo: 'Polski', pt: 'Polonês' },
  { en: 'Ukrainian', nativo: 'Українська', pt: 'Ucraniano' },
  { en: 'Indonesian', nativo: 'Bahasa Indonesia', pt: 'Indonésio' },
  { en: 'Swedish', nativo: 'Svenska', pt: 'Sueco' }
];

// ==data== Outros idiomas (encontrados pela busca)
const IDIOMAS_TRADUCAO_OUTROS: IdiomaTraducao[] = [
  { en: 'Afrikaans', nativo: 'Afrikaans', pt: 'Africâner' },
  { en: 'Albanian', nativo: 'Shqip', pt: 'Albanês' },
  { en: 'Amharic', nativo: 'አማርኛ', pt: 'Amárico' },
  { en: 'Armenian', nativo: 'Հայերեն', pt: 'Armênio' },
  { en: 'Azerbaijani', nativo: 'Azərbaycanca', pt: 'Azerbaijano' },
  { en: 'Basque', nativo: 'Euskara', pt: 'Basco' },
  { en: 'Bengali', nativo: 'বাংলা', pt: 'Bengali' },
  { en: 'Bosnian', nativo: 'Bosanski', pt: 'Bósnio' },
  { en: 'Bulgarian', nativo: 'Български', pt: 'Búlgaro' },
  { en: 'Burmese', nativo: 'မြန်မာ', pt: 'Birmanês' },
  { en: 'Catalan', nativo: 'Català', pt: 'Catalão' },
  { en: 'Croatian', nativo: 'Hrvatski', pt: 'Croata' },
  { en: 'Czech', nativo: 'Čeština', pt: 'Tcheco' },
  { en: 'Danish', nativo: 'Dansk', pt: 'Dinamarquês' },
  { en: 'Esperanto', nativo: 'Esperanto', pt: 'Esperanto' },
  { en: 'Estonian', nativo: 'Eesti', pt: 'Estoniano' },
  { en: 'Filipino', nativo: 'Filipino', pt: 'Filipino (tagalo)' },
  { en: 'Finnish', nativo: 'Suomi', pt: 'Finlandês' },
  { en: 'Galician', nativo: 'Galego', pt: 'Galego' },
  { en: 'Georgian', nativo: 'ქართული', pt: 'Georgiano' },
  { en: 'Greek', nativo: 'Ελληνικά', pt: 'Grego' },
  { en: 'Guarani', nativo: "Avañe'ẽ", pt: 'Guarani' },
  { en: 'Gujarati', nativo: 'ગુજરાતી', pt: 'Guzerate' },
  { en: 'Haitian Creole', nativo: 'Kreyòl ayisyen', pt: 'Crioulo haitiano' },
  { en: 'Hebrew', nativo: 'עברית', pt: 'Hebraico' },
  { en: 'Hungarian', nativo: 'Magyar', pt: 'Húngaro' },
  { en: 'Icelandic', nativo: 'Íslenska', pt: 'Islandês' },
  { en: 'Irish', nativo: 'Gaeilge', pt: 'Irlandês' },
  { en: 'Kazakh', nativo: 'Қазақша', pt: 'Cazaque' },
  { en: 'Khmer', nativo: 'ខ្មែរ', pt: 'Khmer' },
  { en: 'Lao', nativo: 'ລາວ', pt: 'Laosiano' },
  { en: 'Latin', nativo: 'Latina', pt: 'Latim' },
  { en: 'Latvian', nativo: 'Latviešu', pt: 'Letão' },
  { en: 'Lithuanian', nativo: 'Lietuvių', pt: 'Lituano' },
  { en: 'Macedonian', nativo: 'Македонски', pt: 'Macedônio' },
  { en: 'Malay', nativo: 'Bahasa Melayu', pt: 'Malaio' },
  { en: 'Marathi', nativo: 'मराठी', pt: 'Marati' },
  { en: 'Mongolian', nativo: 'Монгол', pt: 'Mongol' },
  { en: 'Nepali', nativo: 'नेपाली', pt: 'Nepalês' },
  { en: 'Norwegian', nativo: 'Norsk', pt: 'Norueguês' },
  { en: 'Persian', nativo: 'فارسی', pt: 'Persa' },
  { en: 'Punjabi', nativo: 'ਪੰਜਾਬੀ', pt: 'Punjabi' },
  { en: 'Quechua', nativo: 'Runa Simi', pt: 'Quíchua' },
  { en: 'Romanian', nativo: 'Română', pt: 'Romeno' },
  { en: 'Serbian', nativo: 'Српски', pt: 'Sérvio' },
  { en: 'Sinhala', nativo: 'සිංහල', pt: 'Cingalês' },
  { en: 'Slovak', nativo: 'Slovenčina', pt: 'Eslovaco' },
  { en: 'Slovenian', nativo: 'Slovenščina', pt: 'Esloveno' },
  { en: 'Swahili', nativo: 'Kiswahili', pt: 'Suaíli' },
  { en: 'Tamil', nativo: 'தமிழ்', pt: 'Tâmil' },
  { en: 'Telugu', nativo: 'తెలుగు', pt: 'Télugo' },
  { en: 'Thai', nativo: 'ไทย', pt: 'Tailandês' },
  { en: 'Urdu', nativo: 'اردو', pt: 'Urdu' },
  { en: 'Uzbek', nativo: "O'zbekcha", pt: 'Uzbeque' },
  { en: 'Vietnamese', nativo: 'Tiếng Việt', pt: 'Vietnamita' },
  { en: 'Welsh', nativo: 'Cymraeg', pt: 'Galês' },
  { en: 'Yoruba', nativo: 'Yorùbá', pt: 'Iorubá' },
  { en: 'Zulu', nativo: 'isiZulu', pt: 'Zulu' }
];

export const TODOS_IDIOMAS_TRADUCAO: IdiomaTraducao[] = [...IDIOMAS_TRADUCAO_PRINCIPAIS, ...IDIOMAS_TRADUCAO_OUTROS];

// ==data== Valores antigos (códigos dos idiomas do plugin) convertidos para o nome usado agora
const CODIGOS_ANTIGOS: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  'zh-CN': 'Simplified Chinese'
};

// ==function== Normaliza o valor salvo (aceita códigos antigos e nomes digitados livremente)
export function normalizarIdiomaTraducao(valor: string): string {
  const limpo = (valor ?? '').trim();
  return CODIGOS_ANTIGOS[limpo] ?? (limpo || 'English');
}

// ==function== Texto que vai no prompt: "Japanese (日本語)" para idiomas da lista; o próprio texto para os digitados
export function descreverIdiomaTraducao(valor: string): string {
  const nome = normalizarIdiomaTraducao(valor);
  const idioma = TODOS_IDIOMAS_TRADUCAO.find((item) => item.en === nome);
  return idioma && idioma.nativo !== idioma.en ? `${idioma.en} (${idioma.nativo})` : nome;
}

// ==function== Nome para mostrar ao usuário: em português na interface pt-BR, em inglês nas demais; texto digitado fica como está
export function nomeExibicaoIdiomaTraducao(valor: string, idiomaInterface: string): string {
  const nome = normalizarIdiomaTraducao(valor);
  const idioma = TODOS_IDIOMAS_TRADUCAO.find((item) => item.en === nome);
  if (!idioma) {
    return nome;
  }
  return idiomaInterface === 'pt-BR' ? idioma.pt : idioma.en;
}

// ==function== Busca sem acento e sem maiúsculas no nome em inglês, nativo e em português
export function buscarIdiomasTraducao(termo: string): IdiomaTraducao[] {
  const normalizar = (texto: string): string => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const busca = normalizar(termo.trim());
  if (!busca) {
    return IDIOMAS_TRADUCAO_PRINCIPAIS;
  }
  return TODOS_IDIOMAS_TRADUCAO.filter((idioma) => [idioma.en, idioma.nativo, idioma.pt].some((nome) => normalizar(nome).includes(busca)));
}
