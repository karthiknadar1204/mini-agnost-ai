import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { listTraces, getTrace } from '../controllers/traces.controller';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}

export const traceRoutes = new Hono();

traceRoutes.use('/v1/traces', jwt({ secret: JWT_SECRET, alg: 'HS256' }));
traceRoutes.use('/v1/traces/*', jwt({ secret: JWT_SECRET, alg: 'HS256' }));
traceRoutes.get('/v1/traces', listTraces);
traceRoutes.get('/v1/traces/:traceId', getTrace);
