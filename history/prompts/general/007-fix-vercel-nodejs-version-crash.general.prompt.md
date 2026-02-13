---
id: "007"
title: "Fix Vercel Node.js Version Crash"
stage: general
date: "2026-02-13"
surface: agent
model: claude-sonnet-4-5-20250929
feature: none
branch: main
user: PMLS
command: "fix vercel 500 FUNCTION_INVOCATION_FAILED"
labels: ["vercel", "nodejs", "deployment", "next.js", "debugging"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/package.json
  - frontend/vercel.json
tests: []
---

## Prompt

perfect running on localhost3000 but on vercel showing this error This Serverless Function has crashed.

Your connection is working correctly.

Vercel is working correctly.

500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
ID: dxb1::jhlzz-1770977125393-8cdf567a417e

If you are a visitor, contact the website owner or try again later.
If you are the owner, learn how to fix the error and check the logs. on this url: https://todo-phase5-five.vercel.app/

## Response

**Root cause identified:** Next.js 16.1.6 requires Node.js >=20.9.0 (confirmed via `node_modules/next/package.json`). Vercel projects created before mid-2024 default to Node.js 18.x. The build may succeed in the build environment but the serverless function runtime crashes when it tries to load Next.js 16 modules on Node.js 18.

**Fixes applied:**

1. **`frontend/package.json`** — Added `engines` field to signal Node.js 20+ requirement to Vercel:
   ```json
   "engines": { "node": ">=20.9.0" }
   ```

2. **`frontend/vercel.json`** — Added `build.env.NODE_VERSION: "20"` to explicitly set Node.js 20 for the build/runtime:
   ```json
   "build": { "env": { "NODE_VERSION": "20" } }
   ```

**Additional action required by user:**
- In Vercel dashboard → Project Settings → General → Node.js Version → change to **20.x**
- Push these changes, Vercel will redeploy automatically
- Set `NEXT_PUBLIC_API_URL` in Vercel environment variables pointing to the deployed backend URL (not localhost)

## Outcome

- Root cause: Node.js version mismatch (Next.js 16 needs >=20.9.0, Vercel defaulted to 18.x)
- Files modified: 2 (package.json engines field, vercel.json NODE_VERSION)
- Status: Changes staged, awaiting user commit/push
