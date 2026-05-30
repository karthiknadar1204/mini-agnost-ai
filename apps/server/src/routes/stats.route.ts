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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' });

export const statsRoutes = new Hono();

statsRoutes.get('/v1/stats/overview', auth, overview);
statsRoutes.get('/v1/stats/volume', auth, volume);
statsRoutes.get('/v1/stats/clients', auth, clients);
statsRoutes.get('/v1/stats/pulse', auth, pulse);
statsRoutes.get('/v1/activity', auth, activity);
statsRoutes.get('/v1/tools/performance', auth, toolsPerformance);
statsRoutes.get('/v1/stats/time-by-category', auth, timeByCategory);
statsRoutes.get('/v1/stats/cost-by-model', auth, costByModel);
