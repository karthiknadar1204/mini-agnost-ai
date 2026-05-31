import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { errorsSummary, errorsByTool, listErrors } from '../controllers/errors.controller';
import { requireProjectAccess } from '../middleware/project-access';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' });

export const errorRoutes = new Hono();

errorRoutes.get('/v1/errors/summary', auth, requireProjectAccess, errorsSummary);
errorRoutes.get('/v1/errors/by-tool', auth, requireProjectAccess, errorsByTool);
errorRoutes.get('/v1/errors', auth, requireProjectAccess, listErrors);
