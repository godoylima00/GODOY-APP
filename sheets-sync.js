/* ==========================================================================
   GodoyFin - Integração e Sincronização Bidirecional com Google Planilhas
   1. Importação Direta (Link Público/CSV, Google Apps Script ou Ctrl+V de Células)
   2. Mapeamento Inteligente de Colunas -> Tabelas de Setores + Anti-Duplicatas
   3. Envio Automático (Site -> Planilha via Webhook POST JSON)
   4. Indicador de Status ("Última sincronização: há X minutos") + Botão Atualizar
   ========================================================================== */

const SHEETS_CONFIG_KEY = 'godoyfin_sheets_config_v1';

let sheetsConfig = {
  sheetUrl: '',
  webhookUrl: '',
  autoPush: true,
  lastSyncTimestamp: null,
  lastSyncStats: null
};

// Código pronto do Google Apps Script para o usuário colar em Extensões > Apps Script
const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GodoyFin - Script de Integração Bidirecional com Google Planilhas
 * Como usar:
 * 1. Na sua Planilha do Google, clique em Extensões > Apps Script
 * 2. Apague tudo, cole este código e clique em Salvar (ícone de disquete)
 * 3. Clique em "Implantar" > "Nova implantação"
 * 4. Em Tipo, selecione "App da Web"
 * 5. Em "Quem pode acessar", selecione "Qualquer pessoa" e clique em Implantar
 * 6. Copie a URL gerada e cole no campo Webhook do GodoyFin!
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Suporta envio único ou lote de transações
    var items = payload.transactions ? payload.transactions : [payload.transaction];
    var monthLabel = payload.monthLabel || 'Lancamentos';

    // 1. Aba Geral do Mês (ex: "Outubro 2026")
    var monthSheet = getOrCreateSheet(ss, monthLabel);

    items.forEach(function(tx) {
      if (!tx) return;
      appendTxRow(monthSheet, tx);

      // 2. Aba específica do Setor (opcional, se payload.splitBySector for true)
      if (payload.splitBySector && tx.sectorName) {
        var secSheet = getOrCreateSheet(ss, tx.sectorName);
        appendTxRow(secSheet, tx);
      }
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
  var rows = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0] && !r[1] && !r[4]) continue;
    result.push({
      date: formatSheetDate(r[0]),
      time: String(r[1] || '12:00'),
      merchant: String(r[2] || ''),
      sector: String(r[3] || ''),
      paymentMethod: String(r[4] || 'PIX'),
      amount: r[5],
      id: String(r[6] || '')
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', rows: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  var cleanName = String(name).slice(0, 30);
  var sheet = ss.getSheetByName(cleanName);
  if (!sheet) {
    sheet = ss.insertSheet(cleanName);
    var headers = ['Data', 'Hora', 'Estabelecimento / Descrição', 'Categoria / Setor', 'Forma de Pagamento', 'Valor (R$)', 'ID GodoyFin'];
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
    tx.time || '12:00',
    tx.merchant || '',
    tx.sectorName || tx.sector || '',
    tx.paymentMethod || 'PIX',
    Number(tx.amount) || 0,
    tx.id || ''
  ]);
}

function formatSheetDate(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
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

  // Caso seja URL de Google Apps Script Web App (/macros/s/.../exec)
  if (trimmed.includes('script.google.com/macros/')) {
    return [trimmed];
  }

  // Extrai o ID da planilha padrão: /spreadsheets/d/{ID}/...
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

  // Caso seja link publicado na web (/spreadsheets/d/e/2PACX-.../pubhtml)
  if (trimmed.includes('/spreadsheets/d/e/') && trimmed.includes('/pub')) {
    const csvPub = trimmed.replace(/\/pubhtml.*$/, '/pub?output=csv').replace(/\/pub\?(?!.*output=csv)/, '/pub?output=csv&');
    return [csvPub, trimmed];
  }

  return [trimmed];
}

/* ==========================================================================
   Mapeamento Inteligente de Colunas (CSV / TSV / Células Coladas -> Setores)
   ========================================================================== */

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
  const sample = lines.slice(0, 5).join('\n');
  const tabCount = (sample.match(/\t/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;

  if (tabCount > 0 && tabCount >= semiCount) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

function normalizeDateCell(rawDate = '', fallbackMonth = '2026-10') {
  const s = String(rawDate).trim();
  if (!s) return null;

  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // DD/MM/YYYY ou DD/MM/YY ou DD-MM-YYYY
  const brMatch = s.match(/^(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])(?:[\/\-](\d{2,4}))?/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3] || fallbackMonth.split('-')[0] || '2026';
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseCurrencyCell(rawVal = '') {
  if (typeof rawVal === 'number') return Math.abs(rawVal);
  const str = String(rawVal).trim();
  if (!str) return NaN;

  // Ignora datas que pareçam números (ex: 20/10/2026 ou 12:30)
  if (/\d{1,2}\/\d{1,2}/.test(str) || /^\d{1,2}:\d{2}/.test(str)) return NaN;

  // Remove R$, espaços e sinal negativo
  let cleaned = str.replace(/[R$\s]/gi, '');
  if (!cleaned) return NaN;

  // Formato brasileiro 1.234,56 vs internacional 1,234.56 ou 45.90
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : Math.abs(num);
}

function mapCategoryNameOrMerchantToSector(categoryCell = '', merchantCell = '') {
  const normCat = String(categoryCell)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normCat) {
    if (/delivery|alimenta|restaurante|ifood|lanche|comida/.test(normCat)) return 'delivery';
    if (/transporte|mobilidade|uber|99|combustivel|gasolina|pedagio|carro/.test(normCat)) return 'transporte';
    if (/mercado|supermercado|casa|moradia|aluguel|condominio|luz|agua|internet/.test(normCat)) return 'mercado';
    if (/compra|lazer|streaming|assinatura|shopping|eletronico|jogo|cinema/.test(normCat)) return 'compras';
    if (/saude|farmacia|remedio|medico|consulta|academia|cuidado/.test(normCat)) return 'saude';
  }

  if (window.OCRService) {
    return window.OCRService.classifyMerchantSector(merchantCell, categoryCell);
  }
  return 'compras';
}

function normalizePaymentCell(rawPay = '', fullLine = '') {
  const combined = `${rawPay} ${fullLine}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/pix/.test(combined)) return 'PIX';
  if (/vale|refeicao|alelo|sodexo|pluxee|vr|flash|caju/.test(combined)) return 'Vale-Refeição';
  if (/debito/.test(combined)) return 'Cartão de Débito';
  if (/credito|mastercard|visa|nubank|fatura|cartao/.test(combined)) return 'Cartão de Crédito';
  if (/dinheiro|especie/.test(combined)) return 'Dinheiro';
  return 'PIX';
}

/**
 * Lê texto bruto (CSV ou células coladas com Ctrl+V do Google Sheets/Excel) e retorna lista estruturada
 */
function parseRawSpreadsheetText(rawText = '', fallbackMonth = '2026-10') {
  const lines = String(rawText)
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines);
  const matrix = lines.map(l => splitDelimitedLine(l, delimiter));

  // Verifica se a primeira linha é cabeçalho
  const firstRowJoined = matrix[0].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hasHeader = /data|descri|estabelecimento|valor|categoria|setor|pagamento|historico|loja/.test(firstRowJoined);

  let colMap = {
    date: -1,
    time: -1,
    merchant: -1,
    sector: -1,
    payment: -1,
    amount: -1
  };

  if (hasHeader) {
    matrix[0].forEach((headerCell, idx) => {
      const h = headerCell.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (colMap.date === -1 && /\bdata\b|date|dia/.test(h)) colMap.date = idx;
      else if (colMap.time === -1 && /\bhora\b|horario|time/.test(h)) colMap.time = idx;
      else if (colMap.merchant === -1 && /estabelecimento|descri|local|loja|nome|item|historico|favorecido/.test(h)) colMap.merchant = idx;
      else if (colMap.sector === -1 && /categoria|setor|tipo|grupo/.test(h)) colMap.sector = idx;
      else if (colMap.payment === -1 && /pagamento|forma|metodo|cartao|meio/.test(h)) colMap.payment = idx;
      else if (colMap.amount === -1 && /valor|preco|total|quantia|r\$|amount/.test(h)) colMap.amount = idx;
    });
  }

  const startRow = hasHeader ? 1 : 0;
  const parsedItems = [];

  for (let r = startRow; r < matrix.length; r++) {
    const cells = matrix[r];
    if (!cells || cells.every(c => !c)) continue;

    let date = colMap.date !== -1 ? normalizeDateCell(cells[colMap.date], fallbackMonth) : null;
    let time = colMap.time !== -1 ? cells[colMap.time] : '';
    let merchant = colMap.merchant !== -1 ? cells[colMap.merchant] : '';
    let sectorRaw = colMap.sector !== -1 ? cells[colMap.sector] : '';
    let paymentRaw = colMap.payment !== -1 ? cells[colMap.payment] : '';
    let amount = colMap.amount !== -1 ? parseCurrencyCell(cells[colMap.amount]) : NaN;

    // Heurística automática coluna a coluna caso a planilha não tenha cabeçalho padrão
    const usedIndices = new Set();
    if (date && colMap.date !== -1) usedIndices.add(colMap.date);
    if (!isNaN(amount) && colMap.amount !== -1) usedIndices.add(colMap.amount);

    if (!date) {
      for (let i = 0; i < cells.length; i++) {
        if (usedIndices.has(i)) continue;
        const maybeDate = normalizeDateCell(cells[i], fallbackMonth);
        if (maybeDate) {
          date = maybeDate;
          usedIndices.add(i);
          break;
        }
      }
    }

    if (isNaN(amount)) {
      // Procura da direita para a esquerda o valor monetário
      for (let i = cells.length - 1; i >= 0; i--) {
        if (usedIndices.has(i)) continue;
        const maybeAmount = parseCurrencyCell(cells[i]);
        if (!isNaN(maybeAmount) && maybeAmount > 0) {
          amount = maybeAmount;
          usedIndices.add(i);
          break;
        }
      }
    }

    if (!merchant) {
      for (let i = 0; i < cells.length; i++) {
        if (usedIndices.has(i)) continue;
        const c = cells[i];
        if (!c) continue;
        if (/^\d{1,2}:\d{2}/.test(c)) {
          if (!time) time = c.slice(0, 5);
          usedIndices.add(i);
          continue;
        }
        if (/^(pix|cartao|credito|debito|vale|dinheiro)/i.test(c.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
          if (!paymentRaw) paymentRaw = c;
          usedIndices.add(i);
          continue;
        }
        merchant = c;
        usedIndices.add(i);
        break;
      }
    }

    if (isNaN(amount) || amount <= 0) continue;

    if (!date) {
      date = `${fallbackMonth}-${String(new Date().getDate()).padStart(2, '0')}`;
    }

    const timeMatch = String(time).match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    const cleanTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '12:00';
    const cleanMerchant = (merchant || 'Gasto Importado do Google Sheets').trim();
    const mappedSector = mapCategoryNameOrMerchantToSector(sectorRaw, cleanMerchant);
    const mappedPayment = normalizePaymentCell(paymentRaw, cells.join(' '));

    parsedItems.push({
      date,
      time: cleanTime,
      merchant: cleanMerchant,
      sector: mappedSector,
      paymentMethod: mappedPayment,
      amount: Number(amount.toFixed(2))
    });
  }

  return parsedItems;
}

/* ==========================================================================
   Importação com Prevenção de Duplicatas -> Tabelas Setoriais
   ========================================================================== */

function computeSheetRowSignature(item) {
  const normMerchant = (item.merchant || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return `sheets_${item.date}_${Number(item.amount).toFixed(2)}_${normMerchant}`;
}

function importParsedRowsIntoApp(parsedRows = [], sourceLabel = 'Google Sheets') {
  if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
    showToast('Nenhuma linha válida de gasto foi encontrada para importar.', 'warning');
    return { added: 0, skipped: 0 };
  }

  let added = 0;
  let skipped = 0;
  let targetMonth = null;

  for (const row of parsedRows) {
    const signature = computeSheetRowSignature(row);

    // Prevenção de Duplicatas: ignora se já foi importado antes ou se já existe igual no mês
    const existingDup = checkDuplicateTransaction({
      amount: row.amount,
      date: row.date,
      merchant: row.merchant,
      imageSignature: signature
    });

    if (existingDup) {
      skipped++;
      continue;
    }

    const newTx = {
      id: 'tx_sh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      date: row.date,
      time: row.time || '12:00',
      merchant: row.merchant,
      sector: row.sector,
      paymentMethod: row.paymentMethod || 'PIX',
      amount: Number(row.amount),
      imageDataUrl: null,
      imageSignature: signature,
      isRecurring: false,
      importedFromSheets: true
    };

    appState.transactions.unshift(newTx);
    if (!targetMonth && row.date && row.date.length >= 7) {
      targetMonth = row.date.slice(0, 7);
    }
    added++;
  }

  sheetsConfig.lastSyncTimestamp = Date.now();
  sheetsConfig.lastSyncStats = { added, skipped, sourceLabel };
  saveSheetsConfig();

  if (added > 0 && targetMonth && targetMonth !== appState.currentMonth) {
    appState.currentMonth = targetMonth;
  }

  saveState();
  renderAll();

  if (added > 0) {
    showToast(
      `✅ ${added} ${added === 1 ? 'novo gasto importado' : 'novos gastos importados'} para as Tabelas de Setor${skipped > 0 ? ` (${skipped} duplicados ignorados)` : ''}!`,
      'success'
    );
  } else {
    showToast(
      `🔄 Planilha verificada: todos os ${skipped} lançamentos já estavam sincronizados (0 duplicatas geradas).`,
      'info'
    );
  }

  return { added, skipped };
}

/* ==========================================================================
   Sincronização via URL (Link da Planilha Google Sheets ou Apps Script)
   ========================================================================== */

window.syncFromGoogleSheetsUrl = async function(customUrl = null, closeAfter = false) {
  const urlInput = document.getElementById('sheets-url-input');
  const rawUrl = (customUrl !== null ? customUrl : (urlInput ? urlInput.value : sheetsConfig.sheetUrl) || '').trim();

  if (!rawUrl && !sheetsConfig.webhookUrl) {
    openGoogleSheetsModal();
    showToast('Cole o link da sua Planilha do Google Sheets ou configure o Webhook primeiro.', 'warning');
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
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();

      // Verifica se o retorno é JSON (ex: doGet do Google Apps Script)
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const json = JSON.parse(text);
        const rowsArray = Array.isArray(json) ? json : (json.rows || []);
        const mapped = rowsArray
          .map(r => ({
            date: normalizeDateCell(r.date, appState.currentMonth) || `${appState.currentMonth}-15`,
            time: r.time || '12:00',
            merchant: r.merchant || 'Gasto Planilha',
            sector: mapCategoryNameOrMerchantToSector(r.sector, r.merchant),
            paymentMethod: normalizePaymentCell(r.paymentMethod, ''),
            amount: parseCurrencyCell(r.amount)
          }))
          .filter(r => !isNaN(r.amount) && r.amount > 0);

        if (refreshBtnIcon) refreshBtnIcon.classList.remove('animate-spin');
        importParsedRowsIntoApp(mapped, 'Apps Script');
        if (closeAfter) closeGoogleSheetsModal();
        return;
      }

      // Se retornou página de login HTML do Google, avisa que a planilha precisa estar com acesso "Qualquer pessoa com o link"
      if (text.includes('<!DOCTYPE html>') && text.includes('accounts.google.com')) {
        throw new Error('Planilha privada. No Google Sheets, clique em Compartilhar > "Qualquer pessoa com o link pode ler".');
      }

      const parsedRows = parseRawSpreadsheetText(text, appState.currentMonth);
      if (refreshBtnIcon) refreshBtnIcon.classList.remove('animate-spin');
      importParsedRowsIntoApp(parsedRows, 'Link Google Sheets');
      if (closeAfter) closeGoogleSheetsModal();
      return;
    } catch (err) {
      lastError = err;
    }
  }

  if (refreshBtnIcon) refreshBtnIcon.classList.remove('animate-spin');
  showToast(
    `Não foi possível ler o link diretamente (${lastError?.message || 'verifique se a planilha está pública como "Qualquer pessoa com o link"'}). Você também pode colar as células na aba ao lado!`,
    'warning'
  );
};

/* ==========================================================================
   Importação de Células Coladas (Ctrl+V do Google Sheets / Excel)
   ========================================================================== */

window.previewPastedSheetCells = function() {
  const textarea = document.getElementById('sheets-paste-textarea');
  const previewContainer = document.getElementById('sheets-paste-preview');
  const countBadge = document.getElementById('sheets-paste-count');
  if (!textarea || !previewContainer) return;

  const rows = parseRawSpreadsheetText(textarea.value, appState.currentMonth);
  if (countBadge) {
    countBadge.textContent = `${rows.length} ${rows.length === 1 ? 'linha identificada' : 'linhas identificadas'}`;
  }

  if (rows.length === 0) {
    previewContainer.innerHTML = `
      <div class="text-xs text-slate-400 text-center py-4">
        Cole as células da sua planilha acima para visualizar o mapeamento automático por setor.
      </div>
    `;
    return;
  }

  previewContainer.innerHTML = `
    <div class="overflow-x-auto max-h-48">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400">
            <th class="py-1.5 px-2">Data</th>
            <th class="py-1.5 px-2">Estabelecimento</th>
            <th class="py-1.5 px-2">Setor Mapeado</th>
            <th class="py-1.5 px-2">Pagamento</th>
            <th class="py-1.5 px-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 12).map(r => {
            const sec = getSectorMeta(r.sector);
            return `
              <tr class="border-b border-slate-100 dark:border-slate-800/70">
                <td class="py-1.5 px-2 whitespace-nowrap">${formatDateBR(r.date)}</td>
                <td class="py-1.5 px-2 font-semibold">${escapeHtml(r.merchant)}</td>
                <td class="py-1.5 px-2 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${sec.badgeClass}">
                    ${sec.emoji} ${sec.shortName}
                  </span>
                </td>
                <td class="py-1.5 px-2">${escapeHtml(r.paymentMethod)}</td>
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
    showToast('Cole as células copiadas do Google Sheets ou Excel primeiro.', 'warning');
    return;
  }
  const rows = parseRawSpreadsheetText(textarea.value, appState.currentMonth);
  const res = importParsedRowsIntoApp(rows, 'Células Coladas');
  if (res.added > 0) {
    textarea.value = '';
    previewPastedSheetCells();
    closeGoogleSheetsModal();
  }
};

window.fillSampleGoogleSheetsPaste = function() {
  const textarea = document.getElementById('sheets-paste-textarea');
  if (!textarea) return;
  const m = appState.currentMonth.split('-')[1] || '10';
  const y = appState.currentMonth.split('-')[0] || '2026';
  textarea.value = [
    `Data\tEstabelecimento\tCategoria\tForma de Pagamento\tValor`,
    `21/${m}/${y}\tiFood - Poke Havaiano\tDelivery\tPIX\tR$ 58,90`,
    `20/${m}/${y}\tUber - Viagem Aeroporto\tTransporte\tCartão de Crédito\tR$ 47,20`,
    `19/${m}/${y}\tPão de Açúcar Supermercado\tMercado\tVale-Refeição\tR$ 264,50`,
    `18/${m}/${y}\tAmazon.com.br - Livro Clean Code\tCompras\tCartão de Crédito\tR$ 89,90`,
    `17/${m}/${y}\tDrogasil - Analgésico e Protetor\tSaúde\tCartão de Débito\tR$ 62,30`
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
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
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
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
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
    showToast('Configure o link da sua Planilha Google ou cole as células para sincronizar!', 'info');
  }
};

// Inicializa status e timer de atualização do texto "há X minutos"
document.addEventListener('DOMContentLoaded', () => {
  loadSheetsConfig();
  updateSheetsSyncStatusUI();
  setInterval(updateSheetsSyncStatusUI, 30000);
});

window.SheetsSyncService = {
  pushTransactionToGoogleSheets,
  syncFromGoogleSheetsUrl,
  parseRawSpreadsheetText,
  updateSheetsSyncStatusUI
};
