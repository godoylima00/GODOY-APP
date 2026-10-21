/* ==========================================================================
   GodoyFin - Motor de Visão Computacional: Google Gemini Vision (gemini-2.5-flash)
   + Fallback Automático Local (Tesseract.js + Parser Nativo)
   Suporta 2 Cenários de Leitura de Imagem:
   - Cenário A: Print de Compra Única (iFood, Uber, 99, PIX, Nota Fiscal)
   - Cenário B: Print da Planilha Mensal (Tabela Lado a Lado Gabriel & Mirela)
   ========================================================================== */

const SECTOR_DICTIONARY = {
  delivery: {
    id: 'delivery',
    name: 'Delivery & Alimentação',
    emoji: '🍔',
    color: '#ef4444',
    keywords: [
      'ifood', 'ifd*', 'rappi', 'ze delivery', 'zé delivery', 'aiqfome', 'uber eats',
      'restaurante', 'lanchonete', 'burger', 'mcdonald', 'bk ', 'burger king', 'outback',
      'pizzaria', 'pizza', 'sushi', 'padaria', 'panificadora', 'cafeteria', 'starbucks',
      'habibs', 'subway', 'madero', 'coco bambu', 'acai', 'açaí', 'sorveteria', 'churrascaria',
      'bar ', 'boteco', 'doceria', 'confeitaria', 'kfc', 'popeyes', 'spoleto', 'china in box'
    ]
  },
  transporte: {
    id: 'transporte',
    name: 'Transporte & Mobilidade',
    emoji: '🚗',
    color: '#334155',
    keywords: [
      'uber', '99app', '99 pop', '99*', '99 tecnologia', 'indriver', 'blablacar',
      'posto', 'ipiranga', 'shell', 'petrobras', 'br mania', 'ale combustiveis',
      'combustivel', 'gasolina', 'etanol', 'sem parar', 'veloe', 'conectcar', 'taggy',
      'pedagio', 'estacionamento', 'indigo', 'estapar', 'zona azul', 'metro', 'cptm',
      'bilhete unico', 'top sp', 'onibus', 'passagem', 'latam', 'gol ', 'azul linhas',
      'localiza', 'movida', 'unidas', 'turbi', 'buser'
    ]
  },
  mercado: {
    id: 'mercado',
    name: 'Mercado, Casa & Contas',
    emoji: '🏠',
    color: '#10b981',
    keywords: [
      'apartamento', 'apto', 'moradia', 'financiamento', 'prestacao', 'prestação',
      'conta de luz', 'energia', 'luz', 'internet', 'fibra', 'wi-fi', 'wifi', 'agua', 'água', 'gas', 'gás',
      'supermercado', 'mercado', 'atacadao', 'atacadão', 'assai', 'assaí', 'carrefour',
      'pao de acucar', 'pão de açúcar', 'extra', 'dia %', 'oba hortifruti', 'hortifruti',
      'sonda', 'mambo', 'zafari', 'condor', 'angeloni', 'bh supermercados', 'guanabara',
      'mundial', 'sam s club', 'sams club', 'minuto pao', 'oxxo', 'açougue', 'swift',
      'enel', 'cpfl', 'light', 'cemig', 'copel', 'celesc', 'neoenergia', 'equatorial',
      'sabesp', 'sanepar', 'copasa', 'cedae', 'comgas', 'naturgy', 'ultragaz',
      'vivo', 'claro', 'tim', 'oi fibra', 'net ', 'sky', 'condominio', 'condomínio', 'aluguel',
      'iptu', 'leroy merlin', 'telhanorte', 'c&c', 'tok&stok', 'madeiramadeira', 'lavanderia', 'rufino'
    ]
  },
  compras: {
    id: 'compras',
    name: 'Cartões, Bancos & Compras',
    emoji: '💳',
    color: '#8b5cf6',
    keywords: [
      'cartao', 'cartão', 'nubank', 'bradesco', 'itau', 'itaú', 'santander', 'inter', 'c6', 'fatura',
      'mercado livre', 'mercadolivre', 'meli', 'mercadopago*meli', 'amazon', 'shopee',
      'shein', 'aliexpress', 'magalu', 'magazine luiza', 'casas bahia', 'ponto frio',
      'fast shop', 'kabum', 'pichau', 'terabyte', 'apple', 'samsung', 'nike', 'adidas',
      'centauro', 'decathlon', 'renner', 'riachuelo', 'c&a', 'zara', 'hering', 'reserva',
      'netflix', 'spotify', 'disney', 'prime video', 'hbo', 'max ', 'youtube', 'globoplay',
      'twitch', 'steam', 'playstation', 'xbox', 'nintendo', 'cinema', 'cinemark', 'ingresso',
      'sympla', 'eventim', 'livraria', 'leitura', 'saraiva', 'sephora', 'boticario', 'natura'
    ]
  },
  saude: {
    id: 'saude',
    name: 'Saúde & Cuidados',
    emoji: '💊',
    color: '#06b6d4',
    keywords: [
      'droga raia', 'drogaraia', 'drogasil', 'raia drogasil', 'pague menos', 'drogaria',
      'farmacia', 'farmácia', 'panvel', 'ultrafarma', 'sao paulo', 'venancio', 'araujo',
      'nissei', 'extrafarma', 'hospital', 'clinica', 'clínica', 'laboratorio', 'delboni',
      'fleury', 'lavoisier', 'dasa', 'sabim', 'hermes pardini', 'consulta', 'medico',
      'médico', 'dentista', 'odonto', 'psicologo', 'terapia', 'unimed', 'amil', 'bradesco saude',
      'sulamerica', 'hapvida', 'notredame', 'smart fit', 'smartfit', 'bluefit', 'bodytech',
      'gympass', 'wellhub', 'totalpass', 'academia', 'crossfit', 'pilates', 'barbearia', 'salao'
    ]
  }
};

/**
 * Converte nomes de setor retornados pelo Gemini ("Delivery", "Transporte", "Mercado", "Outros", etc.)
 * para os IDs internos de tabela do aplicativo
 */
function normalizeGeminiSector(rawSector = '', merchantName = '', fullText = '') {
  const s = String(rawSector || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (SECTOR_DICTIONARY[s]) return s;
  if (/delivery|alimenta|ifood|restaurante|lanche/.test(s)) return 'delivery';
  if (/transporte|mobilidade|uber|99|combustivel/.test(s)) return 'transporte';
  if (/mercado|casa|moradia|conta|condominio|apartamento|luz|internet/.test(s)) return 'mercado';
  if (/saude|farmacia|medico|academia/.test(s)) return 'saude';
  if (/cartao|banco|compra|lazer/.test(s)) return 'compras';

  return classifyMerchantSector(merchantName, `${rawSector} ${fullText}`);
}

/**
 * Classifica automaticamente um estabelecimento ou texto em um dos 5 setores
 */
function classifyMerchantSector(merchantName = '', fullText = '') {
  const combined = `${merchantName} ${fullText}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const normMerchant = String(merchantName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [sectorKey, sectorData] of Object.entries(SECTOR_DICTIONARY)) {
    for (const kw of sectorData.keywords) {
      const normKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normMerchant.includes(normKw)) {
        return sectorKey;
      }
    }
  }

  for (const [sectorKey, sectorData] of Object.entries(SECTOR_DICTIONARY)) {
    for (const kw of sectorData.keywords) {
      const normKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (combined.includes(normKw)) {
        return sectorKey;
      }
    }
  }

  return 'compras';
}

/**
 * Identifica a Forma de Pagamento no texto extraído do comprovante
 */
function extractPaymentMethod(text = '') {
  const lower = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (/\bpix\b|chave pix|transferencia pix|qr code pix|pagamento via pix/.test(lower)) {
    return 'PIX';
  }
  if (/vale refeicao|alelo|sodexo|pluxee|vr beneficios|ticket restaurante|caju|flash/.test(lower)) {
    return 'Vale-Refeição';
  }
  if (/debito|maestro|visa electron|elo debito/.test(lower)) {
    return 'Cartão de Débito';
  }
  if (/credito|mastercard|visa|elo|amex|hipercard|nubank|itaucard|bradesco|cartao|parcelado|1x de|fatura/.test(lower)) {
    return 'Cartão de Crédito';
  }
  if (/dinheiro|especie|troco/.test(lower)) {
    return 'Dinheiro';
  }
  return 'PIX';
}

/**
 * Converte números flexíveis (ex: "R$3 095,00", "3872", "45,90")
 */
function parseFlexibleOCRNumber(raw) {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : Math.abs(raw);
  let s = String(raw || '').replace(/R\$/gi, '').replace(/\s+/g, '').trim();
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.abs(n);
}

/**
 * Verifica se o texto bruto do OCR local (Tesseract) é um Print da Planilha Mensal (Gabriel & Mirela)
 */
function tryParseCoupleTableFromOCRText(rawText = '') {
  const upper = rawText.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hasCoupleMarkers =
    upper.includes('SALARIO GABRIEL') ||
    upper.includes('SALARIO MIRELA') ||
    upper.includes('DESPESAS GABRIEL') ||
    upper.includes('DESPESAS MIRELA');

  if (!hasCoupleMarkers) return null;

  let salarioGabriel = 0;
  let salarioMirela = 0;
  const despesasGabriel = [];
  const despesasMirela = [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Extrai salários na linha de SALÁRIO GABRIEL / SALÁRIO MIRELA ou na linha imediatamente abaixo
  for (let i = 0; i < lines.length; i++) {
    const lineNorm = lines[i].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lineNorm.includes('SALARIO GABRIEL') || lineNorm.includes('SALARIO MIRELA')) {
      const nextLine = lines[i + 1] || '';
      // Procura os valores numéricos na linha abaixo (ex: "3872   R$3 095,00")
      const matches = nextLine.match(/(?:R\$\s*)?\d[\d\s\.]*(?:,\d{2})?/g) || [];
      const nums = matches.map(m => parseFlexibleOCRNumber(m)).filter(n => n > 100);
      if (lineNorm.includes('SALARIO GABRIEL') && lineNorm.includes('SALARIO MIRELA')) {
        if (nums[0]) salarioGabriel = nums[0];
        if (nums[1]) salarioMirela = nums[1];
      } else if (lineNorm.includes('SALARIO GABRIEL') && nums[0]) {
        salarioGabriel = nums[0];
      } else if (lineNorm.includes('SALARIO MIRELA') && nums[0]) {
        salarioMirela = nums[0];
      }
    }
  }

  // Extrai linhas de despesas abaixo de DESPESAS GABRIEL / DESPESAS MIRELA até TOTAL DE GASTOS
  let inExpensesSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNorm = line.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (lineNorm.includes('DESPESAS GABRIEL') || lineNorm.includes('DESPESAS MIRELA')) {
      inExpensesSection = true;
      continue;
    }
    if (!inExpensesSection) continue;
    if (lineNorm.includes('TOTAL DE GASTOS')) break;

    // Procura pares (Nome + Valor) na mesma linha (suporta 1 ou 2 pares lado a lado na mesma linha!)
    const pairRegex = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s]{1,28}?)\s+(?:R\$\s*)?(\d{1,3}(?:[\.\s]\d{3})*(?:,\d{2})|\d+(?:,\d{2})?)/g;
    const foundPairs = [];
    let match;
    while ((match = pairRegex.exec(line)) !== null) {
      const desc = match[1].replace(/\bR\$$/i, '').trim();
      const val = parseFlexibleOCRNumber(match[2]);
      if (desc && !/^(DESPESA|VALOR|TOTAL)/i.test(desc) && val > 0) {
        foundPairs.push({
          descricao: desc,
          valor: val,
          setor: classifyMerchantSector(desc, '')
        });
      }
    }

    if (foundPairs.length >= 2) {
      despesasGabriel.push(foundPairs[0]);
      despesasMirela.push(foundPairs[1]);
    } else if (foundPairs.length === 1) {
      despesasGabriel.push(foundPairs[0]);
    }
  }

  if (salarioGabriel > 0 || salarioMirela > 0 || despesasGabriel.length > 0 || despesasMirela.length > 0) {
    return {
      tipo: 'planilha_casal',
      salarioGabriel,
      salarioMirela,
      despesasGabriel,
      despesasMirela
    };
  }

  return null;
}

/**
 * Extrai dados de um comprovante de compra única via texto bruto do OCR (Fallback)
 */
function parseReceiptText(rawText = '') {
  // Primeiro verifica se o print é da Planilha Mensal (Gabriel & Mirela)
  const coupleTable = tryParseCoupleTableFromOCRText(rawText);
  if (coupleTable) {
    return coupleTable;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 1);

  const fullText = lines.join('\n');

  let amount = 0;
  const totalRegexes = [
    /(?:total\s*(?:pago|da\s*compra|do\s*pedido|a\s*pagar|geral)?|valor\s*(?:total|da\s*corrida|transferido|pago|do\s*pix)?)[^\d\n]{0,25}(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/gi,
    /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/gi,
    /\b(\d{1,4},\d{2})\b/g
  ];

  const foundAmounts = [];
  for (const regex of totalRegexes) {
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const rawVal = match[1].replace(/\.(?=\d{3},)/g, '').replace(',', '.');
      const num = parseFloat(rawVal);
      if (!isNaN(num) && num > 0 && num < 100000) {
        foundAmounts.push(num);
      }
    }
    if (foundAmounts.length > 0) break;
  }

  if (foundAmounts.length > 0) {
    amount = Math.max(...foundAmounts);
  }

  const now = new Date();
  let dateStr = now.toISOString().slice(0, 10);
  let timeStr = now.toTimeString().slice(0, 5);

  const monthsMap = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12'
  };

  const dateNumericMatch = fullText.match(/\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](20\d{2}|\d{2})\b/);
  const dateTextMatch = fullText.match(/\b(0?[1-9]|[12]\d|3[01])\s*(?:de\s*)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s*(?:de\s*)?(20\d{2})?\b/i);

  if (dateNumericMatch) {
    const day = dateNumericMatch[1].padStart(2, '0');
    const month = dateNumericMatch[2].padStart(2, '0');
    let year = dateNumericMatch[3];
    if (year.length === 2) year = '20' + year;
    dateStr = `${year}-${month}-${day}`;
  } else if (dateTextMatch) {
    const day = dateTextMatch[1].padStart(2, '0');
    const mKey = dateTextMatch[2].toLowerCase().slice(0, 3);
    const month = monthsMap[mKey] || String(now.getMonth() + 1).padStart(2, '0');
    const year = dateTextMatch[3] || String(now.getFullYear());
    dateStr = `${year}-${month}-${day}`;
  }

  const timeMatch = fullText.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
  if (timeMatch) {
    timeStr = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
  }

  let merchant = '';
  const knownBrands = [
    { pattern: /\bifood\b|ifd\*/i, label: 'iFood' },
    { pattern: /\brappi\b/i, label: 'Rappi' },
    { pattern: /\bz[eé]\s*delivery\b/i, label: 'Zé Delivery' },
    { pattern: /\buber\s*eats\b/i, label: 'Uber Eats' },
    { pattern: /\buber\b/i, label: 'Uber' },
    { pattern: /\b99\s*(?:pop|app|tecnologia|corrida)\b|\b99\*/i, label: '99 App' },
    { pattern: /\bmercado\s*livre\b|\bmeli\b/i, label: 'Mercado Livre' },
    { pattern: /\bamazon\b/i, label: 'Amazon' },
    { pattern: /\bshopee\b/i, label: 'Shopee' },
    { pattern: /\bshein\b/i, label: 'Shein' },
    { pattern: /\bdroga\s*raia\b/i, label: 'Droga Raia' },
    { pattern: /\bdrogasil\b/i, label: 'Drogasil' },
    { pattern: /\bpague\s*menos\b/i, label: 'Farmácia Pague Menos' },
    { pattern: /\bsmart\s*fit\b/i, label: 'Smart Fit' },
    { pattern: /\bcarrefour\b/i, label: 'Carrefour' },
    { pattern: /\bassai\b|\bassaí\b/i, label: 'Assaí Atacadista' },
    { pattern: /\batacadao\b|\batacadão\b/i, label: 'Atacadão' },
    { pattern: /\bp[aã]o\s*de\s*a[cç][uú]car\b/i, label: 'Pão de Açúcar' },
    { pattern: /\bnetflix\b/i, label: 'Netflix' },
    { pattern: /\bspotify\b/i, label: 'Spotify' },
    { pattern: /\bshell\b/i, label: 'Posto Shell' },
    { pattern: /\bipiranga\b/i, label: 'Posto Ipiranga' },
    { pattern: /\bsem\s*parar\b/i, label: 'Sem Parar' },
    { pattern: /\bmcdonald'?s\b|\barcos\s*dourados\b/i, label: "McDonald's" },
    { pattern: /\bburger\s*king\b/i, label: 'Burger King' },
    { pattern: /\boutback\b/i, label: 'Outback Steakhouse' }
  ];

  const receiverMatch = fullText.match(/(?:para|recebedor|favorecido|estabelecimento|destino|restaurante|loja)\s*[:\-]?\s*([A-Za-zÀ-ÿ0-9\s&\.\-]{3,40})/i);

  for (const b of knownBrands) {
    if (b.pattern.test(fullText)) {
      merchant = b.label;
      break;
    }
  }

  if (receiverMatch && receiverMatch[1]) {
    const candidate = receiverMatch[1].split('\n')[0].trim();
    if (candidate.length >= 3 && !/^(voce|você|banco|instituicao|cpf|cnpj)/i.test(candidate)) {
      merchant = merchant ? `${merchant} - ${candidate}` : candidate;
    }
  }

  if (!merchant) {
    const ignoredHeader = /comprovante|recibo|transferencia|pagamento|pix|nota fiscal|danfe|extrato|detalhes|pedido concluido|corrida/i;
    for (const line of lines.slice(0, 6)) {
      if (!ignoredHeader.test(line) && !/r\$|\d{2}\/\d{2}/i.test(line) && line.length >= 3 && line.length <= 42) {
        merchant = line;
        break;
      }
    }
  }

  if (!merchant) merchant = 'Estabelecimento Identificado';

  const owner = /mirela/i.test(fullText) ? 'mirela' : 'gabriel';
  const sector = classifyMerchantSector(merchant, fullText);
  const paymentMethod = extractPaymentMethod(fullText);

  return {
    tipo: 'compra_unica',
    amount: amount > 0 ? amount : 0,
    date: dateStr,
    time: timeStr,
    merchant: merchant.slice(0, 50),
    owner,
    sector,
    paymentMethod,
    rawText
  };
}

/**
 * Pré-processa a imagem em um Canvas para melhorar nitidez no fallback Tesseract.js
 */
async function preprocessImageForOCR(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1500;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;

      let totalLum = 0;
      for (let i = 0; i < d.length; i += 16) {
        totalLum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      }
      const avgLum = totalLum / (d.length / 16);
      const isDarkBackground = avgLum < 110;

      for (let i = 0; i < d.length; i += 4) {
        let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (isDarkBackground) gray = 255 - gray;
        gray = gray < 145 ? Math.max(0, gray * 0.65) : Math.min(255, gray * 1.15);
        d[i] = d[i + 1] = d[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Obtém a chave de API do Gemini configurada no localStorage ou no ambiente local (.env / env-local.js)
 */
function getConfiguredGeminiApiKey() {
  const fromStorage = localStorage.getItem('godoyfin_gemini_api_key');
  if (fromStorage && fromStorage.trim().length > 10) {
    return fromStorage.trim();
  }
  if (typeof window.__VITE_GEMINI_API_KEY__ === 'string' && window.__VITE_GEMINI_API_KEY__.trim().length > 10) {
    return window.__VITE_GEMINI_API_KEY__.trim();
  }
  return '';
}

/**
 * 2. FUNÇÃO DE LEITURA DE IMAGEM COM GEMINI VISION (gemini-2.5-flash) + FALLBACK AUTOMÁTICO
 */
async function recognizeReceiptFromImage(imageDataUrl, onProgress = () => {}) {
  const geminiKey = getConfiguredGeminiApiKey();

  if (geminiKey.length > 10) {
    try {
      onProgress(20, 'Enviando imagem para Google Gemini Vision (gemini-2.5-flash)...');
      const base64Clean = imageDataUrl.split(',')[1];
      const mimeType = imageDataUrl.substring(imageDataUrl.indexOf(':') + 1, imageDataUrl.indexOf(';')) || 'image/png';

      const systemPrompt = `Você é o motor de visão computacional financeira do aplicativo Nosso Bolso (Gabriel & Mirela).
Analise a imagem enviada e identifique qual dos DOIS CENÁRIOS abaixo ela representa, retornando ESTRITAMENTE um JSON válido (sem markdown extra):

CENÁRIO A: Print de Compra Única (iFood, Uber, 99, Comprovante PIX, Nota Fiscal, Recibo de Cartão)
Retorne este formato JSON exato:
{
  "tipo": "compra_unica",
  "estabelecimento": "Nome do estabelecimento ou app",
  "valor": 0.00,
  "data": "YYYY-MM-DD",
  "hora": "HH:MM",
  "setor": "Delivery | Transporte | Mercado | Outros",
  "formaPagamento": "PIX | Cartão de Crédito | Cartão de Débito | Vale-Refeição | Dinheiro",
  "responsavel": "Gabriel | Mirela"
}

CENÁRIO B: Print da Planilha Mensal (Tabela com SALÁRIO GABRIEL, SALÁRIO MIRELA, DESPESAS GABRIEL e DESPESAS MIRELA)
Se a imagem contiver a tabela de controle mensal do casal, extraia os salários no topo e todas as despesas de cada coluna (ignorando a linha TOTAL DE GASTOS) neste formato JSON exato:
{
  "tipo": "planilha_casal",
  "salarioGabriel": 0.00,
  "salarioMirela": 0.00,
  "despesasGabriel": [
    { "descricao": "Nome da despesa", "valor": 0.00, "setor": "Mercado | Compras | Delivery | Transporte | Saude" }
  ],
  "despesasMirela": [
    { "descricao": "Nome da despesa", "valor": 0.00, "setor": "Mercado | Compras | Delivery | Transporte | Saude" }
  ]
}`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Clean
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API HTTP ${response.status}`);
      }

      onProgress(85, 'Processando resposta estruturada do Gemini Vision...');
      const data = await response.json();
      const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = textResp.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        onProgress(100, 'Leitura concluída com Gemini 2.5 Flash!');

        // Cenário B: Print da Planilha Mensal (Tabela Gabriel & Mirela)
        if (parsed.tipo === 'planilha_casal' || Array.isArray(parsed.despesasGabriel) || Array.isArray(parsed.despesasMirela)) {
          return {
            tipo: 'planilha_casal',
            salarioGabriel: parseFlexibleOCRNumber(parsed.salarioGabriel),
            salarioMirela: parseFlexibleOCRNumber(parsed.salarioMirela),
            despesasGabriel: (parsed.despesasGabriel || []).map(item => ({
              descricao: String(item.descricao || 'Despesa').trim(),
              valor: parseFlexibleOCRNumber(item.valor),
              setor: normalizeGeminiSector(item.setor, item.descricao)
            })).filter(i => i.valor > 0),
            despesasMirela: (parsed.despesasMirela || []).map(item => ({
              descricao: String(item.descricao || 'Despesa').trim(),
              valor: parseFlexibleOCRNumber(item.valor),
              setor: normalizeGeminiSector(item.setor, item.descricao)
            })).filter(i => i.valor > 0)
          };
        }

        // Cenário A: Print de Compra Única
        const merchant = parsed.estabelecimento || parsed.merchant || 'Estabelecimento';
        const amount = parseFlexibleOCRNumber(parsed.valor ?? parsed.amount);
        const rawRespOwner = String(parsed.responsavel || 'Gabriel').toLowerCase();
        const owner = rawRespOwner.includes('mirela') ? 'mirela' : 'gabriel';

        return {
          tipo: 'compra_unica',
          amount,
          date: parsed.data || parsed.date || new Date().toISOString().slice(0, 10),
          time: parsed.hora || parsed.time || new Date().toTimeString().slice(0, 5),
          merchant,
          owner,
          sector: normalizeGeminiSector(parsed.setor || parsed.sector, merchant, textResp),
          paymentMethod: parsed.formaPagamento || parsed.paymentMethod || 'PIX',
          rawText: textResp
        };
      }
    } catch (err) {
      console.warn('Gemini API retornou erro ou limite; acionando Fallback Automático Local (Tesseract.js):', err);
      onProgress(25, 'Chave API indisponível no momento. Acionando leitor local automático (Fallback)...');
    }
  }

  // 3. FALLBACK AUTOMÁTICO LOCAL (Tesseract.js + Parser Nativo)
  onProgress(30, 'Melhorando nitidez e contraste do print (Leitor Local)...');
  const processedDataUrl = await preprocessImageForOCR(imageDataUrl);

  if (typeof Tesseract !== 'undefined') {
    onProgress(40, 'Executando OCR óptico local...');
    const result = await Tesseract.recognize(processedDataUrl, 'por+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(40 + (m.progress || 0) * 55);
          onProgress(pct, `Lendo imagem localmente (${pct}%)...`);
        }
      }
    });
    onProgress(100, 'Classificando dados extraídos...');
    const rawText = result?.data?.text || '';
    return parseReceiptText(rawText);
  } else {
    throw new Error('Biblioteca OCR local não carregada.');
  }
}

/**
 * Gera uma assinatura rápida da imagem para detecção de duplicidade
 */
function computeImageSignature(dataUrl = '') {
  if (!dataUrl) return '';
  const sample = dataUrl.slice(0, 200) + dataUrl.slice(-200) + dataUrl.length;
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = (hash << 5) - hash + sample.charCodeAt(i);
    hash |= 0;
  }
  return 'img_' + Math.abs(hash).toString(16);
}

/**
 * Gerador de Prints Reais em Canvas (incluindo Print da Planilha Mensal Gabriel & Mirela!)
 */
function generateSampleReceiptDataUrl(preset = 'ifood', selectedMonthStr = '2026-10') {
  if (preset === 'planilha_casal') {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Blocos de Salários no Topo
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('SALARIO GABRIEL', 40, 50);
    ctx.fillText('SALARIO MIRELA', 420, 50);

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#047857';
    ctx.fillText('3872', 40, 85);
    ctx.fillText('R$3 095,00', 420, 85);

    // Cabeçalho das Tabelas Lado a Lado
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('DESPESAS GABRIEL', 40, 145);
    ctx.fillText('DESPESAS MIRELA', 420, 145);

    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    const rows = [
      ['Apartamento   R$ 850,00', 'Apartamento   R$ 850,00'],
      ['Condominio   R$ 260,00', 'Condominio   R$ 260,00'],
      ['Bradesco   R$ 420,00', 'Nubank   R$ 615,00'],
      ['Cartao Gabriel   R$ 580,00', 'Tim   R$ 65,00'],
      ['Conta de luz   R$ 195,00', 'Rufino   R$ 180,00'],
      ['Internet   R$ 120,00', '']
    ];

    let y = 190;
    for (const [left, right] of rows) {
      if (left) ctx.fillText(left, 40, y);
      if (right) ctx.fillText(right, 420, y);
      y += 42;
    }

    ctx.font = 'bold 19px Arial, sans-serif';
    ctx.fillText('TOTAL DE GASTOS   R$ 2.425,00', 40, 470);
    ctx.fillText('TOTAL DE GASTOS   R$ 1.970,00', 420, 470);

    return canvas.toDataURL('image/png');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');

  const day = String(Math.floor(Math.random() * 20) + 5).padStart(2, '0');
  const dateBR = `${day}/${selectedMonthStr.split('-')[1]}/${selectedMonthStr.split('-')[0]}`;

  const presets = {
    ifood: {
      bg: '#ffffff',
      headerBg: '#ea1d2c',
      title: 'iFood - Detalhes do Pedido',
      subtitle: 'Pedido #8492 concluído',
      merchantLine: 'Restaurante: Burger House Gourmet',
      items: [
        '1x Combo Smash Duplo Bacon      R$ 42,90',
        '1x Batata Rústica Grande        R$ 16,00',
        'Taxa de entrega                 R$ 6,00'
      ],
      total: 'R$ 64,90',
      payment: 'Pagamento pelo app: PIX',
      date: `${dateBR} 20:42`
    },
    uber: {
      bg: '#f8fafc',
      headerBg: '#0f172a',
      title: 'Uber - Recibo da sua viagem',
      subtitle: 'UberX • Viagem concluída',
      merchantLine: 'Estabelecimento: Uber do Brasil Tecnologia',
      items: [
        'Preço da viagem                 R$ 26,40',
        'Taxa de intermediação           R$ 2,50',
        'Pedágio urbano                  R$ 0,00'
      ],
      total: 'R$ 28,90',
      payment: 'Forma de pagamento: Cartão de Crédito Mastercard',
      date: `${dateBR} 08:15`
    },
    mercado: {
      bg: '#ffffff',
      headerBg: '#10b981',
      title: 'Comprovante de Pagamento PIX',
      subtitle: 'Transferência concluída com sucesso',
      merchantLine: 'Para: Carrefour Comércio e Indústria',
      items: [
        'Instituição: Banco Carrefour',
        'Tipo de transferência: QR Code PIX',
        'Compras de Supermercado e Hortifruti'
      ],
      total: 'R$ 342,80',
      payment: 'Pagamento via PIX',
      date: `${dateBR} 18:30`
    },
    compras: {
      bg: '#ffffff',
      headerBg: '#7c3aed',
      title: 'Mercado Livre - Compra Aprovada',
      subtitle: 'Chegará amanhã no seu endereço',
      merchantLine: 'Estabelecimento: Mercado Livre Brasil',
      items: [
        '1x Fone Bluetooth TWS Noise Cancelling',
        'Frete Full Grátis               R$ 0,00'
      ],
      total: 'R$ 189,90',
      payment: 'Forma de pagamento: Cartão de Crédito 1x',
      date: `${dateBR} 14:22`
    },
    saude: {
      bg: '#ffffff',
      headerBg: '#0891b2',
      title: 'Droga Raia - Cupom Fiscal',
      subtitle: 'Raia Drogasil S/A',
      merchantLine: 'Loja: Droga Raia Jardins',
      items: [
        '1x Vitamina C + Zinco 60 caps   R$ 49,90',
        '1x Protetor Solar Facial FPS60  R$ 78,50'
      ],
      total: 'R$ 128,40',
      payment: 'Forma de pagamento: Cartão de Débito',
      date: `${dateBR} 11:05`
    }
  };

  const p = presets[preset] || presets.ifood;

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = p.headerBg;
  ctx.fillRect(0, 0, canvas.width, 125);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText(p.title, 32, 58);
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText(p.subtitle, 32, 95);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 21px Arial, sans-serif';
  ctx.fillText(p.merchantLine, 32, 185);

  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Data e Hora: ${p.date}`, 32, 225);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 255);
  ctx.lineTo(488, 255);
  ctx.stroke();

  ctx.font = '18px Courier New, monospace';
  ctx.fillStyle = '#1e293b';
  let y = 300;
  for (const item of p.items) {
    ctx.fillText(item, 32, y);
    y += 42;
  }

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(32, 450, 456, 95);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(32, 450, 456, 95);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText(`Valor Total: ${p.total}`, 52, 508);

  ctx.font = 'bold 19px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(p.payment, 32, 595);

  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Comprovante autenticado digitalmente • Nosso Bolso OCR', 32, 640);

  return canvas.toDataURL('image/png');
}

window.OCRService = {
  SECTOR_DICTIONARY,
  classifyMerchantSector,
  normalizeGeminiSector,
  extractPaymentMethod,
  parseReceiptText,
  recognizeReceiptFromImage,
  computeImageSignature,
  generateSampleReceiptDataUrl,
  getConfiguredGeminiApiKey
};
