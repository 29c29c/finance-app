const http = require('http');

const { loadConfig } = require('./config/env');
const { createApp } = require('./app');

async function startServer(overrides = {}) {
  const config = loadConfig(overrides);
  const { app, db } = await createApp(config);
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : config.port;

  console.log('财务指挥中心已启动');
  console.log(`访问地址: http://localhost:${port}`);

  return {
    app,
    db,
    server,
    config,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      await db.close();
    },
  };
}

module.exports = {
  startServer,
};
