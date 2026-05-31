# Deploying logsneat to Railway

logsneat is **4 pieces**:

| Piece | What | Where it runs |
| --- | --- | --- |
| **api** | Bun + Hono backend (`apps/server`, `bun run start`) | Railway service |
| **worker** | Detections worker (`apps/server`, `bun run start:worker`) | Railway service |
| **web** | Next.js dashboard (`apps/web`) | Railway service (or Vercel) |
| **Redis** | Queue for the worker | Railway plugin |
| **Postgres** | Database | Neon (external — already cloud) |

> The api, worker, and web are **three Railway services from the same GitHub repo**, each with a different **Root Directory** + start command.

---

## 0. Prerequisites
- Code pushed to GitHub.
- A Neon database + its `DATABASE_URL`.
- The schema pushed to that DB: `cd apps/server && DATABASE_URL=<neon> bunx drizzle-kit push`.
- A Railway account.

> **Node version:** the dashboard (Next.js 16) needs Node ≥ 20.9. This repo pins **Node 22** via `.node-version` + `engines`, so Railway's builder picks it up automatically. (If you ever see "You are using Node.js 18… version >=20.9.0 is required", that pin is missing.)

> **Each service runs from the repo root** and scopes its work with a turbo `--filter`. You do **not** need to set a Root Directory.

---

## 1. Create the project + Redis
1. Railway → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. In the project, **New → Database → Add Redis**. This creates a `Redis` service exposing `${{Redis.REDIS_URL}}`.

---

## 2. The **api** service (backend)
The backend is Bun running TypeScript directly — **no build step**.
- **Build Command:** *(leave empty)* — Railway still runs `bun install` automatically.
- **Start Command:** `bun run --filter=server start`
- **Variables:**
  ```
  DATABASE_URL = <your Neon connection string>
  JWT_SECRET   = <a long random secret>
  REDIS_URL    = ${{Redis.REDIS_URL}}
  CORS_ORIGINS = <web public URL>     # fill in after step 4
  ```
- **Settings → Networking → Generate Domain** → note the URL (e.g. `https://api-xxxx.up.railway.app`). This is your **backend URL** and the **SDK ingest endpoint**.

> Do **not** use `bun run build` here — that runs the whole turborepo (builds the Next apps too) and is unnecessary for the server.

---

## 3. The **worker** service
- **New → GitHub Repo** (same repo) → name it `worker`.
- **Build Command:** *(leave empty)*
- **Start Command:** `bun run --filter=server start:worker`
- **Variables:**
  ```
  DATABASE_URL = <your Neon connection string>
  REDIS_URL    = ${{Redis.REDIS_URL}}
  ```
- No domain needed (it's a background process).

---

## 4. The **web** service (dashboard)
- **New → GitHub Repo** (same repo) → name it `web`.
- **Build Command:** `bun run --filter=web build`
- **Start Command:** `bun run --filter=web start`   (Next.js respects Railway's `PORT`)
- **Variables:**
  ```
  NEXT_PUBLIC_API_URL = <api public URL from step 2>
  ```
- **Generate Domain** → this is your **dashboard URL**.

> Prefer Vercel for the frontend? Even simpler: import the repo, set **Root Directory = apps/web**, add `NEXT_PUBLIC_API_URL`, deploy. Either works.

---

## 5. Wire the two URLs (the one gotcha)
There's a chicken-and-egg: web needs the api URL, and api's CORS needs the web URL. So:
1. Deploy **api** first → copy its domain.
2. Set **web**'s `NEXT_PUBLIC_API_URL` to it → deploy web → copy web's domain.
3. Set **api**'s `CORS_ORIGINS` to the web domain → **redeploy api**.

`CORS_ORIGINS` is comma-separated if you have more than one (e.g. a custom domain + the railway domain).

---

## 6. Point the SDK at prod
In any app using the SDK, set the endpoint to your **api** domain:
```ts
await logsneat.init({
  apiKey: process.env.LOGSNEAT_API_KEY,
  endpoint: 'https://api-xxxx.up.railway.app',
  workflowName: 'my-agent',
});
```
(or set `LOGSNEAT_ENDPOINT` in that app's env).

---

## 7. Prod smoke test
1. Open the **web** domain → sign up → create a project → create an API key.
2. Run an SDK script with `apiKey` + `endpoint = api domain`.
3. Refresh the dashboard → Command Center / Raw Logs should show the trace; the worker should produce detections.

---

## Notes
- **Bun monorepo:** each app's `package.json` is self-contained, so per-service Root Directory installs cleanly. The root `bun.lock` isn't used inside a subdir build — that's fine.
- **Migrations:** run `bunx drizzle-kit push` locally against the prod `DATABASE_URL` whenever the schema changes (not part of the deploy build).
- **Scaling:** api + worker can scale independently; the worker is stateless (pulls from Redis).
