import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { listDetections, detectionsSummary } from '../controllers/detections.controller';
import { requireProjectAccess } from '../middleware/project-access';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' });

export const detectionRoutes = new Hono();

detectionRoutes.get('/v1/detections', auth, requireProjectAccess, listDetections);
detectionRoutes.get('/v1/detections/summary', auth, requireProjectAccess, detectionsSummary);
