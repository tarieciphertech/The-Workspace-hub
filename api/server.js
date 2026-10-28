import express from 'express';
import helmet from 'helmet';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'synexis-workspace-api',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', async (_req, res) => {
  try {
    const result = await pool.query('SELECT current_database() AS database, current_user AS role, NOW() AS checked_at');
    res.status(200).json({
      status: 'ready',
      service: 'synexis-workspace-api',
      database: {
        connected: true,
        name: result.rows[0].database,
        role: result.rows[0].role,
        checkedAt: result.rows[0].checked_at
      }
    });
  } catch (error) {
    console.error('Database readiness check failed:', error.message);
    res.status(503).json({
      status: 'not_ready',
      service: 'synexis-workspace-api',
      database: { connected: false }
    });
  }
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Synexis Workspace API',
    version: '0.1.0',
    endpoints: ['/health', '/health/ready']
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Synexis Workspace API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
