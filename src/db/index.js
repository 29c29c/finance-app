const sqlite3 = require('sqlite3').verbose();

const { ensureSchema } = require('./schema');

function openDatabase(dbFile) {
  return new Promise((resolve, reject) => {
    const raw = new sqlite3.Database(dbFile, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(raw);
    });
  });
}

function createDatabaseApi(raw) {
  let transactionQueue = Promise.resolve();

  const db = {
    raw,
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        raw.run(sql, params, function onRun(error) {
          if (error) {
            reject(error);
            return;
          }

          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        raw.get(sql, params, (error, row) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(row);
        });
      });
    },
    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        raw.all(sql, params, (error, rows) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows);
        });
      });
    },
    exec(sql) {
      return new Promise((resolve, reject) => {
        raw.exec(sql, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        raw.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    async withTransaction(callback) {
      const runTransaction = async () => {
        await db.exec('BEGIN IMMEDIATE TRANSACTION');

        try {
          const result = await callback(db);
          await db.exec('COMMIT');
          return result;
        } catch (error) {
          try {
            await db.exec('ROLLBACK');
          } catch (rollbackError) {
            console.error('事务回滚失败:', rollbackError.message);
          }

          throw error;
        }
      };

      const resultPromise = transactionQueue.then(runTransaction, runTransaction);
      transactionQueue = resultPromise.catch(() => {});
      return resultPromise;
    },
  };

  return db;
}

async function createDatabase(config) {
  const raw = await openDatabase(config.dbFile);
  const db = createDatabaseApi(raw);

  await db.exec('PRAGMA busy_timeout = 5000');
  await ensureSchema(db);

  return db;
}

module.exports = {
  createDatabase,
};
