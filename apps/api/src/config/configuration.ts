export default () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['API_PORT'] ?? '3001', 10),
  webUrl: process.env['WEB_URL'] ?? 'http://localhost:3000',

  database: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://mapplus:mapplus_dev@localhost:5432/mapplus',
  },

  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'dev-refresh-secret',
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },

  storage: {
    endpoint: process.env['STORAGE_ENDPOINT'] ?? 'http://localhost:9000',
    accessKey: process.env['STORAGE_ACCESS_KEY'] ?? 'mapplus',
    secretKey: process.env['STORAGE_SECRET_KEY'] ?? 'mapplus_dev',
    bucket: process.env['STORAGE_BUCKET'] ?? 'mapplus',
    region: process.env['STORAGE_REGION'] ?? 'auto',
  },

  cdn: {
    url: process.env['CDN_URL'] ?? 'http://localhost:9000/mapplus',
  },

  qr: {
    baseUrl: process.env['QR_BASE_URL'] ?? 'http://localhost:3000/q',
  },
});
