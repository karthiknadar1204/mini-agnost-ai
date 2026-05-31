import type { Context, Next } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../config/db';
import { projects } from '../config/schema';

// Guard for project-scoped endpoints. Must run AFTER the jwt middleware.
// Resolves the project id from the `:projectId` route param (api-key routes)
// or the `x-project-id` header (read routes), then verifies the current user
// owns it. Returns 404 on a missing/foreign project so we don't leak existence.
export async function requireProjectAccess(c: Context, next: Next) {
  const payload = c.get('jwtPayload') as { sub?: string } | undefined;
  const userId = payload?.sub;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const projectId = c.req.param('projectId') ?? c.req.header('x-project-id');
  if (!projectId) return c.json({ error: 'project id is required' }, 400);

  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1);

  if (!owned) return c.json({ error: 'Project not found' }, 404);

  await next();
}
