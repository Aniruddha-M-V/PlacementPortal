require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/db');
const bootstrap = require('./src/config/bootstrap');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Seed default admin if first run
  await bootstrap();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`💊 Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });
};

startServer();
