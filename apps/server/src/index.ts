import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ingestRoutes } from './routes/ingest.route';
import { authRoutes } from './routes/auth.route';
import { projectRoutes } from './routes/project.route';
import { traceRoutes } from './routes/traces.route';
import { apiKeyRoutes } from './routes/apikey.route';
import { statsRoutes } from './routes/stats.route';
import { errorRoutes } from './routes/errors.route';
import { sessionRoutes } from './routes/sessions.route';
import { detectionRoutes } from './routes/detections.route';
import { logger } from 'hono/logger'

const app = new Hono();
app.use(logger());

// Allowed dashboard origins — comma-separated in CORS_ORIGINS, defaults to local dev.
// Normalized (trimmed + trailing slash stripped) so a stray "/" can't break matching.
const normalize = (o: string) => o.trim().replace(/\/+$/, '');
const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map(normalize)
  .filter(Boolean);

console.log('[cors] allowed origins:', corsOrigins);

app.use(
  '*',
  cors({
    origin: (origin) => (origin && corsOrigins.includes(normalize(origin)) ? origin : null),
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-project-id'],
  }),
);

app.get('/', (c) => c.text('Hello Hono!'));

app.route('/', ingestRoutes);
app.route('/', authRoutes);
app.route('/', projectRoutes);
app.route('/', traceRoutes);
app.route('/', apiKeyRoutes);
app.route('/', statsRoutes);
app.route('/', errorRoutes);
app.route('/', sessionRoutes);
app.route('/', detectionRoutes);

export default {
  port: Number(process.env.PORT) || 3004,
  fetch: app.fetch,
};
