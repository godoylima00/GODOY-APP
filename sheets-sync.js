/* ==========================================================================
   GodoyFin - Integração e Sincronização com Google Planilhas & Excel (.xlsx/.csv)
   Suporte Especializado ao Modelo Lado a Lado: GABRIEL & MIRELA
   - Detecta SALÁRIO GABRIEL e SALÁRIO MIRELA dinamicamente no topo
   - Detecta DESPESAS GABRIEL (esquerda) e DESPESAS MIRELA (direita) até TOTAL DE GASTOS
   - Mapeia cada despesa para seu Setor e atribui o responsável (Gabriel ou Mirela)
   - Envio automático via Webhook (Google Apps Script) e indicador de sincronização
   ========================================================================== */

const SHEETS_CONFIG_KEY = 'godoyfin_sheets_config_v1';

let sheetsConfig = {
  sheetUrl: '',
  webhookUrl: '',
  autoPush: true,
  lastSyncTimestamp: null,
  lastSyncStats: null
};

const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GodoyFin - Script de Integração Bidirecional com Google Planilhas (Gabriel & Mirela)
 * Como usar:
 * 1. Na sua Planilha do Google, clique em Extensões > Apps Script
 * 2. Apague tudo, cole este código e clique em Salvar
 * 3. Clique em "Implantar" > "Nova implantação" > Tipo: "App da Web"
 * 4. Em "Quem pode acessar", selecione "Qualquer pessoa" e clique em Implantar
 * 5. Copie a URL gerada e cole no campo Webhook do GodoyFin!
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var items = payload.transactions ? payload.transactions : [payload.transaction];
    var monthLabel = payload.monthLabel || 'Lancamentos';
    var monthSheet = getOrCreateSheet(ss, monthLabel);

    items.forEach(function(tx) {
      if (!tx) return;
      appendTxRow(monthSheet, tx);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', count: items.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var matrix = sheet.getDataRange().getDisplayValues();
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', matrix: matrix }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  var cleanName = String(name).slice(0, 30);
  var sheet = ss.getSheetByName(cleanName);
  if (!sheet) {
    sheet = ss.insertSheet(cleanName);
    var headers = ['Data', 'Responsável', 'Estabelecimento / Despesa', 'Categoria / Setor', 'Forma de Pagamento', 'Valor (R$)', 'ID GodoyFin'];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#820ad1').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendTxRow(sheet, tx) {
  sheet.appendRow([
    tx.dateBR || tx.date || '',
    tx.ownerLabel || tx.owner || 'Casal',
    tx.merchant || '',
    tx.sectorName || tx.sector || '',
    tx.paymentMethod || 'PIX',
    Number(tx.amount) || 0,
    tx.id || ''
  ]);
}`;

/* ==========================================================================
   Persistência da Configuração do Google Sheets
   ========================================================================== */

function loadSheetsConfig() {
  try {
    const raw = localStorage.getItem(SHEETS_CONFIG_KEY);
    if (raw) {
      sheetsConfig = { ...sheetsConfig, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Erro ao carregar configuração do Google Sheets:', e);
  }
}

function saveSheetsConfig() {
  try {
    localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(sheetsConfig));
  } catch (e) {
    console.warn('Erro ao salvar configuração do Google Sheets:', e);
  }
  updateSheetsSyncStatusUI();
}

/* ==========================================================================
   Indicador Visual de Status ("Última sincronização: há X minutos")
   ========================================================================== */

function getRelativeSyncTimeText(timestamp) {
  if (!timestamp) return 'Ainda não sincronizado';
  const diffSec = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 1000));
  if (diffSec < 45) return 'há menos de 1 minuto';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return 'há 1 minuto';
  if (diffMin < 60) return `há ${diffMin} minutos`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return 'há 1 hora';
  if (diffHours < 24) return `há ${diffHours} horas`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
}

function updateSheetsSyncStatusUI() {
  const statusTextEl = document.getElementById('sheets-sync-status-text');
  const dotEl = document.getElementById('sheets-sync-status-dot');
  const webhookBadgeEl = document.getElementById('sheets-webhook-active-badge');

  const relText = getRelativeSyncTimeText(sheetsConfig.lastSyncTimestamp);
  if (statusTextEl) {
    statusTextEl.textContent = `Última sincronização com Google Sheets: ${relText}`;
  }

  if (dotEl) {
    if (sheetsConfig.lastSyncTimestamp) {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0';
    } else if (sheetsConfig.sheetUrl || sheetsConfig.webhookUrl) {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0';
    } else {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0';
    }
  }

  if (webhookBadgeEl) {
    if (sheetsConfig.webhookUrl && sheetsConfig.autoPush) {
      webhookBadgeEl.classList.remove('hidden');
    } else {
      webhookBadgeEl.classList.add('hidden');
    }
  }
}

/* ==========================================================================
   Conversor Inteligente de URL do Google Sheets -> CSV Export URL
   ========================================================================== */

function buildGoogleSheetsFetchUrls(rawUrl = '') {
  const trimmed = rawUrl.trim();
  if (!trimmed) return [];

  if (trimmed.includes('script.google.com/macros/')) {
    return [trimmed];
  }

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  if (idMatch && idMatch[1] && idMatch[1] !== 'e') {
    const sheetId = idMatch[1];
    return [
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`
    ];
  }

  if (trimmed.includes('/spreadsheets/d/e/') && trimmed.includes('/pub')) {
    const csvPub = trimmed.replace(/\/pubhtml.*$/, '/pub?output=csv').replace(/\/pub\?(?!.*output=csv)/, '/pub?output=csv&');
    return [csvPub, trimmed];
  }

  return [trimmed];
}

/* ==========================================================================
   Utilitários de Parsing Numérico Flexível (Ex: "3872", "R$3 095,00", "1.450,00")
   ========================================================================== */

function normUpper(val = '') {
  return String(val ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte strings monetárias brasileiras ou números puros com/sem R$, espaços de milhar e vírgulas
 * Ex: "3872" -> 3872 | "R$3 095,00" -> 3095 | "R$ 1.250,90" -> 1250.90 | "1 200" -> 1200
 */
function parseCurrencyCell(rawVal = '') {
  if (typeof rawVal === 'number') {
    return isNaN(rawVal) ? NaN : Math.abs(rawVal);
  }
  const str = String(rawVal ?? '').trim();
  if (!str) return NaN;

  // Ignora datas ou horários (ex: 20/10/2026 ou 12:30)
  if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(str) || /^\d{1,2}:\d{2}/.test(str)) {
    return NaN;
  }

  // Remove "R$", letras e mantém apenas dígitos, espaços, pontos, vírgulas e traço
  let cleaned = str.replace(/R\$/gi, '').trim();

  // Verifica se a célula tem texto descritivo junto sem ser apenas moeda
  // (Se tiver muitas letras como "Apartamento", não é célula puramente numérica)
  const lettersCount = (cleaned.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (lettersCount > 2) return NaN;

  // Remove espaços internos de milhar (ex: "3 095,00" -> "3095,00")
  cleaned = cleaned.replace(/\s+/g, '');
  cleaned = cleaned.replace(/[^0-9.,\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === ',') return NaN;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes('.')) {
    // Se tiver formato de milhar brasileiro exato (ex: "3.095" ou "1.200")
    if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : Math.abs(num);
}

function splitDelimitedLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(lines) {
  const sample = lines.slice(0, 10).join('\n');
  const tabCount = (sample.match(/\t/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;

  if (tabCount > 0 && tabCount >= semiCount) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

function textToMatrix(rawText = '') {
  // Não faz trim() na linha inteira antes de dividir para preservar colunas vazias à esquerda!
  const rawLines = String(rawText || '')
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0);

  if (rawLines.length === 0) return [];
  const delimiter = detectDelimiter(rawLines);
  return rawLines.map(line => splitDelimitedLine(line, delimiter));
}

function mapCategoryNameOrMerchantToSector(categoryCell = '', merchantCell = '') {
  const normCat = normUpper(categoryCell);
  const normMerch = normUpper(merchantCell);
  const combined = `${normCat} ${normMerch}`;

  if (/APARTAMENTO|APTO|CONDOMINIO|ALUGUEL|LUZ|CONTA DE LUZ|ENERGIA|INTERNET|AGUA|GAS|MERCADO|SUPERMERCADO|CASA|RUFINO|SABESP|ENEL|VIVO|CLARO|TIM/.test(combined)) {
    return 'mercado';
  }
  if (/CARTAO|NUBANK|BRADESCO|ITAU|SANTANDER|INTER|C6|FATURA|COMPRA|LAZER|AMAZON|MERCADO LIVRE|SHOPEE|NETFLIX|SPOTIFY/.test(combined)) {
    return 'compras';
  }
  if (/IFOOD|RAPPI|DELIVERY|RESTAURANTE|LANCHE|PIZZA|BURGER|PADARIA|ALIMENTA/.test(combined)) {
    return 'delivery';
  }
  if (/UBER|99|TRANSPORTE|COMBUSTIVEL|GASOLINA|POSTO|PEDAGIO|ESTACIONAMENTO/.test(combined)) {
    return 'transporte';
  }
  if (/FARMACIA|DROGA|SAUDE|MEDICO|CONSULTA|ACADEMIA|SMART FIT|DENTISTA/.test(combined)) {
    return 'saude';
  }

  if (window.OCRService) {
    return window.OCRService.classifyMerchantSector(merchantCell, categoryCell);
  }
  return 'compras';
}

function inferPaymentFromExpenseName(name = '', rawPayment = '') {
  const combined = normUpper(`${rawPayment} ${name}`);
  if (/CARTAO|NUBANK|BRADESCO|ITAU|SANTANDER|CREDITO|FATURA/.test(combined)) {
    return 'Cartão de Crédito';
  }
  if (/DEBITO/.test(combined)) return 'Cartão de Débito';
  if (/VALE|REFEICAO|ALELO|SODEXO|VR/.test(combined)) return 'Vale-Refeição';
  if (/DINHEIRO|ESPECIE/.test(combined)) return 'Dinheiro';
  return 'PIX';
}

/* ==========================================================================
   1. LEITOR DINÂMICO DO MODELO DE PLANILHA LADO A LADO (GABRIEL & MIRELA)
   ========================================================================== */

/**
 * Analisa uma matriz 2D de planilha procurando:
 * - "SALÁRIO GABRIEL" e valor logo abaixo (ou ao lado)
 * - "SALÁRIO MIRELA" e valor logo abaixo (ou ao lado)
 * - Bloco "DESPESAS GABRIEL" (Nome | Valor) até "TOTAL DE GASTOS"
 * - Bloco "DESPESAS MIRELA" (Nome | Valor) até "TOTAL DE GASTOS"
 */
function parseGabrielMirelaMatrix(matrix = [], targetMonth = '2026-10') {
  let salaryGabriel = null;
  let salaryMirela = null;
  let gabrielBlock = null;
  let mirelaBlock = null;

  // 1. Varre a matriz procurando cabeçalhos de Salários e Despesas
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cellText = normUpper(row[c]);
      if (!cellText) continue;

      // Detecção de SALÁRIO GABRIEL
      if (cellText.includes('SALARIO GABRIEL') || cellText.includes('SALARIO DO GABRIEL')) {
        const extracted = extractSalaryNearCell(matrix, r, c);
        if (extracted !== null) salaryGabriel = extracted;
      }

      // Detecção de SALÁRIO MIRELA
      if (cellText.includes('SALARIO MIRELA') || cellText.includes('SALARIO DA MIRELA')) {
        const extracted = extractSalaryNearCell(matrix, r, c);
        if (extracted !== null) salaryMirela = extracted;
      }

      // Detecção do Bloco DESPESAS GABRIEL
      if (
        !gabrielBlock &&
        (cellText.includes('DESPESAS GABRIEL') ||
         cellText.includes('DESPESA GABRIEL') ||
         cellText.includes('GASTOS GABRIEL'))
      ) {
        gabrielBlock = { headerRow: r, col: c, owner: 'gabriel' };
      }

      // Detecção do Bloco DESPESAS MIRELA
      if (
        !mirelaBlock &&
        (cellText.includes('DESPESAS MIRELA') ||
         cellText.includes('DESPESA MIRELA') ||
         cellText.includes('GASTOS MIRELA'))
      ) {
        mirelaBlock = { headerRow: r, col: c, owner: 'mirela' };
      }
    }
  }

  const isCoupleSheet =
    salaryGabriel !== null ||
    salaryMirela !== null ||
    gabrielBlock !== null ||
    mirelaBlock !== null;

  if (!isCoupleSheet) {
    return { isCoupleSheet: false, salaryGabriel: null, salaryMirela: null, items: [] };
  }

  const items = [];

  // 2. Define limites de coluna de cada tabela lado a lado para uma não invadir a outra
  const extractBlockItems = (block, otherBlock) => {
    if (!block) return;
    const minCol = block.col;
    let maxCol = minCol + 3;
    if (otherBlock && otherBlock.col > minCol) {
      maxCol = otherBlock.col - 1;
    }

    for (let r = block.headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];

      // Coleta as células dentro da faixa de colunas deste bloco
      const sliceCells = [];
      for (let c = minCol; c <= Math.min(maxCol, row.length - 1); c++) {
        sliceCells.push(row[c] ?? '');
      }

      // Se a linha estiver vazia neste bloco, ignora linhas vazias intermediárias e continua!
      if (sliceCells.every(cell => String(cell).trim() === '')) {
        continue;
      }

      const joinedNorm = sliceCells.map(normUpper).join(' ');

      // Para de ler este bloco ao encontrar "TOTAL DE GASTOS" (ou "TOTAL GABRIEL" / "TOTAL MIRELA" / "TOTAL")
      if (
        joinedNorm.includes('TOTAL DE GASTOS') ||
        joinedNorm.includes('TOTAL GASTOS') ||
        joinedNorm.startsWith('TOTAL') ||
        joinedNorm.includes(' SALDO ')
      ) {
        break;
      }

      // Ignora sub-cabeçalhos como "DESPESA | VALOR" ou "NOME | VALOR"
      if (/^(DESPESAS?|DESCRICAO|ITEM|NOME)\s+(VALOR|R\$|QUANTIA)$/.test(joinedNorm.trim())) {
        continue;
      }
      // Ignora se bater em outro bloco de salário/despesa
      if (joinedNorm.includes('SALARIO ') || joinedNorm.includes('DESPESAS ')) {
        continue;
      }

      // Procura Nome da Despesa (texto) e Valor (número) nas colunas do bloco
      let expenseName = '';
      let expenseVal = NaN;

      for (let i = 0; i < sliceCells.length; i++) {
        const rawCell = String(sliceCells[i] ?? '').trim();
        if (!rawCell) continue;

        const maybeNum = parseCurrencyCell(rawCell);
        if (!isNaN(maybeNum) && maybeNum > 0 && expenseName !== '') {
          expenseVal = maybeNum;
          break;
        } else if (isNaN(maybeNum) && !expenseName) {
          expenseName = rawCell;
        } else if (!isNaN(maybeNum) && maybeNum > 0 && !expenseName) {
          // Caso o valor esteja na mesma célula ou invertido
          expenseVal = maybeNum;
        }
      }

      // Caso a célula tenha "Apartamento R$ 1.200,00" tudo junto numa mesma coluna
      if (expenseName && isNaN(expenseVal)) {
        const inlineMatch = expenseName.match(/^([A-Za-zÀ-ÿ0-9\s\-\/\.]+?)\s+(?:R\$\s*)?(\d[\d\s\.,]*)$/i);
        if (inlineMatch) {
          const parsedInline = parseCurrencyCell(inlineMatch[2]);
          if (!isNaN(parsedInline) && parsedInline > 0) {
            expenseName = inlineMatch[1].trim();
            expenseVal = parsedInline;
          }
        }
      }

      if (expenseName && !isNaN(expenseVal) && expenseVal > 0) {
        const sector = mapCategoryNameOrMerchantToSector('', expenseName);
        const paymentMethod = inferPaymentFromExpenseName(expenseName);
        items.push({
          date: `${targetMonth}-05`,
          time: '12:00',
          merchant: expenseName,
          owner: block.owner, // 'gabriel' ou 'mirela'
          sector,
          paymentMethod,
          amount: Number(expenseVal.toFixed(2))
        });
      }
    }
  };

  extractBlockItems(gabrielBlock, mirelaBlock);
  extractBlockItems(mirelaBlock, gabrielBlock);

  return {
    isCoupleSheet: true,
    salaryGabriel,
    salaryMirela,
    items
  };
}

/**
 * Procura o valor numérico do salário na própria célula, nas células logo abaixo (até 3 linhas) ou ao lado direito
 */
function extractSalaryNearCell(matrix, r, c) {
  const currentCell = String(matrix[r]?.[c] ?? '');
  // 1. Verifica se o número está na mesma célula (ex: "SALÁRIO GABRIEL: R$ 3.872,00")
  const afterColon = currentCell.replace(/.*SAL[AÁ]RIO\s+(?:DO\s+|DA\s+)?(?:GABRIEL|MIRELA)\s*[:\-]?/i, '').trim();
  if (afterColon) {
    const sameCellVal = parseCurrencyCell(afterColon);
    if (!isNaN(sameCellVal) && sameCellVal > 0) return sameCellVal;
  }

  // 2. Procura diretamente abaixo (r+1, r+2, r+3) na mesma coluna c ou c+1 (caso células mescladas)
  for (let dr = 1; dr <= 3; dr++) {
    const rowBelow = matrix[r + dr];
    if (!rowBelow) continue;
    for (let dc = 0; dc <= 1; dc++) {
      const candidate = rowBelow[c + dc];
      const val = parseCurrencyCell(candidate);
      if (!isNaN(val) && val > 0) {
        return val;
      }
    }
  }

  // 3. Procura imediatamente à direita na mesma linha (c+1, c+2) caso o salário esteja ao lado do título
  for (let dc = 1; dc <= 2; dc++) {
    const candidate = matrix[r]?.[c + dc];
    if (candidate && !/SALARIO|DESPESA/i.test(normUpper(candidate))) {
      const val = parseCurrencyCell(candidate);
      if (!isNaN(val) && val > 0) {
        return val;
      }
    }
  }

  return null;
}

/* ==========================================================================
   Parser Universal: Suporta Layout Lado a Lado (Gabriel & Mirela) E Tabelas Comuns
   ========================================================================== */

function parseMatrixIntoStructuredData(matrix = [], fallbackMonth = '2026-10') {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return { isCoupleSheet: false, salaryGabriel: null, salaryMirela: null, items: [] };
  }

  // 1. Tenta primeiro o modelo Lado a Lado (Gabriel & Mirela)
  const coupleResult = parseGabrielMirelaMatrix(matrix, fallbackMonth);
  if (coupleResult.isCoupleSheet && (coupleResult.items.length > 0 || coupleResult.salaryGabriel !== null || coupleResult.salaryMirela !== null)) {
    return coupleResult;
  }

  // 2. Fallback: Tabela em lista padrão (Data | Descrição | Setor | Pagamento | Valor | Responsável)
  const firstRowJoined = (matrix[0] || []).map(normUpper).join(' ');
  const hasHeader = /DATA|DESCRI|ESTABELECIMENTO|VALOR|CATEGORIA|SETOR|PAGAMENTO|DESPESA|RESPONSAVEL/.test(firstRowJoined);
  const startRow = hasHeader ? 1 : 0;
  const items = [];

  for (let r = startRow; r < matrix.length; r++) {
    const cells = matrix[r] || [];
    if (cells.every(c => !String(c || '').trim())) continue;

    const joinedUpper = cells.map(normUpper).join(' ');
    if (joinedUpper.includes('TOTAL DE GASTOS') || joinedUpper.startsWith('TOTAL')) continue;

    let date = null;
    let merchant = '';
    let amount = NaN;
    let owner = 'casal';
    let sectorRaw = '';
    let paymentRaw = '';

    if (joinedUpper.includes('GABRIEL')) owner = 'gabriel';
    else if (joinedUpper.includes('MIRELA')) owner = 'mirela';

    for (let i = 0; i < cells.length; i++) {
      const c = String(cells[i] || '').trim();
      if (!c) continue;

      const brDate = c.match(/^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])(?:[\/\-](\d{2,4}))?$/);
      if (brDate && !date) {
        const d = brDate[1].padStart(2, '0');
        const m = brDate[2].padStart(2, '0');
        let y = brDate[3] || fallbackMonth.split('-')[0];
        if (y.length === 2) y = '20' + y;
        date = `${y}-${m}-${d}`;
        continue;
      }

      const num = parseCurrencyCell(c);
      if (!isNaN(num) && num > 0) {
        amount = num;
        continue;
      }

      if (!merchant && !/^(GABRIEL|MIRELA|PIX|CREDITO|DEBITO)$/i.test(normUpper(c))) {
        merchant = c;
      }
    }

    if (merchant && !isNaN(amount) && amount > 0) {
      items.push({
        date: date || `${fallbackMonth}-05`,
        time: '12:00',
        merchant,
        owner,
        sector: mapCategoryNameOrMerchantToSector(sectorRaw, merchant),
        paymentMethod: inferPaymentFromExpenseName(merchant, paymentRaw),
        amount: Number(amount.toFixed(2))
      });
    }
  }

  return {
    isCoupleSheet: false,
    salaryGabriel: null,
    salaryMirela: null,
    items
  };
}

function parseRawSpreadsheetText(rawText = '', fallbackMonth = '2026-10') {
  const matrix = textToMatrix(rawText);
  return parseMatrixIntoStructuredData(matrix, fallbackMonth);
}

/* ==========================================================================
   Aplicação Dinâmica dos Dados Lidos da Planilha no Mês Selecionado
   ========================================================================== */

function computeSheetRowSignature(item, monthStr) {
  const normMerchant = normUpper(item.merchant || '').replace(/[^A-Z0-9]/g, '');
  const ownerKey = (item.owner || 'casal').toLowerCase();
  return `sheets_${monthStr}_${ownerKey}_${normMerchant}`;
}

function applyParsedSheetDataToMonth(parsedResult, sourceLabel = 'Planilha') {
  if (!parsedResult) return { added: 0, updated: 0, skipped: 0 };

  const targetMonth = appState.currentMonth;
  let salariesUpdated = false;

  if (!appState.monthlySalaries) {
    appState.monthlySalaries = {};
  }
  if (!appState.monthlySalaries[targetMonth]) {
    appState.monthlySalaries[targetMonth] = { gabriel: 0, mirela: 0 };
  }

  // 1. Atualiza dinamicamente o Salário do Gabriel e da Mirela se encontrados na planilha
  if (parsedResult.salaryGabriel !== null && !isNaN(parsedResult.salaryGabriel)) {
    appState.monthlySalaries[targetMonth].gabriel = Number(parsedResult.salaryGabriel);
    salariesUpdated = true;
  }
  if (parsedResult.salaryMirela !== null && !isNaN(parsedResult.salaryMirela)) {
    appState.monthlySalaries[targetMonth].mirela = Number(parsedResult.salaryMirela);
    salariesUpdated = true;
  }

  const rows = parsedResult.items || [];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const txDate = row.date && row.date.startsWith(targetMonth) ? row.date : `${targetMonth}-05`;
    const signature = computeSheetRowSignature(row, targetMonth);

    // Verifica se essa despesa (mesmo responsável + mesmo nome no mês) já existe
    const existingIdx = appState.transactions.findIndex(tx => {
      if (!tx.date || !tx.date.startsWith(targetMonth)) return false;
      if (tx.imageSignature && tx.imageSignature === signature) return true;
      const sameOwner = (tx.owner || 'casal') === (row.owner || 'casal');
      const sameName = normUpper(tx.merchant) === normUpper(row.merchant);
      return sameOwner && sameName;
    });

    if (existingIdx !== -1) {
      const existingTx = appState.transactions[existingIdx];
      // Se o valor mudou na planilha daquele mês, atualiza dinamicamente!
      if (Math.abs((Number(existingTx.amount) || 0) - Number(row.amount)) >= 0.01) {
        appState.transactions[existingIdx].amount = Number(row.amount);
        appState.transactions[existingIdx].sector = row.sector;
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    const newTx = {
      id: 'tx_sh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      date: txDate,
      time: row.time || '12:00',
      merchant: row.merchant,
      owner: row.owner || 'casal', // 'gabriel' | 'mirela' | 'casal'
      sector: row.sector,
      paymentMethod: row.paymentMethod || 'PIX',
      amount: Number(row.amount),
      imageDataUrl: null,
      imageSignature: signature,
      isRecurring: false,
      importedFromSheets: true
    };

    appState.transactions.push(newTx);
    added++;
  }

  sheetsConfig.lastSyncTimestamp = Date.now();
  sheetsConfig.lastSyncStats = { added, updated, skipped, salariesUpdated, sourceLabel };
  saveSheetsConfig();
  saveState();
  renderAll();

  const parts = [];
  if (salariesUpdated) {
    const gSal = appState.monthlySalaries[targetMonth].gabriel || 0;
    const mSal = appState.monthlySalaries[targetMonth].mirela || 0;
    parts.push(`Salários atualizados (Gabriel: ${formatCurrency(gSal)} | Mirela: ${formatCurrency(mSal)})`);
  }
  if (added > 0) parts.push(`${added} despesas importadas`);
  if (updated > 0) parts.push(`${updated} valores atualizados`);
  if (skipped > 0 && added === 0 && updated === 0) parts.push(`${skipped} itens já estavam sincronizados`);

  showToast(`✅ ${parts.join(' • ') || 'Planilha processada com sucesso!'}`, 'success');
  return { added, updated, skipped, salariesUpdated };
}

/* ==========================================================================
   Upload de Arquivo .XLSX / .XLS / .CSV Direto da Máquina
   ========================================================================== */

window.handleSpreadsheetFileUpload = function(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();

  if ((ext === 'xlsx' || ext === 'xls') && typeof XLSX !== 'undefined') {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
        const parsed = parseMatrixIntoStructuredData(matrix, appState.currentMonth);
        applyParsedSheetDataToMonth(parsed, file.name);
        closeGoogleSheetsModal();
      } catch (err) {
        console.error('Erro ao ler arquivo Excel:', err);
        showToast('Erro ao ler o arquivo .xlsx. Verifique o formato.', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseRawSpreadsheetText(text, appState.currentMonth);
      applyParsedSheetDataToMonth(parsed, file.name);
      closeGoogleSheetsModal();
    };
    reader.readAsText(file, 'UTF-8');
  }

  event.target.value = '';
};

/* ==========================================================================
   Sincronização via URL (Link da Planilha Google Sheets ou Apps Script)
   ========================================================================== */

window.syncFromGoogleSheetsUrl = async function(customUrl = null, closeAfter = false) {
  const urlInput = document.getElementById('sheets-url-input');
  const rawUrl = (customUrl !== null ? customUrl : (urlInput ? urlInput.value : sheetsConfig.sheetUrl) || '').trim();

  if (!rawUrl && !sheetsConfig.webhookUrl) {
    openGoogleSheetsModal('import');
    showToast('Cole o link da sua Planilha do Google Sheets, envie o arquivo .xlsx/.csv ou cole as células!', 'warning');
    return;
  }

  const targetUrlToUse = rawUrl || sheetsConfig.webhookUrl;
  if (rawUrl) {
    sheetsConfig.sheetUrl = rawUrl;
    saveSheetsConfig();
  }

  const candidateUrls = buildGoogleSheetsFetchUrls(targetUrlToUse);
  const refreshBtnIcon = document.getElementById('sheets-quick-refresh-icon');
  if (refreshBtnIcon) refreshBtnIcon.classList.add('animate-spin');

  let lastError = null;
  for (const fetchUrl of candidateUrls) {
    try {
      const response = await fetch(fetchUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();

      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const json = JSON.parse(text);
        if (Array.isArray(json.matrix)) {
          const parsed = parseMatrixIntoStructuredData(json.matrix, appState.currentMonth);
          if (refreshBtnIcon) refreshBtnIcon.classList.remove('animate-spin');
          applyParsedSheetDataToMonth(parsed, 'Google Apps Script');
          if (closeAfter) closeGoogleSheetsModal();
          return;
        }
      }

      if (text.includes('<!DOCTYPE html>') && text.includes('accounts.google.com')) {
        throw new Error('Planilha privada. No Google Sheets, compartilhe como "Qualquer pessoa com o link pode visualizar".');
      }

      const parsed = parseRawSpreadsheetText(text, appState.currentMonth);
      if (refreshBtnIcon) refreshBtnIcon.classList.remove('animate-spin');
      applyParsedSheetDataToMonth(parsed, 'Link Google Sheets');
      if (closeAfter) closeGoogleSheetsModal();
      return;
    } catch (err) {
      lastError = err;
    }
  }

  if (refreshBtnIcon) refreshBtnIcon.classList.remove('animate-spin');
  showToast(
    `Não foi possível acessar o link diretamente (${lastError?.message || 'verifique o compartilhamento'}). Dica: use a aba "Colar Células (Ctrl+V)" ou envie o arquivo .xlsx/.csv!`,
    'warning'
  );
};

/* ==========================================================================
   Pré-visualização e Importação de Células Coladas (Modelo Gabriel & Mirela)
   ========================================================================== */

window.previewPastedSheetCells = function() {
  const textarea = document.getElementById('sheets-paste-textarea');
  const previewContainer = document.getElementById('sheets-paste-preview');
  const countBadge = document.getElementById('sheets-paste-count');
  if (!textarea || !previewContainer) return;

  const parsed = parseRawSpreadsheetText(textarea.value, appState.currentMonth);
  const rows = parsed.items || [];

  const salInfo = [];
  if (parsed.salaryGabriel !== null) salInfo.push(`Salário Gabriel: ${formatCurrency(parsed.salaryGabriel)}`);
  if (parsed.salaryMirela !== null) salInfo.push(`Salário Mirela: ${formatCurrency(parsed.salaryMirela)}`);

  if (countBadge) {
    countBadge.textContent = `${rows.length} despesas ${salInfo.length ? '• ' + salInfo.join(' | ') : ''}`;
  }

  if (rows.length === 0 && salInfo.length === 0) {
    previewContainer.innerHTML = `
      <div class="text-xs text-slate-400 text-center py-4">
        Cole acima sua tabela do Google Sheets/Excel (com SALÁRIO GABRIEL, SALÁRIO MIRELA, DESPESAS GABRIEL e DESPESAS MIRELA lado a lado) para visualizar a leitura dinâmica.
      </div>
    `;
    return;
  }

  previewContainer.innerHTML = `
    ${salInfo.length > 0 ? `
      <div class="mb-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex flex-wrap items-center justify-between gap-2">
        <span>💰 Salários Detectados no Topo:</span>
        <span>${salInfo.join('  •  ')} (Soma Casal: ${formatCurrency((parsed.salaryGabriel || 0) + (parsed.salaryMirela || 0))})</span>
      </div>
    ` : ''}
    <div class="overflow-x-auto max-h-48">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400">
            <th class="py-1.5 px-2">Responsável</th>
            <th class="py-1.5 px-2">Despesa</th>
            <th class="py-1.5 px-2">Setor Mapeado</th>
            <th class="py-1.5 px-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const sec = getSectorMeta(r.sector);
            const ownerBadge = r.owner === 'gabriel'
              ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-500">👦 Gabriel</span>'
              : r.owner === 'mirela'
                ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-500">👩 Mirela</span>'
                : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-500">💑 Casal</span>';
            return `
              <tr class="border-b border-slate-100 dark:border-slate-800/70">
                <td class="py-1.5 px-2 whitespace-nowrap">${ownerBadge}</td>
                <td class="py-1.5 px-2 font-semibold">${escapeHtml(r.merchant)}</td>
                <td class="py-1.5 px-2 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${sec.badgeClass}">
                    ${sec.emoji} ${sec.shortName}
                  </span>
                </td>
                <td class="py-1.5 px-2 text-right font-bold text-red-500">${formatCurrency(r.amount)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
};

window.importFromPastedSheetCells = function() {
  const textarea = document.getElementById('sheets-paste-textarea');
  if (!textarea || !textarea.value.trim()) {
    showToast('Cole as células copiadas da sua planilha primeiro.', 'warning');
    return;
  }
  const parsed = parseRawSpreadsheetText(textarea.value, appState.currentMonth);
  const res = applyParsedSheetDataToMonth(parsed, 'Células Coladas');
  if (res.added > 0 || res.updated > 0 || res.salariesUpdated) {
    textarea.value = '';
    previewPastedSheetCells();
    closeGoogleSheetsModal();
  }
};

/**
 * Preenche um modelo de demonstração no formato exato Lado a Lado (Gabriel & Mirela)
 * para testar o parser dinâmico (os valores podem ser editados livremente antes de clicar em Importar!)
 */
window.fillSampleGoogleSheetsPaste = function() {
  const textarea = document.getElementById('sheets-paste-textarea');
  if (!textarea) return;
  textarea.value = [
    `SALÁRIO GABRIEL\t\t\tSALÁRIO MIRELA\t`,
    `3872\t\t\tR$3 095,00\t`,
    `\t\t\t\t`,
    `DESPESAS GABRIEL\tVALOR\t\tDESPESAS MIRELA\tVALOR`,
    `Apartamento\tR$ 850,00\t\tApartamento\tR$ 850,00`,
    `Condomínio\tR$ 260,00\t\tCondomínio\tR$ 260,00`,
    `Bradesco\tR$ 420,00\t\tNubank\tR$ 615,00`,
    `Cartão Gabriel\tR$ 580,00\t\tTim\tR$ 65,00`,
    `Conta de luz\tR$ 195,00\t\tRufino\tR$ 180,00`,
    `Internet\tR$ 120,00\t\t\t`,
    `TOTAL DE GASTOS\tR$ 2.425,00\t\tTOTAL DE GASTOS\tR$ 1.970,00`
  ].join('\n');
  previewPastedSheetCells();
};

/* ==========================================================================
   Envio Automático do Site para o Google Planilhas (Site -> Planilha POST)
   ========================================================================== */

async function pushTransactionToGoogleSheets(tx) {
  if (!sheetsConfig.webhookUrl || !sheetsConfig.autoPush || !tx) return false;

  const sec = getSectorMeta(tx.sector);
  const txMonth = (tx.date || appState.currentMonth).slice(0, 7);
  const ownerMap = { gabriel: 'Gabriel', mirela: 'Mirela', casal: 'Casal' };

  const payload = {
    action: 'appendTransaction',
    month: txMonth,
    monthLabel: formatMonthLabel(txMonth),
    splitBySector: true,
    transaction: {
      id: tx.id,
      date: tx.date,
      dateBR: formatDateBR(tx.date),
      time: tx.time || '12:00',
      owner: tx.owner || 'casal',
      ownerLabel: ownerMap[tx.owner] || 'Casal',
      merchant: tx.merchant,
      sector: tx.sector,
      sectorName: `${sec.emoji} ${sec.name}`,
      paymentMethod: tx.paymentMethod || 'PIX',
      amount: Number(tx.amount) || 0
    }
  };

  try {
    await fetch(sheetsConfig.webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    sheetsConfig.lastSyncTimestamp = Date.now();
    saveSheetsConfig();
    showToast('📤 Gasto enviado automaticamente para sua Planilha do Google!', 'info');
    return true;
  } catch (err) {
    console.warn('Erro ao enviar POST para Webhook do Google Sheets:', err);
    return false;
  }
}

window.pushCurrentMonthToGoogleSheets = async function() {
  const webhookInput = document.getElementById('sheets-webhook-input');
  if (webhookInput && webhookInput.value.trim()) {
    sheetsConfig.webhookUrl = webhookInput.value.trim();
    saveSheetsConfig();
  }

  if (!sheetsConfig.webhookUrl) {
    showToast('Configure a URL do Webhook (Google Apps Script) antes de enviar.', 'warning');
    return;
  }

  const txs = getMonthTransactions(appState.currentMonth);
  if (txs.length === 0) {
    showToast('Não há lançamentos neste mês para enviar à planilha.', 'warning');
    return;
  }

  const ownerMap = { gabriel: 'Gabriel', mirela: 'Mirela', casal: 'Casal' };
  const payload = {
    action: 'appendBatch',
    month: appState.currentMonth,
    monthLabel: formatMonthLabel(appState.currentMonth),
    splitBySector: true,
    transactions: txs.map(tx => {
      const sec = getSectorMeta(tx.sector);
      return {
        id: tx.id,
        date: tx.date,
        dateBR: formatDateBR(tx.date),
        time: tx.time || '12:00',
        owner: tx.owner || 'casal',
        ownerLabel: ownerMap[tx.owner] || 'Casal',
        merchant: tx.merchant,
        sector: tx.sector,
        sectorName: `${sec.emoji} ${sec.name}`,
        paymentMethod: tx.paymentMethod || 'PIX',
        amount: Number(tx.amount) || 0
      };
    })
  };

  try {
    await fetch(sheetsConfig.webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    sheetsConfig.lastSyncTimestamp = Date.now();
    saveSheetsConfig();
    showToast(`📤 Todos os ${txs.length} lançamentos de ${formatMonthLabel(appState.currentMonth)} foram enviados para a Planilha Google!`, 'success');
  } catch (err) {
    showToast('Falha ao conectar com a URL do Webhook. Verifique o endereço.', 'danger');
  }
};

/* ==========================================================================
   Controles do Modal Google Sheets & Exibição do Código Google Apps Script
   ========================================================================== */

window.openGoogleSheetsModal = function(defaultTab = 'import') {
  const modal = document.getElementById('google-sheets-modal');
  if (!modal) return;

  const urlInput = document.getElementById('sheets-url-input');
  const webhookInput = document.getElementById('sheets-webhook-input');
  const autoPushCheckbox = document.getElementById('sheets-autopush-checkbox');
  const scriptCodeBox = document.getElementById('apps-script-code-content');

  if (urlInput) urlInput.value = sheetsConfig.sheetUrl || '';
  if (webhookInput) webhookInput.value = sheetsConfig.webhookUrl || '';
  if (autoPushCheckbox) autoPushCheckbox.checked = sheetsConfig.autoPush !== false;
  if (scriptCodeBox) scriptCodeBox.textContent = GOOGLE_APPS_SCRIPT_TEMPLATE;

  switchSheetsModalTab(defaultTab);
  modal.classList.remove('hidden');
};

window.closeGoogleSheetsModal = function() {
  const modal = document.getElementById('google-sheets-modal');
  if (modal) modal.classList.add('hidden');
};

window.switchSheetsModalTab = function(tabName) {
  const tabs = ['import', 'paste', 'webhook'];
  tabs.forEach(t => {
    const panel = document.getElementById(`sheets-tab-panel-${t}`);
    const btn = document.getElementById(`sheets-tab-btn-${t}`);
    if (panel) {
      panel.classList.toggle('hidden', t !== tabName);
    }
    if (btn) {
      btn.className = t === tabName
        ? 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm transition flex items-center justify-center gap-1.5'
        : 'flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5';
    }
  });
};

window.saveWebhookSettings = function(e) {
  if (e) e.preventDefault();
  const urlInput = document.getElementById('sheets-url-input');
  const webhookInput = document.getElementById('sheets-webhook-input');
  const autoPushCheckbox = document.getElementById('sheets-autopush-checkbox');

  if (urlInput) sheetsConfig.sheetUrl = urlInput.value.trim();
  if (webhookInput) sheetsConfig.webhookUrl = webhookInput.value.trim();
  if (autoPushCheckbox) sheetsConfig.autoPush = autoPushCheckbox.checked;

  saveSheetsConfig();
  showToast('Configurações de sincronização com Google Sheets salvas!', 'success');
};

window.toggleAppsScriptCodeDrawer = function() {
  const drawer = document.getElementById('apps-script-code-drawer');
  if (drawer) drawer.classList.toggle('hidden');
};

window.copyAppsScriptCode = function() {
  navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE).then(() => {
    showToast('📋 Código do Google Apps Script copiado! Cole em Extensões > Apps Script na sua planilha.', 'success');
  });
};

window.quickRefreshFromGoogleSheets = function() {
  if (sheetsConfig.sheetUrl || sheetsConfig.webhookUrl) {
    syncFromGoogleSheetsUrl(sheetsConfig.sheetUrl || sheetsConfig.webhookUrl, false);
  } else {
    openGoogleSheetsModal('import');
    showToast('Conecte o link da planilha, envie o arquivo .xlsx/.csv ou cole as células para carregar os dados do mês!', 'info');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadSheetsConfig();
  updateSheetsSyncStatusUI();
  setInterval(updateSheetsSyncStatusUI, 30000);
});

window.SheetsSyncService = {
  pushTransactionToGoogleSheets,
  syncFromGoogleSheetsUrl,
  parseRawSpreadsheetText,
  parseGabrielMirelaMatrix,
  applyParsedSheetDataToMonth,
  updateSheetsSyncStatusUI
};
