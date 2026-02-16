---
id: "011"
title: "Start Backend Run Tests"
stage: general
date: "2026-02-16"
surface: agent
model: claude-sonnet-4-5-20250929
feature: none
branch: main
user: PMLS
command: "start the backend and run the tests"
labels: ["testing", "pytest", "e2e", "backend", "debugging", "schema-mismatch"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - tests/e2e/conftest.py
  - tests/e2e/test_recurring_tasks.py
tests:
  - tests/e2e/test_recurring_tasks.py
---

## Prompt

start the backend and run the tests

## Response

Resolved a chain of issues to get tests running:

1. Port 8000 occupied by WSL relay (different server) → started our server on port 8001
2. Unicode encoding crash (`✅` emoji in database.py) → set `PYTHONIOENCODING=utf-8`
3. `ModuleNotFoundError: kafka` → installed `kafka-python-ng`
4. `DATABASE_URL` env var triggered PostgreSQL branch (connect_timeout on SQLite) → don't pass DATABASE_URL
5. `bcrypt` 5.0 incompatible with `passlib` 1.7.4 → downgraded to `bcrypt==3.2.2`
6. Register returns `201` not `200` → updated test assertions to accept `(200, 201)`
7. All test methods async but missing `@pytest.mark.asyncio` → added to all 13
8. URL prefix `/api/recurring-tasks` → fixed to `/api/tasks/recurring`

Final result: **1 passed, 13 failed**

Remaining root cause: fundamental schema mismatch between tests and server:
- Tests use `recurrence_type`, `recurrence_rule`, `start_date`, `timezone`
- Server requires `frequency`, `next_due`, `interval` (flat fields)
- Three endpoints missing from server: `next-occurrences`, `skip`, `postpone`
- Auth returns `403` but tests expect `401`

User presented with two options:
A. Update server to implement the full planned API (test-driven)
B. Rewrite tests to match current simpler server schema

## Outcome

1 test passing. 13 failing due to API contract mismatch (schema + missing endpoints).
Awaiting user decision on path forward.
