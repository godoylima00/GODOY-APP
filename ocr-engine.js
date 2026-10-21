/* ==========================================================================
   GodoyFin - Motor de Visão Computacional / OCR & Classificador Inteligente
   Suporta:
   1. Tesseract.js (OCR Local no Navegador com pré-processamento de contraste)
   2. Google Gemini Vision API (Opcional, caso o usuário insira chave API)
   3. Heurísticas NLP para Comprovantes Brasileiros (iFood, Uber, 99, PIX, NFC-e)
   4. Gerador de Prints Reais em Canvas para demonstração rápida
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
    name: 'Mercado & Casa',
    emoji: '🛒',
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
    name: 'Compras, Cartões & Lazer',
    emoji: '🛍️',
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
 * Classifica automaticamente um estabelecimento ou texto em um dos 5 setores
 */
function classifyMerchantSector(merchantName = '', fullText = '') {
  const combined = `${merchantName} ${fullText}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Prioridade para o nome do estabelecimento primeiro
  const normMerchant = merchantName
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

  // Fallback buscando no texto completo do comprovante
  for (const [sectorKey, sectorData] of Object.entries(SECTOR_DICTIONARY)) {
    for (const kw of sectorData.keywords) {
      const normKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (combined.includes(normKw)) {
        return sectorKey;
      }
    }
  }

  return 'compras'; // Categoria padrão caso não reconheça
}

/**
 * Identifica a Forma de Pagamento no texto extraído do comprovante
 */
function extractPaymentMethod(text = '') {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (/\bpix\b|chave pix|transferencia pix|qr code pix|pagamento via pix/.test(lower)) {
    return 'PIX';
  }
  if (/vale refeicao|alelo|sodexo|pluxee|vr beneficios|ticket restaurante|caju|flash/.test(lower)) {
    return 'Vale-Refeição';
  }
  if (/debito|maestro|visa electron|elo debito/.test(lower)) {
    return 'Cartão de Débito';
  }
  if (/credito|mastercard|visa|elo|amex|hipercard|nubank|itaucard|parcelado|1x de|fatura/.test(lower)) {
    return 'Cartão de Crédito';
  }
  if (/dinheiro|especie|troco/.test(lower)) {
    return 'Dinheiro';
  }
  return 'PIX';
}

/**
 * Extrai Valor Total (R$), Data, Hora, Estabelecimento, Categoria e Pagamento do texto bruto do OCR
 */
function parseReceiptText(rawText = '') {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 1);

  const fullText = lines.join('\n');

  // 1. EXTRAÇÃO DE VALOR TOTAL
  let amount = 0;
  // Procura padrões explícitos de Total primeiro
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
    // Em notas e recibos de pedido (iFood/Mercado), o total costuma ser o maior valor (soma dos itens + taxa)
    amount = Math.max(...foundAmounts);
  }

  // 2. EXTRAÇÃO DE DATA E HORA
  const now = new Date();
  let dateStr = now.toISOString().slice(0, 10);
  let timeStr = now.toTimeString().slice(0, 5);

  const monthsMap = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12'
  };

  // Formato DD/MM/YYYY ou DD/MM/YY
  const dateNumericMatch = fullText.match(/\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](20\d{2}|\d{2})\b/);
  // Formato "21 OUT 2026" ou "21 de outubro de 2026"
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

  // Hora HH:MM
  const timeMatch = fullText.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
  if (timeMatch) {
    timeStr = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
  }

  // 3. EXTRAÇÃO DE NOME DO ESTABELECIMENTO / APP
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

  // Procura também por "Para:", "Recebedor:", "Favorecido:", "Estabelecimento:", "Restaurante:"
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
    // Pega a primeira linha significativa que não seja "Comprovante", "Recibo", data ou valor
    const ignoredHeader = /comprovante|recibo|transferencia|pagamento|pix|nota fiscal|danfe|extrato|detalhes|pedido concluido|corrida/i;
    for (const line of lines.slice(0, 6)) {
      if (!ignoredHeader.test(line) && !/r\$|\d{2}\/\d{2}/i.test(line) && line.length >= 3 && line.length <= 42) {
        merchant = line;
        break;
      }
    }
  }

  if (!merchant) {
    merchant = 'Estabelecimento Identificado';
  }

  // 4. CATEGORIA SUGERIDA E FORMA DE PAGAMENTO
  const sector = classifyMerchantSector(merchant, fullText);
  const paymentMethod = extractPaymentMethod(fullText);

  return {
    amount: amount > 0 ? amount : 0,
    date: dateStr,
    time: timeStr,
    merchant: merchant.slice(0, 50),
    sector,
    paymentMethod,
    rawText
  };
}

/**
 * Pré-processa a imagem em um Canvas (escala + contraste) para melhorar leitura do Tesseract.js
 */
async function preprocessImageForOCR(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1400;
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

      // Aumenta nitidez/contraste em tons de cinza e detecta se o fundo é escuro (Dark Mode print)
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
        if (isDarkBackground) {
          gray = 255 - gray; // Inverte prints em Dark Mode para texto preto no fundo branco!
        }
        // Contraste suave
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
 * Executa OCR via Gemini Vision (se chave configurada) ou via Tesseract.js local
 */
async function recognizeReceiptFromImage(imageDataUrl, onProgress = () => {}) {
  const geminiKey = localStorage.getItem('godoyfin_gemini_api_key') || '';

  // 1. Se o usuário configurou uma API Key do Google Gemini, usa Visão Computacional IA direta
  if (geminiKey.trim().length > 15) {
    try {
      onProgress(25, 'Analisando print com IA Vision (Gemini)...');
      const base64Clean = imageDataUrl.split(',')[1];
      const mimeType = imageDataUrl.substring(imageDataUrl.indexOf(':') + 1, imageDataUrl.indexOf(';')) || 'image/png';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `Você é um leitor especialista de comprovantes e prints financeiros brasileiros (iFood, Uber, 99, PIX, Notas Fiscais, Cartão).
Extraia os dados da imagem e retorne APENAS um JSON válido com as chaves:
{
  "amount": numero_decimal_ex_45.90,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "merchant": "Nome do Estabelecimento ou App",
  "sector": "delivery" | "transporte" | "mercado" | "compras" | "saude",
  "paymentMethod": "PIX" | "Cartão de Crédito" | "Cartão de Débito" | "Vale-Refeição" | "Dinheiro",
  "rawText": "Resumo textual do comprovante"
}`
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Clean
                  }
                }
              ]
            }]
          })
        }
      );

      if (response.ok) {
        onProgress(85, 'Interpretando dados extraídos...');
        const data = await response.json();
        const textResp = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = textResp.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          onProgress(100, 'Leitura concluída com IA!');
          return {
            amount: Number(parsed.amount) || 0,
            date: parsed.date || new Date().toISOString().slice(0, 10),
            time: parsed.time || new Date().toTimeString().slice(0, 5),
            merchant: parsed.merchant || 'Estabelecimento',
            sector: SECTOR_DICTIONARY[parsed.sector] ? parsed.sector : classifyMerchantSector(parsed.merchant, parsed.rawText),
            paymentMethod: parsed.paymentMethod || 'PIX',
            rawText: parsed.rawText || textResp
          };
        }
      }
    } catch (err) {
      console.warn('Fallback para Tesseract.js local:', err);
    }
  }

  // 2. OCR Local 100% Gratuito no Navegador com Tesseract.js
  onProgress(15, 'Melhorando nitidez e contraste do print...');
  const processedDataUrl = await preprocessImageForOCR(imageDataUrl);

  if (typeof Tesseract !== 'undefined') {
    onProgress(30, 'Iniciando motor OCR óptico...');
    const result = await Tesseract.recognize(processedDataUrl, 'por+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(30 + (m.progress || 0) * 65);
          onProgress(pct, `Lendo texto da imagem (${pct}%)...`);
        }
      }
    });
    onProgress(100, 'Classificando estabelecimento e valores...');
    const rawText = result?.data?.text || '';
    return parseReceiptText(rawText);
  } else {
    throw new Error('Biblioteca OCR não carregada.');
  }
}

/**
 * Gera uma assinatura rápida (hash visual/bytes) da imagem para ajudar na detecção de duplicidade
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
 * Gerador de Prints Simulados Realistas em Canvas (para o usuário testar o OCR com 1 clique!)
 */
function generateSampleReceiptDataUrl(preset = 'ifood', selectedMonthStr = '2026-10') {
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

  // Fundo
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cabeçalho colorido
  ctx.fillStyle = p.headerBg;
  ctx.fillRect(0, 0, canvas.width, 125);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText(p.title, 32, 58);
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText(p.subtitle, 32, 95);

  // Corpo com fonte limpa e alto contraste para o OCR ler perfeitamente
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 21px Arial, sans-serif';
  ctx.fillText(p.merchantLine, 32, 185);

  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Data e Hora: ${p.date}`, 32, 225);

  // Linha divisória
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 255);
  ctx.lineTo(488, 255);
  ctx.stroke();

  // Itens
  ctx.font = '18px Courier New, monospace';
  ctx.fillStyle = '#1e293b';
  let y = 300;
  for (const item of p.items) {
    ctx.fillText(item, 32, y);
    y += 42;
  }

  // Caixa de Total
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(32, 450, 456, 95);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(32, 450, 456, 95);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText(`Valor Total: ${p.total}`, 52, 508);

  // Pagamento
  ctx.font = 'bold 19px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(p.payment, 32, 595);

  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Comprovante autenticado digitalmente • GodoyFin OCR', 32, 640);

  return canvas.toDataURL('image/png');
}

window.OCRService = {
  SECTOR_DICTIONARY,
  classifyMerchantSector,
  extractPaymentMethod,
  parseReceiptText,
  recognizeReceiptFromImage,
  computeImageSignature,
  generateSampleReceiptDataUrl
};
