import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { listUsers, listSessions, getSession, getSessionMessages } from '../controllers/sessions.controller';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' });

export const sessionRoutes = new Hono();

sessionRoutes.get('/v1/users', auth, listUsers);
sessionRoutes.get('/v1/sessions', auth, listSessions);
sessionRoutes.get('/v1/sessions/:sessionId', auth, getSession);
sessionRoutes.get('/v1/sessions/:sessionId/messages', auth, getSessionMessages);
