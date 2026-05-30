import { Hono } from 'hono';
import { ingestRoutes } from './routes/ingest.route';

const app = new Hono();

app.get('/', (c) => c.text('Hello Hono!'));

app.route('/', ingestRoutes);

export default {
  port: 3004,
  fetch: app.fetch,
};
