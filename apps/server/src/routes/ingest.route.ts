import { Hono } from 'hono';
import { ingestTraces } from '../controllers/ingest.controller';

export const ingestRoutes = new Hono();

// Auth is via API key, resolved inside the controller.
ingestRoutes.post('/v1/traces', ingestTraces);
