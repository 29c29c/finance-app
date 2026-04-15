async function getDashboardData(db, userId, month) {
  const [subscriptions, serials, ledger, budgetRow] = await Promise.all([
    db.all('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC', [userId]),
    db.all('SELECT * FROM serials WHERE user_id = ? ORDER BY expected_release_date DESC, id DESC', [userId]),
    db.all(
      'SELECT * FROM ledger_items WHERE user_id = ? AND strftime("%Y-%m", date) = ? ORDER BY date DESC, id DESC',
      [userId, month],
    ),
    db.get('SELECT budget_amount FROM monthly_budgets WHERE user_id = ? AND month_str = ?', [userId, month]),
  ]);

  return {
    subscriptions,
    serials,
    ledger,
    budget: budgetRow ? budgetRow.budget_amount : 0,
  };
}

async function getSubscriptionsByUserId(db, userId) {
  return db.all('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC', [userId]);
}

async function getExportData(db, userId) {
  const [subscriptions, serials, ledgerItems, budgets] = await Promise.all([
    db.all('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC', [userId]),
    db.all('SELECT * FROM serials WHERE user_id = ? ORDER BY id DESC', [userId]),
    db.all('SELECT * FROM ledger_items WHERE user_id = ? ORDER BY date DESC, id DESC', [userId]),
    db.all('SELECT * FROM monthly_budgets WHERE user_id = ? ORDER BY month_str DESC', [userId]),
  ]);

  return {
    export_date: new Date().toISOString(),
    subscriptions,
    serials,
    ledger_items: ledgerItems,
    budgets,
  };
}

async function getLedgerItemById(db, id, userId) {
  return db.get('SELECT * FROM ledger_items WHERE id = ? AND user_id = ?', [id, userId]);
}

async function getAutoSubscriptionLedgerForMonth(db, userId, month) {
  return db.all(
    `SELECT * FROM ledger_items
     WHERE user_id = ? AND source_type = 'subscription' AND source_period = ?
     ORDER BY id DESC`,
    [userId, month],
  );
}

async function insertScopedRecord(db, table, fields, values, userId) {
  const placeholders = fields.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (user_id, ${fields.join(', ')}) VALUES (?, ${placeholders})`;
  return db.run(sql, [userId, ...values]);
}

async function updateScopedRecord(db, table, fields, values, id, userId) {
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  const sql = `UPDATE ${table} SET ${assignments} WHERE id = ? AND user_id = ?`;
  return db.run(sql, [...values, id, userId]);
}

async function deleteScopedRecord(db, table, id, userId) {
  return db.run(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
}

async function upsertBudget(db, userId, month, amount) {
  return db.run(
    `INSERT INTO monthly_budgets (user_id, month_str, budget_amount) VALUES (?, ?, ?)
     ON CONFLICT(user_id, month_str) DO UPDATE SET budget_amount = excluded.budget_amount`,
    [userId, month, amount],
  );
}

async function getSerialById(db, id, userId) {
  return db.get('SELECT * FROM serials WHERE id = ? AND user_id = ?', [id, userId]);
}

async function insertLedgerItem(db, userId, item) {
  return db.run(
    `INSERT INTO ledger_items (user_id, date, category, name, amount, source_type, source_id, source_period)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      item.date,
      item.category,
      item.name,
      item.amount,
      item.source_type || null,
      item.source_id || null,
      item.source_period || null,
    ],
  );
}

async function updateLedgerItemById(db, id, userId, item) {
  return db.run(
    `UPDATE ledger_items
     SET date = ?, category = ?, name = ?, amount = ?, source_type = ?, source_id = ?, source_period = ?
     WHERE id = ? AND user_id = ?`,
    [
      item.date,
      item.category,
      item.name,
      item.amount,
      item.source_type || null,
      item.source_id || null,
      item.source_period || null,
      id,
      userId,
    ],
  );
}

async function updateSerialAfterAdvance(db, userId, serialId, next) {
  return db.run(
    `UPDATE serials
     SET name = ?, price = ?, expected_release_date = ?, status = 'planned'
     WHERE id = ? AND user_id = ?`,
    [next.name, next.price, next.date, serialId, userId],
  );
}

module.exports = {
  getDashboardData,
  getSubscriptionsByUserId,
  getExportData,
  getLedgerItemById,
  getAutoSubscriptionLedgerForMonth,
  insertScopedRecord,
  updateScopedRecord,
  deleteScopedRecord,
  upsertBudget,
  getSerialById,
  insertLedgerItem,
  updateLedgerItemById,
  updateSerialAfterAdvance,
};
