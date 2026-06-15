const STORAGE_KEY = 'finance-dashboard-state-v1';
const INITIAL_ASSETS = 2400000;
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });

function createId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const sampleState = {
  incomes: [
    { id: createId(), source: '給与', date: '2026-06-25', category: '本業', amount: 360000 },
    { id: createId(), source: '配当金', date: '2026-06-10', category: '投資', amount: 12500 },
    { id: createId(), source: '副業デザイン', date: '2026-06-08', category: '副業', amount: 68000 },
  ],
  expenses: [
    { id: createId(), name: '家賃', category: '住居', date: '2026-06-01', amount: 118000, deductible: false },
    { id: createId(), name: '食費', category: '生活費', date: '2026-06-14', amount: 56500, deductible: false },
    { id: createId(), name: '会計ソフト', category: '業務ツール', date: '2026-06-05', amount: 32780, deductible: true },
    { id: createId(), name: 'ガソリン', category: '車両費', date: '2026-06-12', amount: 9400, deductible: true },
  ],
  uberIncome: [
    { id: createId(), date: '2026-05-20', week: '5/20週', deliveries: 38, gross: 54200, tips: 4300, fees: 6800 },
    { id: createId(), date: '2026-05-27', week: '5/27週', deliveries: 31, gross: 46800, tips: 3900, fees: 5800 },
    { id: createId(), date: '2026-06-03', week: '6/03週', deliveries: 44, gross: 62400, tips: 5100, fees: 7800 },
    { id: createId(), date: '2026-06-10', week: '6/10週', deliveries: 29, gross: 39700, tips: 2800, fees: 4900 },
  ],
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleState);

  try {
    return normalizeState({ ...structuredClone(sampleState), ...JSON.parse(saved) });
  } catch {
    return structuredClone(sampleState);
  }
}

function normalizeState(nextState) {
  return {
    incomes: nextState.incomes.map((item) => ({ ...item, id: item.id || createId() })),
    expenses: nextState.expenses.map((item) => ({ ...item, id: item.id || createId(), deductible: Boolean(item.deductible) })),
    uberIncome: nextState.uberIncome.map((item) => ({ ...item, id: item.id || createId(), date: item.date || '2026-06-01' })),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sum(items, key = 'amount') {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function uberNet(item) {
  return Number(item.gross || 0) + Number(item.tips || 0) - Number(item.fees || 0);
}

function monthKey(date) {
  return date.slice(0, 7);
}

function getAssetHistory() {
  const monthly = new Map();

  state.incomes.forEach((income) => {
    const key = monthKey(income.date);
    monthly.set(key, (monthly.get(key) || 0) + income.amount);
  });
  state.expenses.forEach((expense) => {
    const key = monthKey(expense.date);
    monthly.set(key, (monthly.get(key) || 0) - expense.amount);
  });
  state.uberIncome.forEach((uber) => {
    const key = monthKey(uber.date);
    monthly.set(key, (monthly.get(key) || 0) + uberNet(uber));
  });

  let assets = INITIAL_ASSETS;
  return [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, net]) => {
    assets += net;
    return { month, assets };
  });
}

function renderStats(assetHistory, taxExpenses) {
  const totalUberNet = state.uberIncome.reduce((total, item) => total + uberNet(item), 0);
  const currentAssets = assetHistory.at(-1)?.assets || INITIAL_ASSETS;
  const stats = [
    ['↗', '収入合計', yen.format(sum(state.incomes)), 'green'],
    ['↘', '支出合計', yen.format(sum(state.expenses)), 'red'],
    ['🚲', 'Uber純収入', yen.format(totalUberNet), 'blue'],
    ['🏦', '現在の資産', yen.format(currentAssets), 'purple'],
    ['🧾', '申告対象経費', yen.format(sum(taxExpenses)), 'amber'],
  ];
  document.querySelector('#stats').innerHTML = stats.map(([icon, label, value, tone]) => `
    <article class="stat-card ${tone}"><div class="stat-icon">${icon}</div><span>${label}</span><strong>${value}</strong></article>
  `).join('');
}

function renderTable(selector, rows, amountTone, columns) {
  document.querySelector(selector).innerHTML = `
    <table>
      <thead><tr>${columns.map((column) => `<th>${column.label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `
        <tr>${columns.map((column) => `<td class="${column.tone || ''}">${column.render(row)}</td>`).join('')}</tr>
      `).join('') || `<tr><td colspan="${columns.length}" class="empty-cell">まだデータがありません</td></tr>`}</tbody>
    </table>`;
}

function lineChart(data, key, labelKey, stroke) {
  if (data.length === 0) return '<p class="empty-cell">データを追加するとグラフが表示されます。</p>';
  const width = 760;
  const height = 260;
  const pad = 34;
  const values = data.map((item) => item[key]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (data.length - 1);
    const y = height - pad - ((item[key] - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${key} chart">
    <polyline class="grid-line" points="${pad},${height - pad} ${width - pad},${height - pad}" />
    <polyline class="chart-line" style="stroke:${stroke}" points="${points}" />
    ${data.map((item, index) => `<text x="${data.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (data.length - 1)}" y="${height - 8}" text-anchor="middle">${item[labelKey]}</text>`).join('')}
  </svg>`;
}

function render() {
  const taxExpenses = state.expenses.filter((expense) => expense.deductible);
  const assetHistory = getAssetHistory();

  renderStats(assetHistory, taxExpenses);
  renderTable('#income-table', state.incomes, 'positive', [
    { label: '日付', render: (row) => row.date },
    { label: '内容', render: (row) => row.source },
    { label: 'カテゴリ', render: (row) => `<span class="pill">${row.category}</span>` },
    { label: '金額', tone: 'positive', render: (row) => yen.format(row.amount) },
  ]);
  renderTable('#expense-table', state.expenses, 'negative', [
    { label: '日付', render: (row) => row.date },
    { label: '内容', render: (row) => row.name },
    { label: 'カテゴリ', render: (row) => `<span class="pill">${row.category}</span>` },
    { label: '金額', tone: 'negative', render: (row) => yen.format(row.amount) },
  ]);
  renderTable('#tax-table', taxExpenses, 'negative', [
    { label: '日付', render: (row) => row.date },
    { label: '内容', render: (row) => row.name },
    { label: 'カテゴリ', render: (row) => `<span class="pill">${row.category}</span>` },
    { label: '金額', tone: 'negative', render: (row) => yen.format(row.amount) },
  ]);
  renderTable('#uber-table', state.uberIncome, 'positive', [
    { label: '日付', render: (row) => row.date },
    { label: '週', render: (row) => row.week },
    { label: '件数', render: (row) => `${row.deliveries}件` },
    { label: '純収入', tone: 'positive', render: (row) => yen.format(uberNet(row)) },
  ]);

  document.querySelector('#asset-chart').innerHTML = lineChart(assetHistory, 'assets', 'month', '#2563eb');
  document.querySelector('#uber-chart').innerHTML = lineChart(state.uberIncome.map((item) => ({ ...item, net: uberNet(item) })), 'net', 'week', '#0891b2');
  document.querySelector('#average-delivery').textContent = state.uberIncome.length ? yen.format(sum(state.uberIncome, 'gross') / sum(state.uberIncome, 'deliveries')) : yen.format(0);
  document.querySelector('#annual-deduction').textContent = yen.format(sum(taxExpenses) * 12);
}

function toNumber(formData, key) {
  return Number(formData.get(key) || 0);
}

function wireForms() {
  document.querySelector('#income-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.incomes.push({ id: createId(), date: data.get('date'), source: data.get('source'), category: data.get('category'), amount: toNumber(data, 'amount') });
    saveState();
    event.currentTarget.reset();
    render();
  });

  document.querySelector('#expense-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.expenses.push({ id: createId(), date: data.get('date'), name: data.get('name'), category: data.get('category'), amount: toNumber(data, 'amount'), deductible: data.get('deductible') === 'on' });
    saveState();
    event.currentTarget.reset();
    render();
  });

  document.querySelector('#uber-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.uberIncome.push({ id: createId(), date: data.get('date'), week: data.get('week'), deliveries: toNumber(data, 'deliveries'), gross: toNumber(data, 'gross'), tips: toNumber(data, 'tips'), fees: toNumber(data, 'fees') });
    saveState();
    event.currentTarget.reset();
    render();
  });

  document.querySelector('#reset-data').addEventListener('click', () => {
    state = structuredClone(sampleState);
    saveState();
    render();
  });
}

wireForms();
render();
