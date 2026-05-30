import type { Context } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../config/db';
import { projects, apiKeys } from '../config/schema';


export async function createApiKey(c: Context) {
  const projectId = c.req.param('projectId');
  if (!projectId) {
    return c.json({ error: 'Project ID is required' }, 400);
  }

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const raw = `ln_${Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('hex')}`;
  const keyHash = new Bun.CryptoHasher('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 11);

  const [created] = await db
    .insert(apiKeys)
    .values({ projectId, keyHash, prefix })
    .returning({ id: apiKeys.id, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt });

  return c.json({ apiKey: { ...created, key: raw } }, 201);
}


export async function listApiKeys(c: Context) {
  const projectId = c.req.param('projectId');
  if (!projectId) {
    return c.json({ error: 'Project ID is required' }, 400);
  }

  const rows = await db
    .select({ id: apiKeys.id, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId));

  return c.json({ apiKeys: rows });
}


export async function revokeApiKey(c: Context) {
  const projectId = c.req.param('projectId');
  const keyId = c.req.param('keyId');
  if (!projectId) {
    return c.json({ error: 'Project ID is required' }, 400);
  }
  if (!keyId) {
    return c.json({ error: 'API key ID is required' }, 400);
  }

  await db.delete(apiKeys).where(and(eq(apiKeys.projectId, projectId), eq(apiKeys.id, keyId)));

  return c.json({ ok: true });
}
