import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { createProject, listProjects } from '../controllers/project.controller';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}

export const projectRoutes = new Hono();

projectRoutes.use('/v1/projects', jwt({ secret: JWT_SECRET, alg: 'HS256' }));
projectRoutes.post('/v1/projects', createProject);
projectRoutes.get('/v1/projects', listProjects);
