import app from './app.js';
import { ENV } from './config/environment.js';
import { Logger } from './utils/logger.js';

const PORT = ENV.PORT;

app.listen(PORT, '0.0.0.0', () => {
  Logger.info(`🚀 Brookfield Properties API Server Started`);
  Logger.info(`📍 Environment: ${ENV.NODE_ENV}`);
  Logger.info(`🌐 Server running on port ${PORT}`);
  Logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/${ENV.API_VERSION}`);
  Logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  Logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
