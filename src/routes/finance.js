const express = require('express');

const { asyncHandler } = require('../utils/async-handler');

function createFinanceRouter({ financeService, aiService, authenticate }) {
  const router = express.Router();

  router.use(authenticate);

  router.get(
    '/data',
    asyncHandler(async (req, res) => {
      const result = await financeService.getDashboardData(req.user.id, req.query);
      res.json(result);
    }),
  );

  router.get(
    '/export/all',
    asyncHandler(async (req, res) => {
      const result = await financeService.exportAllData(req.user.id, req.query);
      res.json(result);
    }),
  );

  router.post(
    '/budget',
    asyncHandler(async (req, res) => {
      const result = await financeService.setBudget(req.user.id, req.body);
      res.json(result);
    }),
  );

  router.post(
    '/ledger/import',
    asyncHandler(async (req, res) => {
      const result = await financeService.importLedger(req.user.id, req.body);
      res.json(result);
    }),
  );

  router.post(
    '/serials/:id/advance',
    asyncHandler(async (req, res) => {
      const result = await financeService.advanceSerial(req.user.id, req.params.id, req.body);
      res.json(result);
    }),
  );

  router.get(
    '/ai-settings',
    asyncHandler(async (req, res) => {
      const result = await aiService.getSettings(req.user.id);
      res.json(result);
    }),
  );

  router.put(
    '/ai-settings',
    asyncHandler(async (req, res) => {
      const result = await aiService.saveSettings(req.user.id, req.body);
      res.json(result);
    }),
  );

  router.post(
    '/ai-analysis',
    asyncHandler(async (req, res) => {
      const result = await aiService.analyze(req.user.id, req.body);
      res.json(result);
    }),
  );

  ['subscriptions', 'serials', 'ledger_items'].forEach((tableName) => {
    router.post(
      `/${tableName}`,
      asyncHandler(async (req, res) => {
        const result = await financeService.createRecord(tableName, req.user.id, req.body);
        res.json(result);
      }),
    );

    router.put(
      `/${tableName}/:id`,
      asyncHandler(async (req, res) => {
        const result = await financeService.updateRecord(tableName, req.user.id, req.params.id, req.body);
        res.json(result);
      }),
    );

    router.delete(
      `/${tableName}/:id`,
      asyncHandler(async (req, res) => {
        const result = await financeService.deleteRecord(tableName, req.user.id, req.params.id);
        res.json(result);
      }),
    );
  });

  return router;
}

module.exports = {
  createFinanceRouter,
};
