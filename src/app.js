const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
const STORAGE_KEY = 'finance-dashboard-cashflow-v2';

const initialData = {
  monthlyRecords: [
    { month: '2026-01', cashIn: 420000, uberIncome: 32000, consumption: 184000, waste: 42000, investment: 68000, assets: 2420000, liabilities: 720000, cashInForecast: 450000, cashOutForecast: 300000 },
    { month: '2026-02', cashIn: 438000, uberIncome: 36000, consumption: 176000, waste: 38000, investment: 72000, assets: 2510000, liabilities: 695000, cashInForecast: 460000, cashOutForecast: 292000 },
    { month: '2026-03', cashIn: 455000, uberIncome: 41000, consumption: 181000, waste: 50000, investment: 85000, assets: 2660000, liabilities: 670000, cashInForecast: 470000, cashOutForecast: 310000 },
    { month: '2026-04', cashIn: 448000, uberIncome: 28000, consumption: 174000, waste: 36000, investment: 76000, assets: 2740000, liabilities: 645000, cashInForecast: 468000, cashOutForecast: 298000 },
    { month: '2026-05', cashIn: 472000, uberIncome: 39000, consumption: 188000, waste: 45000, investment: 90000, assets: 2890000, liabilities: 620000, cashInForecast: 486000, cashOutForecast: 318000 },
    { month: '2026-06', cashIn: 458000, uberIncome: 44000, consumption: 180000, waste: 39000, investment: 84000, assets: 3040000, liabilities: 595000, cashInForecast: 492000, cashOutForecast: 308000 },
  ],
  fixedCosts: [
    { name: '家賃', category: '住居', amount: 118000 },
    { name: '奨学金', category: '返済', amount: 22000 },
    { name: 'サブスク', category: 'サービス', amount: 6800 },
    { name: 'Wi-Fi', category: '通信', amount: 5200 },
    { name: '電気', category: '光熱費', amount: 9400 },
    { name: 'ガス', category: '光熱費', amount: 6100 },
    { name: '水道', category: '光熱費', amount: 4200 },
    { name: '生命保険', category: '保険', amount: 12500 },
    { name: '食費', category: '生活費', amount: 56500 },
    { name: 'その他固定費', category: 'その他', amount: 18000 },
  ],
};

const cloneInitialData = () => JSON.parse(JSON.stringify(initialData));

function normalizeRecord(record) {
  const consumption = Number(record.consumption ?? record.amount ?? 0);
  const waste = Number(record.waste ?? 0);
  const investment = Number(record.investment ?? record.investments ?? 0);
  const cashIn = Number(record.cashIn ?? record.amount ?? 0);
  const uberIncome = Number(record.uberIncome ?? 0);
  const liabilities = Number(record.liabilities ?? 0);
  const assets = Number(record.assets ?? 0);
  const cashOut = consumption + waste + investment;

  return {
    month: record.month ?? record.date?.slice(0, 7) ?? '2026-06',
    cashIn,
    uberIncome,
    consumption,
    waste,
    investment,
    assets,
    liabilities,
    cashInForecast: Number(record.cashInForecast ?? cashIn),
    cashOutForecast: Number(record.cashOutForecast ?? cashOut),
  };
}

function migrateLegacyData(savedData) {
  if (Array.isArray(savedData.monthlyRecords)) {
    return {
      monthlyRecords: savedData.monthlyRecords.map(normalizeRecord),
      fixedCosts: Array.isArray(savedData.fixedCosts) ? savedData.fixedCosts : cloneInitialData().fixedCosts,
    };
  }

  return cloneInitialData();
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneInitialData();

  return migrateLegacyData(JSON.parse(saved));
}

let { monthlyRecords, fixedCosts } = loadData();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ monthlyRecords, fixedCosts }));
}

const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);
const cashOut = (record) => Number(record.consumption || 0) + Number(record.waste || 0) + Number(record.investment || 0);
const totalCashIn = (record) => Number(record.cashIn || 0) + Number(record.uberIncome || 0);
const netWorth = (record) => Number(record.assets || 0) - Number(record.liabilities || 0);
const netWorthForecast = (record) => netWorth(record) + Number(record.cashInForecast || 0) - Number(record.cashOutForecast || 0);
const totalAssetsForecast = (record) => Number(record.assets || 0) + Math.max(0, Number(record.cashInForecast || 0) - Number(record.cashOutForecast || 0));
const sortedRecords = () => [...monthlyRecords].sort((a, b) => a.month.localeCompare(b.month));
const numericFormValue = (form, name) => Number(new FormData(form).get(name) || 0);
const formatMonth = (value) => value.replace('-', '/');

function renderSummary(records) {
  const latest = records.at(-1);
  const cards = [
    ['↗', 'cash in（収入）', yen.format(totalCashIn(latest)), 'green'],
    ['↘', 'cash out（支出）', yen.format(cashOut(latest)), 'red'],
    ['🏦', 'assets（資産）', yen.format(latest.assets), 'blue'],
    ['💳', 'liabilities（負債）', yen.format(latest.liabilities), 'amber'],
    ['💎', 'net worth（純資産）', yen.format(netWorth(latest)), 'purple'],
    ['🧾', 'spending（支出合計）', yen.format(cashOut(latest)), 'red'],
    ['🔮', 'cash in forecast', yen.format(latest.cashInForecast), 'green'],
    ['📉', 'cash out forecast', yen.format(latest.cashOutForecast), 'amber'],
    ['📈', 'net worth forecast', yen.format(netWorthForecast(latest)), 'purple'],
    ['🏗', 'total assets forecast', yen.format(totalAssetsForecast(latest)), 'blue'],
  ];

  document.querySelector('#monthly-summary').innerHTML = cards.map(([icon, label, value, tone]) => `
    <article class="stat-card ${tone}"><div class="stat-icon">${icon}</div><span>${label}</span><strong>${value}</strong></article>
  `).join('');
}

function lineChart(series, keys) {
  const width = 900;
  const height = 280;
  const pad = 38;
  const values = series.flatMap((item) => keys.map(({ key }) => Number(item[key] ?? item.valueMap?.[key] ?? 0)));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const divisor = series.length > 1 ? series.length - 1 : 1;
  const toPoint = (item, index, key) => {
    const value = Number(item[key] ?? item.valueMap?.[key] ?? 0);
    const x = pad + (index * (width - pad * 2)) / divisor;
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  };

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="monthly trend chart">
    <polyline class="grid-line" points="${pad},${height - pad} ${width - pad},${height - pad}" />
    ${keys.map(({ key, color }) => `<polyline class="chart-line" style="stroke:${color}" points="${series.map((item, index) => toPoint(item, index, key)).join(' ')}" />`).join('')}
    ${series.map((item, index) => `<text x="${pad + (index * (width - pad * 2)) / divisor}" y="${height - 8}" text-anchor="middle">${formatMonth(item.month)}</text>`).join('')}
  </svg>`;
}

function renderCashflowTable(records) {
  document.querySelector('#cashflow-table').innerHTML = `
    <table>
      <thead><tr><th>月</th><th>cash in</th><th>cash out</th><th>消費</th><th>浪費</th><th>投資</th><th>assets</th><th>liabilities</th><th>net worth</th></tr></thead>
      <tbody>${records.map((record) => `
        <tr><td>${formatMonth(record.month)}</td><td class="positive">${yen.format(totalCashIn(record))}</td><td class="negative">${yen.format(cashOut(record))}</td><td>${yen.format(record.consumption)}</td><td>${yen.format(record.waste)}</td><td>${yen.format(record.investment)}</td><td>${yen.format(record.assets)}</td><td>${yen.format(record.liabilities)}</td><td class="positive">${yen.format(netWorth(record))}</td></tr>
      `).join('')}</tbody>
    </table>`;
}

function renderFixedCosts() {
  document.querySelector('#fixed-cost-table').innerHTML = `
    <table>
      <thead><tr><th>項目</th><th>カテゴリ</th><th>月額</th></tr></thead>
      <tbody>${fixedCosts.map((cost) => `
        <tr><td>${cost.name}</td><td><span class="pill">${cost.category}</span></td><td class="negative">${yen.format(cost.amount)}</td></tr>
      `).join('')}</tbody>
      <tfoot><tr><th colspan="2">固定費合計</th><th>${yen.format(sum(fixedCosts, 'amount'))}</th></tr></tfoot>
    </table>`;
}

function renderPie(record) {
  const total = cashOut(record) || 1;
  const slices = [
    { label: '消費', value: record.consumption, color: '#2563eb' },
    { label: '浪費', value: record.waste, color: '#f97316' },
    { label: '投資', value: record.investment, color: '#16a34a' },
  ];
  let accumulated = 0;
  const gradient = slices.map((slice) => {
    const start = accumulated;
    const end = accumulated + (slice.value / total) * 100;
    accumulated = end;
    return `${slice.color} ${start}% ${end}%`;
  }).join(', ');

  document.querySelector('#spending-pie').innerHTML = `
    <div class="pie" style="background: conic-gradient(${gradient});"></div>
    <div class="legend">${slices.map((slice) => `<div><span style="background:${slice.color}"></span><strong>${slice.label}</strong><em>${yen.format(slice.value)}</em></div>`).join('')}</div>
  `;
}

function renderForecastTable(records) {
  document.querySelector('#forecast-table').innerHTML = `
    <table>
      <thead><tr><th>月</th><th>cash in forecast</th><th>cash out forecast</th><th>forecast balance</th><th>net worth forecast</th><th>total assets forecast</th></tr></thead>
      <tbody>${records.map((record) => `
        <tr><td>${formatMonth(record.month)}</td><td class="positive">${yen.format(record.cashInForecast)}</td><td class="negative">${yen.format(record.cashOutForecast)}</td><td>${yen.format(record.cashInForecast - record.cashOutForecast)}</td><td class="positive">${yen.format(netWorthForecast(record))}</td><td>${yen.format(totalAssetsForecast(record))}</td></tr>
      `).join('')}</tbody>
    </table>`;
}

function render() {
  monthlyRecords = sortedRecords();
  const latest = monthlyRecords.at(-1);
  const netWorthSeries = monthlyRecords.map((record) => ({
    month: record.month,
    valueMap: {
      netWorth: netWorth(record),
      netWorthForecast: netWorthForecast(record),
    },
  }));

  renderSummary(monthlyRecords);
  renderCashflowTable(monthlyRecords);
  renderFixedCosts();
  renderPie(latest);
  renderForecastTable(monthlyRecords);
  document.querySelector('#asset-chart').innerHTML = lineChart(monthlyRecords, [
    { key: 'assets', color: '#2563eb' },
    { key: 'liabilities', color: '#f97316' },
  ]);
  document.querySelector('#net-worth-chart').innerHTML = lineChart(netWorthSeries, [
    { key: 'netWorth', color: '#16a34a' },
    { key: 'netWorthForecast', color: '#7c3aed' },
  ]);
  saveData();
}

function addSubmitHandler(selector, handler) {
  document.querySelector(selector).addEventListener('submit', (event) => {
    event.preventDefault();
    handler(event.currentTarget);
    event.currentTarget.reset();
    render();
  });
}

addSubmitHandler('#cashflow-form', (form) => {
  const formData = new FormData(form);
  const nextRecord = normalizeRecord({
    month: formData.get('month'),
    cashIn: numericFormValue(form, 'cashIn'),
    uberIncome: numericFormValue(form, 'uberIncome'),
    consumption: numericFormValue(form, 'consumption'),
    waste: numericFormValue(form, 'waste'),
    investment: numericFormValue(form, 'investment'),
    assets: numericFormValue(form, 'assets'),
    liabilities: numericFormValue(form, 'liabilities'),
    cashInForecast: numericFormValue(form, 'cashInForecast'),
    cashOutForecast: numericFormValue(form, 'cashOutForecast'),
  });

  monthlyRecords = [
    ...monthlyRecords.filter((record) => record.month !== nextRecord.month),
    nextRecord,
  ];
});

addSubmitHandler('#fixed-cost-form', (form) => {
  const formData = new FormData(form);
  fixedCosts = [
    ...fixedCosts,
    {
      name: formData.get('name'),
      category: formData.get('category'),
      amount: numericFormValue(form, 'amount'),
    },
  ];
});

document.querySelector('[data-scroll-target]').addEventListener('click', (event) => {
  document.querySelector(event.currentTarget.dataset.scrollTarget).scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#reset-storage').addEventListener('click', () => {
  ({ monthlyRecords, fixedCosts } = cloneInitialData());
  localStorage.removeItem(STORAGE_KEY);
  render();
});

render();
