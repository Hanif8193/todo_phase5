---
id: "014"
title: "Fix Vercel Python Function Crash"
stage: general
date: "2026-02-16"
surface: agent
model: claude-sonnet-4-5-20250929
feature: none
branch: main
user: hanif8193
command: "debug vercel deployment FUNCTION_INVOCATION_FAILED"
labels: ["vercel", "python", "fastapi", "deployment", "mangum", "asgi"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - api/index.py
  - main.py
tests: []
---

## Prompt

(continued from previous session context — fixing Vercel FUNCTION_INVOCATION_FAILED after Python function started building successfully)

## Root Cause Found

From Vercel runtime logs:
```
File "/var/task/_vendor/vercel_runtime/vc_init.py", line 458, in <module>
if not issubclass(base, BaseHTTPRequestHandler):
TypeError: issubclass() arg 1 must be a class
```

Vercel's Python runtime (`vc_init.py`) calls `issubclass(handler, BaseHTTPRequestHandler)` to detect handler type. When `handler = Mangum(app, lifespan="off")` (an INSTANCE, not a class), `issubclass()` raises `TypeError`.

Mangum is designed for **AWS Lambda**, not Vercel. Vercel's `@vercel/python` runtime handles ASGI apps natively — no Mangum wrapper needed.

## Fix Applied

### `api/index.py`
- Removed Mangum import and `handler = Mangum(app, lifespan="off")`
- Just expose `app` directly — Vercel handles FastAPI ASGI natively

### `main.py`
- Added `from sqlalchemy import text`
- Fixed `db.execute("SELECT 1")` → `db.execute(text("SELECT 1"))` (SQLAlchemy 2.x requires text() wrapper)

## Result

- `/health` → `{"status":"healthy","database":"connected"}`
- `/api/auth/register` → 201 Created with JWT token
- `/api/auth/login` → 200 OK with JWT token
- `/api/tasks` → `[]` (empty, authenticated)
- `/api/tasks/recurring` → `[]` (empty, authenticated)

## Known Limitation: Ephemeral SQLite

The app uses SQLite at `/tmp/todo.db` on Vercel (no DATABASE_URL set). This is ephemeral — resets on each new deployment or cold start. To persist data, a PostgreSQL DATABASE_URL must be added to Vercel environment variables (e.g., Neon free tier).

## Response

Fixed FUNCTION_INVOCATION_FAILED by removing Mangum (AWS Lambda adapter) from api/index.py. Vercel's Python runtime natively supports ASGI apps — just expose the FastAPI app directly. Also fixed SQLAlchemy 2.x text() deprecation. All API endpoints now respond correctly on https://todophase5.vercel.app.
