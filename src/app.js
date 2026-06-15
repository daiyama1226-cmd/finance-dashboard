const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });

const incomes = [
  { source: '給与', date: '2026-06-25', category: '本業', amount: 360000 },
  { source: '配当金', date: '2026-06-10', category: '投資', amount: 12500 },
  { source: '副業デザイン', date: '2026-06-08', category: '副業', amount: 68000 },
];
const expenses = [
  { name: '家賃', category: '住居', date: '2026-06-01', amount: 118000, deductible: false },
  { name: '食費', category: '生活費', date: '2026-06-14', amount: 56500, deductible: false },
  { name: '会計ソフト', category: '業務ツール', date: '2026-06-05', amount: 32780, deductible: true },
  { name: 'ガソリン', category: '車両費', date: '2026-06-12', amount: 9400, deductible: true },
];
const uberIncome = [
  { week: '5/20週', deliveries: 38, gross: 54200, tips: 4300, fees: 6800 },
  { week: '5/27週', deliveries: 31, gross: 46800, tips: 3900, fees: 5800 },
  { week: '6/03週', deliveries: 44, gross: 62400, tips: 5100, fees: 7800 },
  { week: '6/10週', deliveries: 29, gross: 39700, tips: 2800, fees: 4900 },
];
const assetHistory = [
  { month: '1月', assets: 2420000, investments: 1600000 },
  { month: '2月', assets: 2510000, investments: 1720000 },
  { month: '3月', assets: 2660000, investments: 1800000 },
  { month: '4月', assets: 2740000, investments: 1910000 },
  { month: '5月', assets: 2890000, investments: 1980000 },
  { month: '6月', assets: 3040000, investments: 2080000 },
];

const sum = (items, key = 'amount') => items.reduce((total, item) => total + item[key], 0);
const taxExpenses = expenses.filter((expense) => expense.deductible);

function renderStats() {
  const uberNet = uberIncome.reduce((total, item) => total + item.gross + item.tips - item.fees, 0);
  const stats = [
    ['↗', '今月の収入', yen.format(sum(incomes)), 'green'],
    ['↘', '今月の支出', yen.format(sum(expenses)), 'red'],
    ['🚲', 'Uber純収入', yen.format(uberNet), 'blue'],
    ['🏦', '現在の資産', yen.format(assetHistory.at(-1).assets), 'purple'],
    ['🧾', '申告対象経費', yen.format(sum(taxExpenses)), 'amber'],
  ];
  document.querySelector('#stats').innerHTML = stats.map(([icon, label, value, tone]) => `
    <article class="stat-card ${tone}"><div class="stat-icon">${icon}</div><span>${label}</span><strong>${value}</strong></article>
  `).join('');
}

function renderTable(selector, rows, amountTone) {
  document.querySelector(selector).innerHTML = `
    <table>
      <thead><tr><th>日付</th><th>内容</th><th>カテゴリ</th><th>金額</th></tr></thead>
      <tbody>${rows.map((row) => `
        <tr><td>${row.date}</td><td>${row.name ?? row.source}</td><td><span class="pill">${row.category}</span></td><td class="${amountTone}">${yen.format(row.amount)}</td></tr>
      `).join('')}</tbody>
    </table>`;
}

function lineChart(data, key, labelKey, stroke) {
  const width = 760;
  const height = 260;
  const pad = 34;
  const max = Math.max(...data.map((item) => item[key]));
  const min = Math.min(...data.map((item) => item[key]));
  const points = data.map((item, index) => {
    const x = pad + (index * (width - pad * 2)) / (data.length - 1);
    const y = height - pad - ((item[key] - min) / (max - min)) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${key} chart">
    <polyline class="grid-line" points="${pad},${height - pad} ${width - pad},${height - pad}" />
    <polyline class="chart-line" style="stroke:${stroke}" points="${points}" />
    ${data.map((item, index) => `<text x="${pad + (index * (width - pad * 2)) / (data.length - 1)}" y="${height - 8}" text-anchor="middle">${item[labelKey]}</text>`).join('')}
  </svg>`;
}

renderStats();
renderTable('#income-table', incomes, 'positive');
renderTable('#expense-table', expenses, 'negative');
renderTable('#tax-table', taxExpenses, 'negative');
document.querySelector('#asset-chart').innerHTML = lineChart(assetHistory, 'assets', 'month', '#2563eb');
document.querySelector('#uber-chart').innerHTML = lineChart(uberIncome, 'gross', 'week', '#0891b2');
document.querySelector('#average-delivery').textContent = yen.format(sum(uberIncome, 'gross') / sum(uberIncome, 'deliveries'));
document.querySelector('#annual-deduction').textContent = yen.format(sum(taxExpenses) * 12);
