import { Hono } from 'hono';
import { ingestTraces } from '../controllers/ingest.controller';

export const ingestRoutes = new Hono();

ingestRoutes.post('/v1/traces', ingestTraces);
