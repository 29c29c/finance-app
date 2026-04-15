import { CATEGORIES } from './constants.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatMoney(value, digits = 2) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(digits) : '0.00';
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function nextMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 7);
}

export function getNextName(name) {
  const match = String(name).match(/(\d+)(?!.*\d)/);
  if (!match) {
    return `${name} 下一期`;
  }

  const number = Number.parseInt(match[0], 10);
  return String(name).replace(/(\d+)(?!.*\d)/, String(number + 1));
}

export function groupLedgerByDate(items) {
  const groups = new Map();

  items.forEach((item) => {
    if (!groups.has(item.date)) {
      groups.set(item.date, []);
    }

    groups.get(item.date).push(item);
  });

  return [...groups.entries()].sort((left, right) => right[0].localeCompare(left[0]));
}

export function buildStats(data, selectedMonth) {
  const warnings = [];
  let subscriptionCost = 0;

  data.subscriptions.forEach((subscription) => {
    let price = Number(subscription.price) || 0;

    if (subscription.cycle_type === 'yearly') {
      price /= 12;
      const paymentMonth = String(subscription.first_payment_date || '').slice(5, 7);
      const current = selectedMonth.slice(5, 7);
      if (paymentMonth && paymentMonth === current) {
        warnings.push(subscription);
      }
    } else if (subscription.cycle_type === 'quarterly') {
      price /= 3;
    }

    subscriptionCost += price;
  });

  const planned = data.serials
    .filter((serial) => serial.expected_release_date === selectedMonth && serial.status !== 'paid')
    .reduce((sum, serial) => sum + (Number(serial.price) || 0), 0);

  const actual = data.ledger.reduce((summary, item) => {
    const category = item.category in CATEGORIES ? item.category : 'shopping';
    const amount = Number(item.amount) || 0;
    summary.total += amount;
    summary.breakdown[category] = (summary.breakdown[category] || 0) + amount;
    return summary;
  }, {
    total: 0,
    breakdown: {
      shopping: 0,
      food: 0,
      transport: 0,
      subscription: 0,
    },
  });

  return { warnings, subscriptionCost, planned, actual };
}

export function toCsvCell(value) {
  const raw = String(value ?? '');
  const dangerous = /^[=+\-@]/.test(raw) || raw.startsWith('\t');
  const sanitized = dangerous ? `'${raw}` : raw;
  return `"${sanitized.replaceAll('"', '""')}"`;
}
