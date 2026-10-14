const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = { window: { FinanceUI: {} }, Intl, Date };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/assets/utils.js'), 'utf8'), context);
const ui = context.window.FinanceUI;
const plain = value => JSON.parse(JSON.stringify(value));

test('CSV handles exported BOM, quoted commas, escaped quotes, CRLF and Chinese categories', () => {
  assert.deepEqual(plain(ui.parseLedgerCSV('\uFEFFDate,Category,Name,Amount\r\n"2026-10-14","food","咖啡,加奶",12.50\r\n2026-10-13,交通,"公交 ""通勤""",2')), [
    { date: '2026-10-14', category: 'food', name: '咖啡,加奶', amount: 12.5 },
    { date: '2026-10-13', category: 'transport', name: '公交 "通勤"', amount: 2 },
  ]);
});

test('CSV rejects invalid rows atomically instead of silently skipping them', () => {
  for (const input of ['', '2026-02-30,food,午餐,12', '2026-10-14,unknown,午餐,12', '2026-10-14,food,午餐,-1', '2026-10-14,food,午餐,', '2026-10-14,food,"午餐,12', '2026-10-14,food,午餐,12,extra']) {
    assert.throws(() => ui.parseLedgerCSV(input));
  }
  assert.throws(() => ui.parseLedgerCSV(Array(501).fill('2026-10-14,food,午餐,12').join('\n')));
});

test('plan totals preserve monthly amortization and exclude paused or paid plans', () => {
  const result = ui.planSummary([
    { id: 1, price: 30, is_active: 1, cycle_type: 'monthly', first_payment_date: '2026-10-01' },
    { id: 2, price: 90, is_active: 1, cycle_type: 'quarterly', first_payment_date: '2026-10-01' },
    { id: 3, price: 240, is_active: 1, cycle_type: 'yearly', first_payment_date: '2025-10-14' },
    { id: 4, price: 999, is_active: 0, cycle_type: 'monthly' },
  ], [
    { price: 45, status: 'planned', expected_release_date: '2026-10' },
    { price: 70, status: 'paid', expected_release_date: '2026-10' },
    { price: 80, status: 'planned', expected_release_date: '2026-11' },
  ], '2026-10');
  assert.equal(result.subscriptionCost, 80);
  assert.equal(result.serialCost, 45);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].id, 3);
});

test('month shifts and renewal dates handle year boundaries, leap years and month ends', () => {
  assert.equal(ui.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(ui.shiftMonth('2026-01', -1), '2025-12');
  assert.equal(ui.renewalInMonth({ first_payment_date: '2026-01-31' }, '2026-02'), '2026-02-28');
  assert.equal(ui.renewalInMonth({ first_payment_date: '2024-01-31' }, '2024-02'), '2024-02-29');
});

test('ranking aggregates by both name and category without mutating ledger records', () => {
  const items = [{ name: '午餐', category: 'food', amount: 12 }, { name: '午餐', category: 'food', amount: 18 }, { name: '午餐', category: 'shopping', amount: 5 }];
  const before = JSON.stringify(items);
  const rankings = ui.buildNameRanking(items);
  assert.equal(rankings.length, 2);
  assert.equal(rankings[0].total, 30);
  assert.equal(rankings[0].count, 2);
  assert.equal(JSON.stringify(items), before);
});

test('CSV export neutralizes formulas and escapes quotes', () => {
  assert.equal(ui.escapeCsvValue('=1+1'), '"\'=1+1"');
  assert.equal(ui.escapeCsvValue('咖啡,"加奶"'), '"咖啡,""加奶"""');
});
