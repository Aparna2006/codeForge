const DEFAULT_PORT = 4100;

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_err) {
    return fallback;
  }
}

const defaultUsers = [
  {
    id: 'admin-1',
    email: process.env.JUDGE_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.JUDGE_ADMIN_PASSWORD || 'change-me',
    roles: ['admin'],
    name: 'Judge Admin',
  },
];

module.exports = {
  port: Number(process.env.JUDGE_SERVICE_PORT || DEFAULT_PORT),
  publicBaseUrl: process.env.JUDGE_SERVICE_PUBLIC_BASE_URL || `http://localhost:${Number(process.env.JUDGE_SERVICE_PORT || DEFAULT_PORT)}`,
  corsOrigin: process.env.JUDGE_CORS_ORIGIN || '*',
  jwtSecret: process.env.JUDGE_JWT_SECRET || 'dev-judge-secret-change-in-prod',
  apiToken: process.env.JUDGE_SERVICE_API_TOKEN || '',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  queueName: process.env.JUDGE_QUEUE_NAME || 'judge-jobs',
  runnerMode: process.env.JUDGE_RUNNER_MODE || 'local',
  runnerSeccompProfile: process.env.JUDGE_RUNNER_SECCOMP_PROFILE || '',
  users: parseJson(process.env.JUDGE_SERVICE_USERS_JSON, defaultUsers),
  callbackUrl: process.env.JUDGE_CALLBACK_URL || '',
  callbackSecret: process.env.JUDGE_CALLBACK_SECRET || '',
};
