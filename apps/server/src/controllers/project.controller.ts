import type { Context } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { projects } from '../config/schema';

// The JWT payload (set by the jwt middleware) carries the user id in `sub`.
function ownerId(c: Context): string {
  const payload = c.get('jwtPayload') as { sub?: string } | undefined;
  return payload?.sub ?? '';
}

export async function createProject(c: Context) {
  const { name } = await c.req.json();

  if (!name || typeof name !== 'string') {
    return c.json({ error: 'Project name is required' }, 400);
  }

  const [project] = await db
    .insert(projects)
    .values({ name, ownerId: ownerId(c) })
    .returning({ id: projects.id, name: projects.name });

  return c.json({ project }, 201);
}

// GET /v1/projects — list the projects owned by the current user.
export async function listProjects(c: Context) {
  const rows = await db
    .select({ id: projects.id, name: projects.name, createdAt: projects.createdAt })
    .from(projects)
    .where(eq(projects.ownerId, ownerId(c)))
    .orderBy(desc(projects.createdAt));

  return c.json({ projects: rows });
}
