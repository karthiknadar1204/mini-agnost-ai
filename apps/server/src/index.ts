import { Hono } from 'hono';
import { ingestRoutes } from './routes/ingest.route';
import { authRoutes } from './routes/auth.route';
import { projectRoutes } from './routes/project.route';
import { traceRoutes } from './routes/traces.route';

const app = new Hono();

app.get('/', (c) => c.text('Hello Hono!'));

app.route('/', ingestRoutes);
app.route('/', authRoutes);
app.route('/', projectRoutes);
app.route('/', traceRoutes);

export default {
  port: 3004,
  fetch: app.fetch,
};
