require("dotenv").config();
const createApp = require("./startup/app");
const connectDB = require("./database/connection");
const config = require("./properties/config");
const logger = require("./logging/logger");

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    const app = createApp();

    app.listen(config.port, () => {
      logger.info(`====================================================`);
      logger.info(`  BoloEasy API Server`);
      logger.info(`  ENV   : ${config.nodeEnv}`);
      logger.info(`  PORT  : ${config.port}`);
      logger.info(`  BASE  : http://localhost:${config.port}/api`);
      logger.info(`====================================================`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
