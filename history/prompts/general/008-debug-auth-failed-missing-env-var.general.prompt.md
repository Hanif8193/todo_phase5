---
id: "008"
title: "Debug Auth Failed Missing Env Var"
stage: general
date: "2026-02-14"
surface: agent
model: claude-sonnet-4-5-20250929
feature: none
branch: main
user: PMLS
command: "debug"
labels: ["debugging", "authentication", "vercel", "environment-variables"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - frontend/lib/api.ts
  - frontend/components/AuthForm.tsx
  - frontend/contexts/AuthContext.tsx
  - frontend/.env.local
  - frontend/.env.production
  - frontend/.env.production.local
  - .gitignore
  - main.py
  - routers/auth.py
tests: []
---

## Prompt

Authentication failed. Please try again.

(this is phase 5 todo app)

## Response

Diagnosed root cause: All `.env*` files are in `.gitignore`, so Vercel never receives `NEXT_PUBLIC_API_URL`. The frontend falls back to `http://localhost:8000` (hardcoded fallback in `frontend/lib/api.ts:3`). When users visit the Vercel deployment, the browser attempts to call `http://localhost:8000` which is unreachable, resulting in a network error. Since `err.response` is `undefined` for network errors, the generic fallback message "Authentication failed. Please try again." is shown (`frontend/components/AuthForm.tsx:28`).

**Fix:** Set `NEXT_PUBLIC_API_URL=https://dominant-chameleon-hanifmemon8193-fa8d786d.koyeb.app` in the Vercel dashboard under Settings → Environment Variables, then redeploy.

**Verification:** Koyeb backend confirmed healthy (HTTP 200 on `/health`), CORS correctly configured for `localhost:3000` and `*.vercel.app`.

## Outcome

- Root cause identified: missing env var in Vercel dashboard
- No code changes required
- Backend (Koyeb) confirmed operational
