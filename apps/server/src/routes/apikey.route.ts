import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apikey.controller';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}

export const apiKeyRoutes = new Hono();


apiKeyRoutes.use('/v1/projects/*', jwt({ secret: JWT_SECRET, alg: 'HS256' }));
apiKeyRoutes.post('/v1/projects/:projectId/api-keys', createApiKey);
apiKeyRoutes.get('/v1/projects/:projectId/api-keys', listApiKeys);
apiKeyRoutes.delete('/v1/projects/:projectId/api-keys/:keyId', revokeApiKey);
