// Set required env vars before any module loads (satisfies environment.js validation)
process.env.PORT = '5099';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/sgir_test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-do-not-use-in-production';
process.env.FRONTEND_URL = 'http://localhost:3000';
