const { NotFoundError } = require('../errors');
const financeRepository = require('../repositories/financeRepository');
const {
  validateDashboardQuery,
  validateSubscriptionPayload,
  validateSerialPayload,
  validateLedgerPayload,
  validateBudgetPayload,
  validateImportPayload,
  validateAdvancePayload,
  validateRecordId,
} = require('../validators/financeValidators');

const CRUD_TABLES = {
  subscriptions: {
    fields: ['name', 'price', 'cycle_type', 'first_payment_date', 'is_active'],
    validate: validateSubscriptionPayload,
  },
  serials: {
    fields: ['name', 'price', 'status', 'expected_release_date'],
    validate: validateSerialPayload,
  },
  ledger_items: {
    fields: ['date', 'category', 'name', 'amount'],
    validate: validateLedgerPayload,
  },
};

function getLastDayOfMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function buildRenewalDate(month, firstPaymentDate) {
  const day = Number.parseInt(String(firstPaymentDate).slice(8, 10), 10);
  const normalizedDay = Math.min(day, getLastDayOfMonth(month));
  return `${month}-${String(normalizedDay).padStart(2, '0')}`;
}

function createFinanceService({ db }) {
  async function syncMonthlySubscriptionLedger(userId, month) {
    await db.withTransaction(async (tx) => {
      const [subscriptions, existingLedger] = await Promise.all([
        financeRepository.getSubscriptionsByUserId(tx, userId),
        financeRepository.getAutoSubscriptionLedgerForMonth(tx, userId, month),
      ]);

      const existingBySubscriptionId = new Map(
        existingLedger
          .filter((item) => Number.isInteger(Number(item.source_id)))
          .map((item) => [Number(item.source_id), item]),
      );

      for (const subscription of subscriptions) {
        const existing = existingBySubscriptionId.get(subscription.id);
        const shouldAutoRecord = Number(subscription.is_active) === 1
          && subscription.cycle_type === 'monthly'
          && typeof subscription.first_payment_date === 'string'
          && subscription.first_payment_date.length === 10;

        if (!shouldAutoRecord) {
          if (existing) {
            await financeRepository.deleteScopedRecord(tx, 'ledger_items', existing.id, userId);
          }
          continue;
        }

        const desiredLedger = {
          date: buildRenewalDate(month, subscription.first_payment_date),
          category: 'subscription',
          name: subscription.name,
          amount: subscription.price,
          source_type: 'subscription',
          source_id: subscription.id,
          source_period: month,
        };

        if (!existing) {
          await financeRepository.insertLedgerItem(tx, userId, desiredLedger);
          continue;
        }

        if (
          existing.date !== desiredLedger.date
          || existing.category !== desiredLedger.category
          || existing.name !== desiredLedger.name
          || Number(existing.amount) !== Number(desiredLedger.amount)
        ) {
          await financeRepository.updateLedgerItemById(tx, existing.id, userId, desiredLedger);
        }
      }
    });
  }

  return {
    async getDashboardData(userId, query) {
      const { month } = validateDashboardQuery(query);
      await syncMonthlySubscriptionLedger(userId, month);
      return financeRepository.getDashboardData(db, userId, month);
    },

    async exportAllData(userId, query = {}) {
      if (query.month) {
        const { month } = validateDashboardQuery({ month: query.month });
        await syncMonthlySubscriptionLedger(userId, month);
      }
      return financeRepository.getExportData(db, userId);
    },

    async createRecord(tableName, userId, payload) {
      const tableConfig = CRUD_TABLES[tableName];
      const normalizedPayload = tableConfig.validate(payload);
      const values = tableConfig.fields.map((field) => normalizedPayload[field]);
      const result = await financeRepository.insertScopedRecord(
        db,
        tableName,
        tableConfig.fields,
        values,
        userId,
      );

      return { id: result.lastID, ...normalizedPayload };
    },

    async updateRecord(tableName, userId, recordId, payload) {
      const tableConfig = CRUD_TABLES[tableName];
      const normalizedId = validateRecordId(recordId);
      if (tableName === 'ledger_items') {
        const existing = await financeRepository.getLedgerItemById(db, normalizedId, userId);
        if (!existing) {
          throw new NotFoundError('账单记录不存在');
        }
      }
      const normalizedPayload = tableConfig.validate(payload);
      const values = tableConfig.fields.map((field) => normalizedPayload[field]);
      const result = await financeRepository.updateScopedRecord(
        db,
        tableName,
        tableConfig.fields,
        values,
        normalizedId,
        userId,
      );

      return { updated: result.changes };
    },

    async deleteRecord(tableName, userId, recordId) {
      const normalizedId = validateRecordId(recordId);
      const result = await financeRepository.deleteScopedRecord(db, tableName, normalizedId, userId);
      return { deleted: result.changes };
    },

    async setBudget(userId, payload) {
      const normalizedPayload = validateBudgetPayload(payload);
      await financeRepository.upsertBudget(db, userId, normalizedPayload.month, normalizedPayload.amount);
      return { success: true };
    },

    async importLedger(userId, payload) {
      const { items } = validateImportPayload(payload);
      if (items.length === 0) {
        return { imported: 0 };
      }

      await db.withTransaction(async (tx) => {
        for (const item of items) {
          await financeRepository.insertLedgerItem(tx, userId, item);
        }
      });

      return { imported: items.length };
    },

    async advanceSerial(userId, serialId, payload) {
      const normalizedId = validateRecordId(serialId);
      const normalizedPayload = validateAdvancePayload(payload);

      await db.withTransaction(async (tx) => {
        const serial = await financeRepository.getSerialById(tx, normalizedId, userId);
        if (!serial) {
          throw new NotFoundError('连载计划不存在');
        }

        await financeRepository.insertLedgerItem(tx, userId, normalizedPayload.expense);
        const updateResult = await financeRepository.updateSerialAfterAdvance(
          tx,
          userId,
          normalizedId,
          normalizedPayload.next,
        );

        if (updateResult.changes === 0) {
          throw new NotFoundError('连载计划不存在');
        }
      });

      return { success: true };
    },
  };
}

module.exports = {
  createFinanceService,
};
