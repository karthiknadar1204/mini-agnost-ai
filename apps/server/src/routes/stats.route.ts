import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import {
  overview,
  volume,
  clients,
  activity,
  pulse,
  toolsPerformance,
  timeByCategory,
  costByModel,
} from '../controllers/stats.controller';
import { requireProjectAccess } from '../middleware/project-access';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' });

export const statsRoutes = new Hono();

statsRoutes.get('/v1/stats/overview', auth, requireProjectAccess, overview);
statsRoutes.get('/v1/stats/volume', auth, requireProjectAccess, volume);
statsRoutes.get('/v1/stats/clients', auth, requireProjectAccess, clients);
statsRoutes.get('/v1/stats/pulse', auth, requireProjectAccess, pulse);
statsRoutes.get('/v1/activity', auth, requireProjectAccess, activity);
statsRoutes.get('/v1/tools/performance', auth, requireProjectAccess, toolsPerformance);
statsRoutes.get('/v1/stats/time-by-category', auth, requireProjectAccess, timeByCategory);
statsRoutes.get('/v1/stats/cost-by-model', auth, requireProjectAccess, costByModel);
