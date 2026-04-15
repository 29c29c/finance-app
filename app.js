require('dotenv').config();

const { startServer } = require('./src/server');

startServer().catch((error) => {
  console.error('服务启动失败:', error.message);
  process.exit(1);
});
