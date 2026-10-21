/* ==========================================================================
   GodoyFin - Aplicação Principal de Controle Financeiro Pessoal
   ========================================================================== */

const STORAGE_KEY = 'godoyfin_state_v1';

const SECTORS = [
  {
    id: 'delivery',
    name: 'Delivery & Alimentação',
    shortName: 'Delivery',
    subtitle: 'iFood, Rappi, Restaurantes, Padarias',
    emoji: '🍔',
    color: '#ef4444',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    defaultLimit: 600
  },
  {
    id: 'transporte',
    name: 'Transporte & Mobilidade',
    shortName: 'Transporte',
    subtitle: 'Uber, 99, Combustível, Pedágio',
    emoji: '🚗',
    color: '#475569',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
    defaultLimit: 450
  },
  {
    id: 'mercado',
    name: 'Mercado & Casa',
    shortName: 'Mercado & Casa',
    subtitle: 'Supermercado, Contas de Consumo, Manutenção',
    emoji: '🛒',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    defaultLimit: 1500
  },
  {
    id: 'compras',
    name: 'Compras & Lazer',
    shortName: 'Compras & Lazer',
    subtitle: 'Amazon, Mercado Livre, Streaming, Cinema',
    emoji: '🛍️',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    defaultLimit: 700
  },
  {
    id: 'saude',
    name: 'Saúde & Cuidados',
    shortName: 'Saúde',
    subtitle: 'Farmácia, Consultas, Academia, Bem-estar',
    emoji: '💊',
    color: '#06b6d4',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
    defaultLimit: 400
  }
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Estado global da aplicação
let appState = {
  currentMonth: '2026-10', // Outubro 2026
  activeSection: 'dashboard', // 'dashboard' | 'setores' | 'recorrentes' | 'relatorios'
  activeSectorFilter: 'all', // 'all' ou id do setor nas abas
  barChartMode: 'daily', // 'daily' | 'compare'
  darkMode: true,
  monthlyIncomes: {
    '2026-09': 7500.00,
    '2026-10': 7850.00
  },
  sectorLimits: {
    delivery: 600.00,
    transporte: 450.00,
    mercado: 1500.00,
    compras: 700.00,
    saude: 400.00
  },
  subscriptions: [],
  transactions: [],
  tableFilters: {
    delivery: { search: '', sort: 'recent', payment: 'all', collapsed: false },
    transporte: { search: '', sort: 'recent', payment: 'all', collapsed: false },
    mercado: { search: '', sort: 'recent', payment: 'all', collapsed: false },
    compras: { search: '', sort: 'recent', payment: 'all', collapsed: false },
    saude: { search: '', sort: 'recent', payment: 'all', collapsed: false }
  }
};

// Instâncias do Chart.js
let donutChartInstance = null;
let barChartInstance = null;

// Dados temporários do print sendo processado no modal
let pendingReceiptData = {
  editingId: null,
  imageDataUrl: null,
  imageSignature: null,
  rawText: ''
};

/* ==========================================================================
   Inicialização e Dados Iniciais Realistas
   ========================================================================== */

function getInitialDemoData() {
  const sampleImgIfood = window.OCRService
    ? window.OCRService.generateSampleReceiptDataUrl('ifood', '2026-10')
    : null;
  const sampleImgUber = window.OCRService
    ? window.OCRService.generateSampleReceiptDataUrl('uber', '2026-10')
    : null;

  return {
    subscriptions: [
      { id: 'sub_1', merchant: 'Aluguel + Condomínio', amount: 1650.00, day: 5, sector: 'mercado', paymentMethod: 'PIX', active: true },
      { id: 'sub_2', merchant: 'Vivo Fibra 600MB', amount: 119.90, day: 10, sector: 'mercado', paymentMethod: 'Cartão de Débito', active: true },
      { id: 'sub_3', merchant: 'Netflix Premium 4K', amount: 59.90, day: 12, sector: 'compras', paymentMethod: 'Cartão de Crédito', active: true },
      { id: 'sub_4', merchant: 'Spotify Duo', amount: 27.90, day: 15, sector: 'compras', paymentMethod: 'Cartão de Crédito', active: true },
      { id: 'sub_5', merchant: 'Smart Fit Black', amount: 139.90, day: 8, sector: 'saude', paymentMethod: 'Cartão de Crédito', active: true }
    ],
    transactions: [
      // Outubro 2026
      {
        id: 'tx_101',
        date: '2026-10-20',
        time: '21:15',
        merchant: 'iFood - Burger House Gourmet',
        sector: 'delivery',
        paymentMethod: 'PIX',
        amount: 64.90,
        imageDataUrl: sampleImgIfood,
        imageSignature: sampleImgIfood ? window.OCRService.computeImageSignature(sampleImgIfood) : 'sig_demo_1',
        isRecurring: false
      },
      {
        id: 'tx_102',
        date: '2026-10-19',
        time: '08:40',
        merchant: 'Uber - Corrida Centro',
        sector: 'transporte',
        paymentMethod: 'Cartão de Crédito',
        amount: 28.90,
        imageDataUrl: sampleImgUber,
        imageSignature: sampleImgUber ? window.OCRService.computeImageSignature(sampleImgUber) : 'sig_demo_2',
        isRecurring: false
      },
      {
        id: 'tx_103',
        date: '2026-10-18',
        time: '19:50',
        merchant: 'iFood - Sushi Leblon Express',
        sector: 'delivery',
        paymentMethod: 'Cartão de Crédito',
        amount: 118.50,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_104',
        date: '2026-10-16',
        time: '17:20',
        merchant: 'Carrefour Hipermercado',
        sector: 'mercado',
        paymentMethod: 'Vale-Refeição',
        amount: 428.75,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_105',
        date: '2026-10-15',
        time: '13:10',
        merchant: 'Mercado Livre - Fone Bluetooth',
        sector: 'compras',
        paymentMethod: 'Cartão de Crédito',
        amount: 189.90,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_106',
        date: '2026-10-14',
        time: '18:05',
        merchant: 'Posto Shell Box - Gasolina',
        sector: 'transporte',
        paymentMethod: 'PIX',
        amount: 210.00,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_107',
        date: '2026-10-12',
        time: '20:30',
        merchant: 'Rappi - Pizzaria Napolitana',
        sector: 'delivery',
        paymentMethod: 'Cartão de Crédito',
        amount: 94.00,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_108',
        date: '2026-10-11',
        time: '11:25',
        merchant: 'Droga Raia - Vitaminas & Dermocosméticos',
        sector: 'saude',
        paymentMethod: 'Cartão de Débito',
        amount: 128.40,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_109',
        date: '2026-10-09',
        time: '22:15',
        merchant: '99 Pop - Volta do Jantar',
        sector: 'transporte',
        paymentMethod: 'PIX',
        amount: 34.60,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_110',
        date: '2026-10-07',
        time: '15:00',
        merchant: 'Enel Energia Elétrica',
        sector: 'mercado',
        paymentMethod: 'PIX',
        amount: 184.20,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      // Setembro 2026 (Para comparativo com mês anterior)
      {
        id: 'tx_091',
        date: '2026-09-25',
        time: '20:00',
        merchant: 'iFood - Outback Steakhouse',
        sector: 'delivery',
        paymentMethod: 'Cartão de Crédito',
        amount: 165.00,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_092',
        date: '2026-09-18',
        time: '10:15',
        merchant: 'Assaí Atacadista - Compra do Mês',
        sector: 'mercado',
        paymentMethod: 'Cartão de Débito',
        amount: 690.00,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_093',
        date: '2026-09-14',
        time: '09:00',
        merchant: 'Uber + Combustível Setembro',
        sector: 'transporte',
        paymentMethod: 'Cartão de Crédito',
        amount: 320.00,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_094',
        date: '2026-09-10',
        time: '16:40',
        merchant: 'Amazon Prime - Livros & Eletrônicos',
        sector: 'compras',
        paymentMethod: 'Cartão de Crédito',
        amount: 245.00,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      },
      {
        id: 'tx_095',
        date: '2026-09-06',
        time: '11:00',
        merchant: 'Drogasil + Academia',
        sector: 'saude',
        paymentMethod: 'Cartão de Crédito',
        amount: 215.00,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: false
      }
    ]
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      appState = {
        ...appState,
        ...parsed,
        sectorLimits: { ...appState.sectorLimits, ...(parsed.sectorLimits || {}) },
        monthlyIncomes: { ...appState.monthlyIncomes, ...(parsed.monthlyIncomes || {}) }
      };
    } else {
      const demo = getInitialDemoData();
      appState.subscriptions = demo.subscriptions;
      appState.transactions = demo.transactions;
      ensureRecurringTransactionsForMonth(appState.currentMonth);
      saveState();
    }
  } catch (e) {
    console.error('Erro ao carregar dados do LocalStorage:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.warn('Limite de armazenamento atingido ao salvar imagens grandes. Comprimindo histórico antigo...', e);
  }
}

/* ==========================================================================
   Formatação e Utilitários
   ========================================================================== */

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function formatDateBR(isoDate = '') {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function formatMonthLabel(yyyyMM) {
  const [y, m] = yyyyMM.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[idx] || m} ${y}`;
}

function getPreviousMonth(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getSectorMeta(sectorId) {
  return SECTORS.find(s => s.id === sectorId) || SECTORS[0];
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-600 text-white border-emerald-500',
    warning: 'bg-amber-500 text-slate-950 border-amber-400 font-semibold',
    danger: 'bg-red-600 text-white border-red-500',
    info: 'bg-purple-700 text-white border-purple-500'
  };

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3600);
}

/* ==========================================================================
   Assinaturas e Gastos Fixos Recorrentes (Lançamento Automático Mensal)
   ========================================================================== */

function ensureRecurringTransactionsForMonth(yyyyMM) {
  let addedCount = 0;
  for (const sub of appState.subscriptions) {
    if (!sub.active) continue;
    const recurringTxId = `rec_${sub.id}_${yyyyMM}`;
    const alreadyExists = appState.transactions.some(t => t.id === recurringTxId);
    if (!alreadyExists) {
      const dayStr = String(Math.min(28, Math.max(1, Number(sub.day) || 5))).padStart(2, '0');
      appState.transactions.push({
        id: recurringTxId,
        date: `${yyyyMM}-${dayStr}`,
        time: '08:00',
        merchant: `${sub.merchant} (Recorrente)`,
        sector: sub.sector,
        paymentMethod: sub.paymentMethod || 'Cartão de Crédito',
        amount: Number(sub.amount) || 0,
        imageDataUrl: null,
        imageSignature: null,
        isRecurring: true,
        subscriptionId: sub.id
      });
      addedCount++;
    }
  }
  if (addedCount > 0) {
    saveState();
  }
}

/* ==========================================================================
   Cálculos Mensais e Resumos
   ========================================================================== */

function getMonthTransactions(yyyyMM = appState.currentMonth) {
  return appState.transactions.filter(t => t.date && t.date.startsWith(yyyyMM));
}

function calculateMonthlySummary(yyyyMM = appState.currentMonth) {
  const txs = getMonthTransactions(yyyyMM);
  const income = Number(appState.monthlyIncomes[yyyyMM] ?? 7500.00);
  let totalExpense = 0;

  const bySector = {};
  SECTORS.forEach(s => {
    bySector[s.id] = {
      ...s,
      total: 0,
      count: 0,
      limit: Number(appState.sectorLimits[s.id] ?? s.defaultLimit),
      transactions: []
    };
  });

  for (const tx of txs) {
    const val = Number(tx.amount) || 0;
    totalExpense += val;
    const secId = bySector[tx.sector] ? tx.sector : 'compras';
    bySector[secId].total += val;
    bySector[secId].count += 1;
    bySector[secId].transactions.push(tx);
  }

  // Descobre o Maior Vilão do Mês
  let topVillain = null;
  for (const sec of Object.values(bySector)) {
    if (sec.total > 0 && (!topVillain || sec.total > topVillain.total)) {
      topVillain = sec;
    }
  }

  return {
    income,
    totalExpense,
    balance: income - totalExpense,
    bySector,
    topVillain,
    txCount: txs.length
  };
}

/* ==========================================================================
   Detecção de Prints e Compras Duplicadas
   ========================================================================== */

function checkDuplicateTransaction({ amount, date, merchant, imageSignature, editingId = null }) {
  const normMerchant = (merchant || '').toLowerCase().trim();
  const numAmount = Number(amount) || 0;

  return appState.transactions.find(tx => {
    if (editingId && tx.id === editingId) return false;

    // 1. Mesmo hash de imagem enviada
    if (imageSignature && tx.imageSignature && imageSignature === tx.imageSignature) {
      return true;
    }

    // 2. Mesmo valor exato + mesma data + nome de estabelecimento parecido
    const sameAmount = Math.abs((Number(tx.amount) || 0) - numAmount) < 0.01;
    const sameDate = tx.date === date;
    const txMerchant = (tx.merchant || '').toLowerCase().trim();
    const similarMerchant =
      normMerchant.length > 2 &&
      (txMerchant.includes(normMerchant) || normMerchant.includes(txMerchant));

    return sameAmount && sameDate && similarMerchant;
  });
}

/* ==========================================================================
   Renderização Completa da Interface
   ========================================================================== */

function applyTheme() {
  const root = document.documentElement;
  if (appState.darkMode) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  const themeBtnText = document.getElementById('theme-toggle-label');
  if (themeBtnText) {
    themeBtnText.textContent = appState.darkMode ? 'Modo Claro' : 'Modo Escuro';
  }
}

function renderAll() {
  applyTheme();
  ensureRecurringTransactionsForMonth(appState.currentMonth);

  const summary = calculateMonthlySummary(appState.currentMonth);
  const prevMonth = getPreviousMonth(appState.currentMonth);
  const prevSummary = calculateMonthlySummary(prevMonth);

  // Atualiza Seletor de Mês/Ano no Topo
  const monthLabelEl = document.getElementById('current-month-label');
  if (monthLabelEl) {
    monthLabelEl.textContent = formatMonthLabel(appState.currentMonth);
  }

  // Renderiza Cards de Resumo no Topo
  renderSummaryCards(summary, prevSummary);

  // Renderiza Gráficos Interativos
  renderCharts(summary, prevSummary);

  // Renderiza Abas Rápidas de Setor
  renderSectorFilterTabs(summary);

  // Renderiza as 5 Tabelas Setoriais Individuais
  renderSectorTables(summary);

  // Renderiza Seção de Assinaturas e Gastos Fixos Recorrentes
  renderSubscriptionsSection();

  // Atualiza ícones Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderSummaryCards(summary, prevSummary) {
  const incomeEl = document.getElementById('card-income-value');
  const expenseEl = document.getElementById('card-expense-value');
  const expenseDiffEl = document.getElementById('card-expense-diff');
  const balanceEl = document.getElementById('card-balance-value');
  const balanceStatusEl = document.getElementById('card-balance-status');
  const villainTitleEl = document.getElementById('card-villain-title');
  const villainDescEl = document.getElementById('card-villain-desc');

  if (incomeEl) incomeEl.textContent = formatCurrency(summary.income);
  if (expenseEl) expenseEl.textContent = formatCurrency(summary.totalExpense);

  if (expenseDiffEl) {
    if (prevSummary.totalExpense > 0) {
      const diffPct = ((summary.totalExpense - prevSummary.totalExpense) / prevSummary.totalExpense) * 100;
      const sign = diffPct > 0 ? '+' : '';
      expenseDiffEl.textContent = `${sign}${diffPct.toFixed(1)}% vs mês anterior`;
      expenseDiffEl.className = diffPct > 0
        ? 'text-xs font-medium text-red-500'
        : 'text-xs font-medium text-emerald-500';
    } else {
      expenseDiffEl.textContent = `${summary.txCount} lançamentos neste mês`;
      expenseDiffEl.className = 'text-xs text-slate-400';
    }
  }

  if (balanceEl) {
    balanceEl.textContent = formatCurrency(summary.balance);
    balanceEl.className = summary.balance >= 0
      ? 'text-2xl sm:text-3xl font-extrabold text-emerald-500 tracking-tight'
      : 'text-2xl sm:text-3xl font-extrabold text-red-500 tracking-tight';
  }

  if (balanceStatusEl) {
    const committedPct = summary.income > 0 ? Math.min(999, (summary.totalExpense / summary.income) * 100) : 0;
    balanceStatusEl.textContent = `${committedPct.toFixed(0)}% da renda comprometida`;
    balanceStatusEl.className = committedPct >= 90
      ? 'text-xs font-semibold text-red-500'
      : committedPct >= 75
        ? 'text-xs font-semibold text-amber-500'
        : 'text-xs font-medium text-emerald-500';
  }

  if (villainTitleEl && villainDescEl) {
    if (summary.topVillain) {
      const share = summary.totalExpense > 0
        ? ((summary.topVillain.total / summary.totalExpense) * 100).toFixed(0)
        : 0;
      villainTitleEl.textContent = `${summary.topVillain.emoji} ${summary.topVillain.shortName}: ${formatCurrency(summary.topVillain.total)}`;
      villainDescEl.textContent = `Seu maior gasto este mês (${share}% das despesas totais)`;
    } else {
      villainTitleEl.textContent = 'Nenhum gasto ainda';
      villainDescEl.textContent = 'Adicione um print ou gasto manual para começar';
    }
  }
}

/* ==========================================================================
   Gráficos Interativos (Chart.js)
   ========================================================================== */

function renderCharts(summary, prevSummary) {
  if (typeof Chart === 'undefined') return;

  const textColor = appState.darkMode ? '#cbd5e1' : '#334155';
  const gridColor = appState.darkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)';

  // 1. Gráfico de Rosca (Donut): Proporção de gastos por setor
  const donutCtx = document.getElementById('sectorDonutChart');
  if (donutCtx) {
    const labels = SECTORS.map(s => `${s.emoji} ${s.shortName}`);
    const dataVals = SECTORS.map(s => Number(summary.bySector[s.id]?.total.toFixed(2)) || 0);
    const colors = SECTORS.map(s => s.id === 'transporte' && appState.darkMode ? '#64748b' : s.color);

    if (donutChartInstance) {
      donutChartInstance.destroy();
    }

    const hasData = dataVals.some(v => v > 0);

    donutChartInstance = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: hasData ? labels : ['Sem gastos no mês'],
        datasets: [{
          data: hasData ? dataVals : [1],
          backgroundColor: hasData ? colors : ['#334155'],
          borderWidth: 2,
          borderColor: appState.darkMode ? '#111827' : '#ffffff',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              padding: 14,
              usePointStyle: true,
              font: { size: 12, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (!hasData) return ' R$ 0,00';
                const val = ctx.parsed || 0;
                const pct = summary.totalExpense > 0 ? ((val / summary.totalExpense) * 100).toFixed(1) : 0;
                return ` ${formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 2. Gráfico de Barras: Evolução dia a dia OU Comparativo com Mês Anterior
  const barCtx = document.getElementById('evolutionBarChart');
  if (barCtx) {
    if (barChartInstance) {
      barChartInstance.destroy();
    }

    if (appState.barChartMode === 'compare') {
      const labels = SECTORS.map(s => s.shortName);
      const currentData = SECTORS.map(s => Number((summary.bySector[s.id]?.total || 0).toFixed(2)));
      const prevData = SECTORS.map(s => Number((prevSummary.bySector[s.id]?.total || 0).toFixed(2)));

      barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: formatMonthLabel( getPreviousMonth(appState.currentMonth) ),
              data: prevData,
              backgroundColor: 'rgba(148, 163, 184, 0.45)',
              borderRadius: 6
            },
            {
              label: formatMonthLabel(appState.currentMonth),
              data: currentData,
              backgroundColor: '#820ad1',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: textColor }, grid: { display: false } },
            y: {
              ticks: {
                color: textColor,
                callback: (v) => 'R$ ' + v
              },
              grid: { color: gridColor }
            }
          },
          plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
              }
            }
          }
        }
      });
    } else {
      // Evolução Dia a Dia no Mês
      const [yearNum, monthNum] = appState.currentMonth.split('-').map(Number);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const dailyTotals = new Array(daysInMonth).fill(0);

      for (const tx of getMonthTransactions(appState.currentMonth)) {
        const dayPart = parseInt((tx.date || '').split('-')[2], 10);
        if (dayPart >= 1 && dayPart <= daysInMonth) {
          dailyTotals[dayPart - 1] += Number(tx.amount) || 0;
        }
      }

      const dayLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

      barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [{
            label: 'Gasto Diário (R$)',
            data: dailyTotals.map(v => Number(v.toFixed(2))),
            backgroundColor: dailyTotals.map(v => v > 300 ? '#ef4444' : '#820ad1'),
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 15 },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: textColor,
                callback: (v) => 'R$ ' + v
              },
              grid: { color: gridColor }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => `Dia ${items[0].label}/${String(monthNum).padStart(2, '0')}`,
                label: (ctx) => ` Total do dia: ${formatCurrency(ctx.parsed.y)}`
              }
            }
          }
        }
      });
    }
  }
}

/* ==========================================================================
   Tabelas Separadas por Setor/Categoria + Barras de Teto de Gastos
   ========================================================================== */

function renderSectorFilterTabs(summary) {
  const container = document.getElementById('sector-tabs-bar');
  if (!container) return;

  const allActive = appState.activeSectorFilter === 'all';
  let html = `
    <button onclick="setSectorTab('all')"
      class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
        allActive
          ? 'bg-purple-700 text-white shadow-md'
          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-slate-700'
      }">
      <span>📊 Todos os Setores</span>
      <span class="px-2 py-0.5 rounded-full text-xs ${allActive ? 'bg-white/20 text-white' : 'bg-slate-300 dark:bg-slate-700'}">${summary.txCount}</span>
    </button>
  `;

  for (const s of SECTORS) {
    const secSummary = summary.bySector[s.id];
    const isActive = appState.activeSectorFilter === s.id;
    html += `
      <button onclick="setSectorTab('${s.id}')"
        class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
          isActive
            ? 'bg-purple-700 text-white shadow-md'
            : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-slate-700'
        }">
        <span>${s.emoji} ${s.shortName}</span>
        <span class="text-xs opacity-85">(${formatCurrency(secSummary.total)})</span>
      </button>
    `;
  }

  container.innerHTML = html;
}

function renderSectorTables(summary) {
  const wrapper = document.getElementById('sector-tables-container');
  if (!wrapper) return;

  const visibleSectors = appState.activeSectorFilter === 'all'
    ? SECTORS
    : SECTORS.filter(s => s.id === appState.activeSectorFilter);

  wrapper.innerHTML = visibleSectors.map(sector => {
    const secData = summary.bySector[sector.id];
    const filterState = appState.tableFilters[sector.id] || { search: '', sort: 'recent', payment: 'all', collapsed: false };
    const limit = Number(secData.limit) || sector.defaultLimit;
    const spent = secData.total;
    const limitPct = limit > 0 ? (spent / limit) * 100 : 0;
    const shareOfTotalMonth = summary.totalExpense > 0 ? (spent / summary.totalExpense) * 100 : 0;

    // Cores Semânticas da Barra de Teto de Gastos (Verde -> Amarelo em 80% -> Vermelho em 100%)
    let barColorClass = 'bg-emerald-500';
    let statusBadgeHtml = `<span class="text-xs font-semibold text-emerald-500">Dentro da meta (${limitPct.toFixed(0)}%)</span>`;

    if (limitPct >= 100) {
      barColorClass = 'bg-red-500';
      statusBadgeHtml = `<span class="text-xs font-bold text-red-500 flex items-center gap-1">⚠️ Teto Excedido! (${limitPct.toFixed(0)}%)</span>`;
    } else if (limitPct >= 80) {
      barColorClass = 'bg-amber-500';
      statusBadgeHtml = `<span class="text-xs font-bold text-amber-500 flex items-center gap-1">⚡ Atenção: Próximo do limite (${limitPct.toFixed(0)}%)</span>`;
    }

    // Filtra e ordena os lançamentos desta tabela setorial
    let rows = [...secData.transactions];
    if (filterState.search.trim() !== '') {
      const q = filterState.search.toLowerCase().trim();
      rows = rows.filter(r =>
        (r.merchant || '').toLowerCase().includes(q) ||
        (r.paymentMethod || '').toLowerCase().includes(q) ||
        String(r.amount).includes(q)
      );
    }
    if (filterState.payment !== 'all') {
      rows = rows.filter(r => r.paymentMethod === filterState.payment);
    }

    rows.sort((a, b) => {
      if (filterState.sort === 'highest') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (filterState.sort === 'lowest') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      if (filterState.sort === 'az') return (a.merchant || '').localeCompare(b.merchant || '');
      // Mais recente (padrão)
      const dtA = `${a.date || ''} ${a.time || '00:00'}`;
      const dtB = `${b.date || ''} ${b.time || '00:00'}`;
      return dtB.localeCompare(dtA);
    });

    const filteredSubtotal = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    return `
      <div class="card-surface overflow-hidden transition-all" id="sector-card-${sector.id}">
        <!-- Cabeçalho do Setor + Barra de Progresso do Teto de Gastos -->
        <div class="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div class="flex items-start sm:items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm"
                   style="background-color: ${sector.color}18; border: 1px solid ${sector.color}40;">
                ${sector.emoji}
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-bold tracking-tight">${sector.name}</h3>
                  <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    ${secData.count} ${secData.count === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${sector.subtitle}</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between lg:justify-end gap-4">
              <div class="text-left lg:text-right">
                <div class="text-xs text-slate-400 uppercase font-semibold tracking-wider">Subtotal do Setor</div>
                <div class="text-xl font-extrabold text-slate-900 dark:text-white">
                  ${formatCurrency(spent)}
                  <span class="text-xs font-semibold text-slate-400">(${shareOfTotalMonth.toFixed(1)}% do mês)</span>
                </div>
              </div>

              <div class="flex items-center gap-2 no-print">
                <button onclick="openBudgetModal('${sector.id}')"
                  title="Definir Teto de Gastos para ${sector.name}"
                  class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5">
                  <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5"></i>
                  <span>Meta: ${formatCurrency(limit)}</span>
                </button>
                <button onclick="toggleSectorCollapse('${sector.id}')"
                  class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  title="Expandir/Recolher Tabela">
                  <i data-lucide="${filterState.collapsed ? 'chevron-down' : 'chevron-up'}" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Barra de Progresso do Orçamento Inteligente (Verde -> Amarelo 80% -> Vermelho 100%) -->
          <div class="mt-4">
            <div class="flex items-center justify-between text-xs mb-1.5">
              ${statusBadgeHtml}
              <span class="text-slate-500 dark:text-slate-400 font-medium">
                ${formatCurrency(spent)} de ${formatCurrency(limit)}
                ${limit - spent >= 0
                  ? `(Restam ${formatCurrency(limit - spent)})`
                  : `(Excedido em ${formatCurrency(spent - limit)})`}
              </span>
            </div>
            <div class="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full ${barColorClass} budget-progress-bar rounded-full"
                   style="width: ${Math.min(100, limitPct).toFixed(1)}%"></div>
            </div>
          </div>
        </div>

        <!-- Corpo Expandido: Filtros Rápidos + Tabela Setorial -->
        <div class="${filterState.collapsed ? 'hidden' : 'block'}">
          <!-- Barra de Filtros Internos da Tabela -->
          <div class="px-5 py-3 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
            <div class="relative flex-1 max-w-sm">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
              <input type="text"
                value="${filterState.search.replace(/"/g, '&quot;')}"
                oninput="updateSectorSearch('${sector.id}', this.value)"
                placeholder="Filtrar em ${sector.shortName} (ex: Uber, iFood, PIX)..."
                class="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <select onchange="updateSectorPaymentFilter('${sector.id}', this.value)"
                class="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none">
                <option value="all" ${filterState.payment === 'all' ? 'selected' : ''}>💳 Todos Pagamentos</option>
                <option value="PIX" ${filterState.payment === 'PIX' ? 'selected' : ''}>⚡ PIX</option>
                <option value="Cartão de Crédito" ${filterState.payment === 'Cartão de Crédito' ? 'selected' : ''}>💳 Cartão de Crédito</option>
                <option value="Cartão de Débito" ${filterState.payment === 'Cartão de Débito' ? 'selected' : ''}>🏦 Cartão de Débito</option>
                <option value="Vale-Refeição" ${filterState.payment === 'Vale-Refeição' ? 'selected' : ''}>🍽️ Vale-Refeição</option>
                <option value="Dinheiro" ${filterState.payment === 'Dinheiro' ? 'selected' : ''}>💵 Dinheiro</option>
              </select>

              <select onchange="updateSectorSort('${sector.id}', this.value)"
                class="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none">
                <option value="recent" ${filterState.sort === 'recent' ? 'selected' : ''}>🕒 Mais recentes</option>
                <option value="highest" ${filterState.sort === 'highest' ? 'selected' : ''}>⬆️ Maior valor</option>
                <option value="lowest" ${filterState.sort === 'lowest' ? 'selected' : ''}>⬇️ Menor valor</option>
                <option value="az" ${filterState.sort === 'az' ? 'selected' : ''}>🔤 Nome (A-Z)</option>
              </select>

              <button onclick="openQuickManualModal('${sector.id}')"
                class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 transition flex items-center gap-1">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Lançar aqui</span>
              </button>
            </div>
          </div>

          <!-- Tabela de Lançamentos do Setor -->
          <div class="overflow-x-auto">
            <table class="sector-table">
              <thead>
                <tr>
                  <th>Data & Hora</th>
                  <th>Estabelecimento / Descrição</th>
                  <th>Forma de Pagamento</th>
                  <th class="text-center">Print / Comprovante</th>
                  <th class="text-right">Valor (R$)</th>
                  <th class="text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length === 0 ? `
                  <tr>
                    <td colspan="6" class="text-center py-8 text-slate-400 text-sm">
                      Nenhum lançamento encontrado em <strong>${sector.name}</strong> neste mês.
                    </td>
                  </tr>
                ` : rows.map(tx => `
                  <tr>
                    <td class="whitespace-nowrap">
                      <div class="font-semibold text-slate-800 dark:text-slate-200">${formatDateBR(tx.date)}</div>
                      <div class="text-xs text-slate-400">${tx.time || '12:00'}</div>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-900 dark:text-white">${escapeHtml(tx.merchant)}</span>
                        ${tx.isRecurring ? `<span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-500/15 text-purple-500">Fixo Mensal</span>` : ''}
                      </div>
                    </td>
                    <td class="whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        ${getPaymentBadgeIcon(tx.paymentMethod)} ${escapeHtml(tx.paymentMethod || 'PIX')}
                      </span>
                    </td>
                    <td class="text-center whitespace-nowrap">
                      ${tx.imageDataUrl ? `
                        <button onclick="openReceiptLightbox('${tx.id}')"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 transition"
                          title="Visualizar Print Original Anexado">
                          <i data-lucide="image" class="w-3.5 h-3.5"></i>
                          <span>Ver Print</span>
                        </button>
                      ` : `
                        <span class="text-xs text-slate-400 italic">Manual</span>
                      `}
                    </td>
                    <td class="text-right whitespace-nowrap font-bold text-red-500">
                      ${formatCurrency(tx.amount)}
                    </td>
                    <td class="text-right whitespace-nowrap no-print">
                      <div class="inline-flex items-center justify-end gap-1">
                        <button onclick="editTransaction('${tx.id}')"
                          class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                          title="Editar lançamento">
                          <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteTransaction('${tx.id}')"
                          class="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-500 transition"
                          title="Excluir lançamento">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <!-- Rodapé da Tabela Setorial -->
              <tfoot>
                <tr class="bg-slate-50/90 dark:bg-slate-900/70 font-bold">
                  <td colspan="4" class="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Subtotal do Setor (${rows.length} ${rows.length === 1 ? 'item' : 'itens'}) • Representa <strong>${shareOfTotalMonth.toFixed(1)}%</strong> do gasto total do mês
                  </td>
                  <td class="text-right text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                    ${formatCurrency(filteredSubtotal)}
                  </td>
                  <td class="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getPaymentBadgeIcon(method = '') {
  if (method.includes('PIX')) return '⚡';
  if (method.includes('Crédito')) return '💳';
  if (method.includes('Débito')) return '🏦';
  if (method.includes('Vale')) return '🍽️';
  return '💵';
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ==========================================================================
   Gestão de Assinaturas e Gastos Fixos Recorrentes
   ========================================================================== */

function renderSubscriptionsSection() {
  const tbody = document.getElementById('subscriptions-tbody');
  const totalFixedEl = document.getElementById('subscriptions-total-badge');
  if (!tbody) return;

  const activeTotal = appState.subscriptions
    .filter(s => s.active)
    .reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  if (totalFixedEl) {
    totalFixedEl.textContent = `Total Fixo Mensal: ${formatCurrency(activeTotal)}`;
  }

  if (appState.subscriptions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-slate-400 text-sm">
          Nenhuma assinatura ou gasto fixo cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appState.subscriptions.map(sub => {
    const sec = getSectorMeta(sub.sector);
    return `
      <tr>
        <td class="font-semibold">Dia ${String(sub.day).padStart(2, '0')}</td>
        <td class="font-bold text-slate-900 dark:text-white">${escapeHtml(sub.merchant)}</td>
        <td>
          <span class="badge-sector ${sec.badgeClass}">${sec.emoji} ${sec.shortName}</span>
        </td>
        <td>${escapeHtml(sub.paymentMethod)}</td>
        <td class="text-right font-bold">${formatCurrency(sub.amount)}</td>
        <td class="text-right">
          <div class="inline-flex items-center gap-2">
            <button onclick="toggleSubscriptionActive('${sub.id}')"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                sub.active
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
              }">
              ${sub.active ? 'Ativo' : 'Pausado'}
            </button>
            <button onclick="deleteSubscription('${sub.id}')"
              class="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition"
              title="Remover gasto recorrente">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ==========================================================================
   Interações de Navegação, Filtros e Modais
   ========================================================================== */

window.changeMonth = function(delta) {
  const [y, m] = appState.currentMonth.split('-').map(Number);
  const nextDate = new Date(y, m - 1 + delta, 1);
  appState.currentMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  saveState();
  renderAll();
};

window.toggleDarkMode = function() {
  appState.darkMode = !appState.darkMode;
  saveState();
  renderAll();
};

window.setBarChartMode = function(mode) {
  appState.barChartMode = mode;
  const btnDaily = document.getElementById('btn-chart-daily');
  const btnCompare = document.getElementById('btn-chart-compare');
  if (btnDaily && btnCompare) {
    btnDaily.className = mode === 'daily'
      ? 'px-3 py-1 rounded-lg text-xs font-semibold bg-purple-700 text-white'
      : 'px-3 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    btnCompare.className = mode === 'compare'
      ? 'px-3 py-1 rounded-lg text-xs font-semibold bg-purple-700 text-white'
      : 'px-3 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
  }
  renderAll();
};

window.setSectorTab = function(sectorId) {
  appState.activeSectorFilter = sectorId;
  renderAll();
};

window.updateSectorSearch = function(sectorId, val) {
  if (!appState.tableFilters[sectorId]) return;
  appState.tableFilters[sectorId].search = val;
  const summary = calculateMonthlySummary(appState.currentMonth);
  renderSectorTables(summary);
  if (window.lucide) window.lucide.createIcons();
  // Mantém o foco no input após re-renderizar
  const card = document.getElementById(`sector-card-${sectorId}`);
  if (card) {
    const input = card.querySelector('input[type="text"]');
    if (input) {
      input.focus();
      input.setSelectionRange(val.length, val.length);
    }
  }
};

window.updateSectorPaymentFilter = function(sectorId, val) {
  if (!appState.tableFilters[sectorId]) return;
  appState.tableFilters[sectorId].payment = val;
  renderAll();
};

window.updateSectorSort = function(sectorId, val) {
  if (!appState.tableFilters[sectorId]) return;
  appState.tableFilters[sectorId].sort = val;
  renderAll();
};

window.toggleSectorCollapse = function(sectorId) {
  if (!appState.tableFilters[sectorId]) return;
  appState.tableFilters[sectorId].collapsed = !appState.tableFilters[sectorId].collapsed;
  renderAll();
};

window.scrollToSection = function(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/* ==========================================================================
   Fluxo Principal: Upload / Colar Print (Ctrl+V) + OCR + Modal de Confirmação
   ========================================================================== */

window.openScanModal = function() {
  pendingReceiptData = {
    editingId: null,
    imageDataUrl: null,
    imageSignature: null,
    rawText: ''
  };
  document.getElementById('scan-step-upload').classList.remove('hidden');
  document.getElementById('scan-step-processing').classList.add('hidden');
  document.getElementById('scan-step-confirm').classList.add('hidden');
  document.getElementById('duplicate-alert-banner').classList.add('hidden');
  document.getElementById('scan-modal').classList.remove('hidden');
};

window.closeScanModal = function() {
  document.getElementById('scan-modal').classList.add('hidden');
};

async function processUploadedImageDataUrl(dataUrl) {
  pendingReceiptData.imageDataUrl = dataUrl;
  pendingReceiptData.imageSignature = window.OCRService.computeImageSignature(dataUrl);

  // Mostra etapa de progresso com animação de scanner
  document.getElementById('scan-step-upload').classList.add('hidden');
  document.getElementById('scan-step-processing').classList.remove('hidden');
  document.getElementById('scan-step-confirm').classList.add('hidden');

  const previewProcessingImg = document.getElementById('scan-processing-img');
  if (previewProcessingImg) previewProcessingImg.src = dataUrl;

  const progressBar = document.getElementById('ocr-progress-bar');
  const progressText = document.getElementById('ocr-progress-status');

  try {
    const extracted = await window.OCRService.recognizeReceiptFromImage(dataUrl, (pct, msg) => {
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressText) progressText.textContent = msg;
    });

    pendingReceiptData.rawText = extracted.rawText || '';
    openConfirmStepWithData(extracted);
  } catch (err) {
    console.error('Erro no OCR:', err);
    showToast('Não foi possível ler automaticamente todos os campos. Preencha ou ajuste abaixo.', 'warning');
    openConfirmStepWithData({
      amount: '',
      date: `${appState.currentMonth}-${String(new Date().getDate()).padStart(2, '0')}`,
      time: new Date().toTimeString().slice(0, 5),
      merchant: '',
      sector: 'delivery',
      paymentMethod: 'PIX',
      rawText: ''
    });
  }
}

function openConfirmStepWithData(data) {
  document.getElementById('scan-step-upload').classList.add('hidden');
  document.getElementById('scan-step-processing').classList.add('hidden');
  document.getElementById('scan-step-confirm').classList.remove('hidden');

  const thumb = document.getElementById('confirm-receipt-thumb');
  const thumbWrapper = document.getElementById('confirm-thumb-wrapper');
  if (pendingReceiptData.imageDataUrl) {
    thumb.src = pendingReceiptData.imageDataUrl;
    thumbWrapper.classList.remove('hidden');
  } else {
    thumbWrapper.classList.add('hidden');
  }

  document.getElementById('confirm-amount').value = data.amount ? Number(data.amount).toFixed(2) : '';
  document.getElementById('confirm-date').value = data.date || `${appState.currentMonth}-15`;
  document.getElementById('confirm-time').value = data.time || '12:00';
  document.getElementById('confirm-merchant').value = data.merchant || '';
  document.getElementById('confirm-sector').value = data.sector || 'delivery';
  document.getElementById('confirm-payment').value = data.paymentMethod || 'PIX';

  validateDuplicateOnConfirmForm();
}

window.validateDuplicateOnConfirmForm = function() {
  const amount = parseFloat(document.getElementById('confirm-amount').value) || 0;
  const date = document.getElementById('confirm-date').value;
  const merchant = document.getElementById('confirm-merchant').value;

  const dup = checkDuplicateTransaction({
    amount,
    date,
    merchant,
    imageSignature: pendingReceiptData.imageSignature,
    editingId: pendingReceiptData.editingId
  });

  const banner = document.getElementById('duplicate-alert-banner');
  if (dup) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
};

window.autoClassifyConfirmMerchant = function(merchantVal) {
  if (window.OCRService && merchantVal.trim().length >= 2) {
    const suggested = window.OCRService.classifyMerchantSector(merchantVal, '');
    document.getElementById('confirm-sector').value = suggested;
  }
  validateDuplicateOnConfirmForm();
};

window.saveConfirmedTransaction = function(e) {
  if (e) e.preventDefault();

  const amount = parseFloat(String(document.getElementById('confirm-amount').value).replace(',', '.'));
  const date = document.getElementById('confirm-date').value;
  const time = document.getElementById('confirm-time').value || '12:00';
  const merchant = document.getElementById('confirm-merchant').value.trim() || 'Despesa Registrada';
  const sector = document.getElementById('confirm-sector').value;
  const paymentMethod = document.getElementById('confirm-payment').value;

  if (isNaN(amount) || amount <= 0) {
    showToast('Informe um valor válido maior que R$ 0,00.', 'danger');
    return;
  }

  if (pendingReceiptData.editingId) {
    const idx = appState.transactions.findIndex(t => t.id === pendingReceiptData.editingId);
    if (idx !== -1) {
      appState.transactions[idx] = {
        ...appState.transactions[idx],
        amount,
        date,
        time,
        merchant,
        sector,
        paymentMethod,
        imageDataUrl: pendingReceiptData.imageDataUrl ?? appState.transactions[idx].imageDataUrl,
        imageSignature: pendingReceiptData.imageSignature ?? appState.transactions[idx].imageSignature
      };
      showToast('Lançamento atualizado com sucesso!');
    }
  } else {
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      amount,
      date,
      time,
      merchant,
      sector,
      paymentMethod,
      imageDataUrl: pendingReceiptData.imageDataUrl,
      imageSignature: pendingReceiptData.imageSignature,
      isRecurring: false
    };
    appState.transactions.unshift(newTx);

    // Se a data pertencer a outro mês, navega para o mês do comprovante
    const txMonth = date.slice(0, 7);
    if (txMonth && txMonth.length === 7 && txMonth !== appState.currentMonth) {
      appState.currentMonth = txMonth;
    }
    showToast(`Gasto de ${formatCurrency(amount)} em ${merchant} registrado!`);
  }

  saveState();
  closeScanModal();
  renderAll();
};

// Testar OCR com 1 clique gerando imagem real de comprovante
window.triggerDemoReceiptOCR = function(presetType) {
  const sampleDataUrl = window.OCRService.generateSampleReceiptDataUrl(presetType, appState.currentMonth);
  processUploadedImageDataUrl(sampleDataUrl);
};

/* ==========================================================================
   Entrada Manual Rápida (< 5 segundos), Edição e Exclusão
   ========================================================================== */

window.openQuickManualModal = function(defaultSector = 'delivery') {
  pendingReceiptData = {
    editingId: null,
    imageDataUrl: null,
    imageSignature: null,
    rawText: ''
  };
  document.getElementById('scan-modal').classList.remove('hidden');
  openConfirmStepWithData({
    amount: '',
    date: `${appState.currentMonth}-${String(new Date().getDate()).padStart(2, '0')}`,
    time: new Date().toTimeString().slice(0, 5),
    merchant: '',
    sector: defaultSector,
    paymentMethod: 'PIX'
  });
  setTimeout(() => {
    const merchantInput = document.getElementById('confirm-merchant');
    if (merchantInput) merchantInput.focus();
  }, 80);
};

window.editTransaction = function(txId) {
  const tx = appState.transactions.find(t => t.id === txId);
  if (!tx) return;

  pendingReceiptData = {
    editingId: tx.id,
    imageDataUrl: tx.imageDataUrl || null,
    imageSignature: tx.imageSignature || null,
    rawText: ''
  };

  document.getElementById('scan-modal').classList.remove('hidden');
  openConfirmStepWithData(tx);
};

window.deleteTransaction = function(txId) {
  const idx = appState.transactions.findIndex(t => t.id === txId);
  if (idx === -1) return;
  const removed = appState.transactions[idx];
  appState.transactions.splice(idx, 1);
  saveState();
  renderAll();
  showToast(`Lançamento "${removed.merchant}" removido.`, 'info');
};

/* ==========================================================================
   Lightbox para Visualizar o Print Original Anexado
   ========================================================================== */

window.openReceiptLightbox = function(txId) {
  const tx = appState.transactions.find(t => t.id === txId);
  if (!tx || !tx.imageDataUrl) return;

  document.getElementById('lightbox-img').src = tx.imageDataUrl;
  document.getElementById('lightbox-caption').textContent =
    `${tx.merchant} • ${formatCurrency(tx.amount)} • ${formatDateBR(tx.date)} às ${tx.time || ''}`;
  document.getElementById('receipt-lightbox').classList.remove('hidden');
};

window.closeReceiptLightbox = function() {
  document.getElementById('receipt-lightbox').classList.add('hidden');
};

/* ==========================================================================
   Configuração de Receita Mensal, Teto por Setor e Assinaturas
   ========================================================================== */

window.openIncomeModal = function() {
  const currentVal = appState.monthlyIncomes[appState.currentMonth] ?? 7500;
  document.getElementById('income-modal-input').value = Number(currentVal).toFixed(2);
  document.getElementById('income-modal-month').textContent = formatMonthLabel(appState.currentMonth);
  document.getElementById('income-modal').classList.remove('hidden');
};

window.saveMonthlyIncome = function(e) {
  if (e) e.preventDefault();
  const val = parseFloat(document.getElementById('income-modal-input').value);
  if (!isNaN(val) && val >= 0) {
    appState.monthlyIncomes[appState.currentMonth] = val;
    saveState();
    renderAll();
    document.getElementById('income-modal').classList.add('hidden');
    showToast(`Receita de ${formatMonthLabel(appState.currentMonth)} atualizada!`);
  }
};

window.openBudgetModal = function(sectorId) {
  const sec = getSectorMeta(sectorId);
  const currentLimit = appState.sectorLimits[sectorId] ?? sec.defaultLimit;
  document.getElementById('budget-modal-sector-id').value = sectorId;
  document.getElementById('budget-modal-title').textContent = `${sec.emoji} Teto de Gastos: ${sec.name}`;
  document.getElementById('budget-modal-input').value = Number(currentLimit).toFixed(2);
  document.getElementById('budget-modal').classList.remove('hidden');
};

window.saveSectorBudget = function(e) {
  if (e) e.preventDefault();
  const sectorId = document.getElementById('budget-modal-sector-id').value;
  const val = parseFloat(document.getElementById('budget-modal-input').value);
  if (sectorId && !isNaN(val) && val > 0) {
    appState.sectorLimits[sectorId] = val;
    saveState();
    renderAll();
    document.getElementById('budget-modal').classList.add('hidden');
    showToast('Teto de gastos atualizado com sucesso!');
  }
};

window.addSubscription = function(e) {
  if (e) e.preventDefault();
  const merchant = document.getElementById('sub-merchant').value.trim();
  const amount = parseFloat(document.getElementById('sub-amount').value);
  const day = parseInt(document.getElementById('sub-day').value, 10) || 5;
  const sector = document.getElementById('sub-sector').value;
  const paymentMethod = document.getElementById('sub-payment').value;

  if (!merchant || isNaN(amount) || amount <= 0) {
    showToast('Preencha a descrição e o valor do gasto recorrente.', 'danger');
    return;
  }

  const newSub = {
    id: 'sub_' + Date.now(),
    merchant,
    amount,
    day: Math.min(28, Math.max(1, day)),
    sector,
    paymentMethod,
    active: true
  };

  appState.subscriptions.push(newSub);
  ensureRecurringTransactionsForMonth(appState.currentMonth);
  saveState();
  renderAll();
  e.target.reset();
  showToast(`Gasto fixo "${merchant}" cadastrado e lançado no mês!`);
};

window.toggleSubscriptionActive = function(subId) {
  const sub = appState.subscriptions.find(s => s.id === subId);
  if (!sub) return;
  sub.active = !sub.active;
  saveState();
  renderAll();
};

window.deleteSubscription = function(subId) {
  appState.subscriptions = appState.subscriptions.filter(s => s.id !== subId);
  // Remove também o lançamento automático do mês atual se existir
  const recTxId = `rec_${subId}_${appState.currentMonth}`;
  appState.transactions = appState.transactions.filter(t => t.id !== recTxId);
  saveState();
  renderAll();
  showToast('Assinatura removida.', 'info');
};

/* ==========================================================================
   Exportação para Excel (CSV), Relatório PDF e Backup JSON
   ========================================================================== */

window.exportMonthCSV = function() {
  const txs = getMonthTransactions(appState.currentMonth);
  if (txs.length === 0) {
    showToast('Não há lançamentos neste mês para exportar.', 'warning');
    return;
  }

  const headers = ['Data', 'Hora', 'Setor', 'Estabelecimento', 'Forma de Pagamento', 'Fixo Recorrente', 'Valor (R$)'];
  const rows = txs.map(t => {
    const sec = getSectorMeta(t.sector);
    return [
      formatDateBR(t.date),
      t.time || '',
      sec.name,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.paymentMethod || 'PIX',
      t.isRecurring ? 'Sim' : 'Não',
      Number(t.amount || 0).toFixed(2).replace('.', ',')
    ].join(';');
  });

  // BOM UTF-8 para o Microsoft Excel abrir acentos e colunas em Português perfeitamente
  const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `GodoyFin_Relatorio_${appState.currentMonth}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Planilha Excel (CSV) exportada com sucesso!');
};

window.exportPDFReport = function() {
  // Expande todas as tabelas antes de imprimir/salvar PDF
  Object.keys(appState.tableFilters).forEach(k => {
    appState.tableFilters[k].collapsed = false;
  });
  appState.activeSectorFilter = 'all';
  renderAll();
  setTimeout(() => {
    window.print();
  }, 250);
};

window.exportBackupJSON = function() {
  const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GodoyFin_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup completo salvo com sucesso!');
};

window.importBackupJSON = function(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported && Array.isArray(imported.transactions)) {
        appState = { ...appState, ...imported };
        saveState();
        renderAll();
        showToast('Backup restaurado com sucesso!');
      } else {
        showToast('Arquivo de backup inválido.', 'danger');
      }
    } catch (err) {
      showToast('Erro ao ler arquivo de backup.', 'danger');
    }
  };
  reader.readAsText(file);
};

window.openSettingsModal = function() {
  const currentKey = localStorage.getItem('godoyfin_gemini_api_key') || '';
  document.getElementById('settings-gemini-key').value = currentKey;
  document.getElementById('settings-modal').classList.remove('hidden');
};

window.saveSettingsModal = function(e) {
  if (e) e.preventDefault();
  const keyVal = document.getElementById('settings-gemini-key').value.trim();
  localStorage.setItem('godoyfin_gemini_api_key', keyVal);
  document.getElementById('settings-modal').classList.add('hidden');
  showToast('Configurações de OCR & IA salvas!');
};

window.resetDemoData = function() {
  localStorage.removeItem(STORAGE_KEY);
  loadState();
  renderAll();
  document.getElementById('settings-modal').classList.add('hidden');
  showToast('Dados de demonstração restaurados!');
};

/* ==========================================================================
   Eventos de Drag & Drop, Upload de Arquivo e Colar Print (Ctrl+V)
   ========================================================================== */

function setupUploadAndPasteListeners() {
  const fileInput = document.getElementById('receipt-file-input');
  const dropzone = document.getElementById('receipt-dropzone');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
      fileInput.value = '';
    });
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
      } else {
        showToast('Envie um arquivo de imagem válido (PNG, JPG, WEBP).', 'warning');
      }
    });
  }

  // Suporte global a Ctrl+V (colar print direto da área de transferência em qualquer lugar do app!)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          document.getElementById('scan-modal').classList.remove('hidden');
          handleImageFile(file);
          showToast('Print colado da área de transferência! Lendo dados...', 'info');
          break;
        }
      }
    }
  });
}

function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    processUploadedImageDataUrl(ev.target.result);
  };
  reader.readAsDataURL(file);
}

/* ==========================================================================
   Bootstrap Inicial
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupUploadAndPasteListeners();
  renderAll();
});
