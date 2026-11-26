# contract/

This folder holds the frontend's own copy of the backend's OpenAPI contract (`openapi.yaml`).

It is filled **only** by a deliberate "sync contract" step:

```
npm run contract:sync -- <path-or-url-of-published-openapi.yaml>
```

which copies the file here and runs `npm run contract:gen` (openapi-typescript -> `src/api/schema.d.ts`).

Never edit `openapi.yaml` by hand and never hand-write API types. To change the contract: propose, agree with the owner, update the backend's published file, then sync here. No imports, symlinks or relative paths into the backend folder.

Status: synced from backend contract v0.1.2 on 2026-11-24.
