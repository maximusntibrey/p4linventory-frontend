# Railway deployment

## Variable

Set `VITE_API_URL` to the backend public HTTPS origin before the build:

```text
VITE_API_URL=https://eqp4l-backend-production.up.railway.app
```

This value is baked into `dist/`. Redeploy after changing it.

## Build and start

- Builder: Dockerfile
- Output: `dist/`
- SPA fallback: Caddy `try_files` in `Caddyfile`
