const TABLE_DEFINITIONS = [
  {
    name: 'users',
    createSql: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`,
    columns: [
      { name: 'id', definition: 'id INTEGER PRIMARY KEY AUTOINCREMENT', alterable: false },
      { name: 'username', definition: 'username TEXT UNIQUE' },
      { name: 'password', definition: 'password TEXT' },
    ],
  },
  {
    name: 'subscriptions',
    createSql: `CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      price REAL,
      cycle_type TEXT,
      first_payment_date TEXT,
      is_active INTEGER DEFAULT 0
    )`,
    columns: [
      { name: 'id', definition: 'id INTEGER PRIMARY KEY AUTOINCREMENT', alterable: false },
      { name: 'user_id', definition: 'user_id INTEGER' },
      { name: 'name', definition: 'name TEXT' },
      { name: 'price', definition: 'price REAL' },
      { name: 'cycle_type', definition: 'cycle_type TEXT' },
      { name: 'first_payment_date', definition: 'first_payment_date TEXT' },
      { name: 'is_active', definition: 'is_active INTEGER DEFAULT 0' },
    ],
  },
  {
    name: 'serials',
    createSql: `CREATE TABLE IF NOT EXISTS serials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      price REAL,
      status TEXT,
      expected_release_date TEXT
    )`,
    columns: [
      { name: 'id', definition: 'id INTEGER PRIMARY KEY AUTOINCREMENT', alterable: false },
      { name: 'user_id', definition: 'user_id INTEGER' },
      { name: 'name', definition: 'name TEXT' },
      { name: 'price', definition: 'price REAL' },
      { name: 'status', definition: 'status TEXT' },
      { name: 'expected_release_date', definition: 'expected_release_date TEXT' },
    ],
  },
  {
    name: 'ledger_items',
    createSql: `CREATE TABLE IF NOT EXISTS ledger_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT,
      category TEXT,
      name TEXT,
      amount REAL,
      source_type TEXT,
      source_id INTEGER,
      source_period TEXT
    )`,
    columns: [
      { name: 'id', definition: 'id INTEGER PRIMARY KEY AUTOINCREMENT', alterable: false },
      { name: 'user_id', definition: 'user_id INTEGER' },
      { name: 'date', definition: 'date TEXT' },
      { name: 'category', definition: 'category TEXT' },
      { name: 'name', definition: 'name TEXT' },
      { name: 'amount', definition: 'amount REAL' },
      { name: 'source_type', definition: 'source_type TEXT' },
      { name: 'source_id', definition: 'source_id INTEGER' },
      { name: 'source_period', definition: 'source_period TEXT' },
    ],
  },
  {
    name: 'monthly_budgets',
    createSql: `CREATE TABLE IF NOT EXISTS monthly_budgets (
      user_id INTEGER,
      month_str TEXT,
      budget_amount REAL,
      PRIMARY KEY (user_id, month_str)
    )`,
    columns: [
      { name: 'user_id', definition: 'user_id INTEGER', alterable: false },
      { name: 'month_str', definition: 'month_str TEXT', alterable: false },
      { name: 'budget_amount', definition: 'budget_amount REAL' },
    ],
  },
  {
    name: 'user_ai_settings',
    createSql: `CREATE TABLE IF NOT EXISTS user_ai_settings (
      user_id INTEGER PRIMARY KEY,
      provider TEXT,
      endpoint_url TEXT,
      model TEXT,
      api_key TEXT,
      updated_at TEXT
    )`,
    columns: [
      { name: 'user_id', definition: 'user_id INTEGER PRIMARY KEY', alterable: false },
      { name: 'provider', definition: 'provider TEXT' },
      { name: 'endpoint_url', definition: 'endpoint_url TEXT' },
      { name: 'model', definition: 'model TEXT' },
      { name: 'api_key', definition: 'api_key TEXT' },
      { name: 'updated_at', definition: 'updated_at TEXT' },
    ],
  },
];

const INDEX_DEFINITIONS = [
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_serials_user_release ON serials(user_id, expected_release_date)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_items_user_date ON ledger_items(user_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_ledger_items_source_period ON ledger_items(user_id, source_type, source_id, source_period)',
];

async function ensureTable(db, tableDefinition) {
  const table = await db.get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableDefinition.name],
  );

  if (!table) {
    await db.run(tableDefinition.createSql);
    return;
  }

  const existingColumns = await db.all(`PRAGMA table_info(${tableDefinition.name})`);
  const existingNames = new Set(existingColumns.map((column) => column.name));

  for (const column of tableDefinition.columns) {
    if (!existingNames.has(column.name)) {
      if (column.alterable === false) {
        throw new Error(`数据库表 ${tableDefinition.name} 缺少关键列 ${column.name}，无法自动兼容`);
      }

      await db.run(`ALTER TABLE ${tableDefinition.name} ADD COLUMN ${column.definition}`);
    }
  }
}

async function ensureSchema(db) {
  for (const tableDefinition of TABLE_DEFINITIONS) {
    await ensureTable(db, tableDefinition);
  }

  for (const sql of INDEX_DEFINITIONS) {
    await db.run(sql);
  }
}

module.exports = {
  ensureSchema,
};
