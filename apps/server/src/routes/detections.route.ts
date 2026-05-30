import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { listDetections, detectionsSummary } from '../controllers/detections.controller';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const auth = jwt({ secret: JWT_SECRET, alg: 'HS256' });

export const detectionRoutes = new Hono();

detectionRoutes.get('/v1/detections', auth, listDetections);
detectionRoutes.get('/v1/detections/summary', auth, detectionsSummary);
