export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://echogpt:echogpt_password@localhost:5432/echogpt_db?schema=public',
  },
  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || 'echogpt_super_secret_jwt_access_key_change_in_production',
    expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'echogpt_super_secret_jwt_refresh_key_change_in_production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '01234567890123456789012345678901', // 32-byte key for AES-256
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  search: {
    braveApiKey: process.env.BRAVE_SEARCH_API_KEY || '',
  },
});
