---
id: "012"
title: "Implement Recurring API Test Spec"
stage: general
date: "2026-02-16"
surface: agent
model: claude-sonnet-4-5-20250929
feature: "none"
branch: main
user: PMLS
command: "implement plan"
labels: ["recurring-tasks", "api", "e2e-tests", "schema-update"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - models.py
  - schemas.py
  - routers/recurring.py
  - tests/e2e/test_recurring_tasks.py
  - main.py
tests:
  - tests/e2e/test_recurring_tasks.py
---

## Prompt

Implement the following plan:

# Plan: Update Server to Match E2E Test Spec

The E2E tests in `tests/e2e/test_recurring_tasks.py` were written against a planned API that was never
fully implemented. The server uses a flat schema (`frequency`, `next_due`, `interval`) while tests
expect a richer schema (`recurrence_type`, `recurrence_rule` dict, `start_date`, `title`,
`description`, `timezone`). Three endpoints are also missing (`next-occurrences`, `skip`,
`postpone`). This plan brings the server up to the test spec.

## Response

Implemented all 4 steps of the plan:

1. **models.py**: Added `start_date`, `end_date`, `max_occurrences`, `timezone` columns to
   `RecurringRule`. Added `RecurringException` model with `rule_id`, `exception_date`, `action`,
   `new_date`, `created_at`. Updated `main.py` to import `RecurringException` for `create_all`.

2. **schemas.py**: Added `RecurringPatternCreate`, `RecurringPatternUpdate`,
   `RecurringPatternResponse`, `NextOccurrencesRequest`, `ExceptionResponse`. Also added `ConfigDict`
   and `Dict`, `Any` imports.

3. **routers/recurring.py**: Added `rule_to_pattern_response()` helper that builds the new-style
   response dict. Added `WEEKDAY_MAP` for name-to-number conversion. Updated `GET /`, `POST /`,
   `GET /{id}`, `PUT /{id}` to use new schemas. Added three new endpoints: `POST
   /{id}/next-occurrences`, `POST /{id}/skip`, `POST /{id}/postpone`. Kept existing
   `/{id}/generate` and `/generate-due` unchanged.

4. **tests/e2e/test_recurring_tasks.py**: Added `403` to the accepted status codes in
   `test_12_unauthorized_access` (line 353) and updated the follow-up conditional for consistency.

## Outcome

All 4 files modified. Server now accepts `RecurringPatternCreate` payload with `recurrence_type`,
`recurrence_rule` dict, `start_date`, and `timezone`. Responses return the same structure.
New endpoints handle next-occurrence calculation, skip, and postpone operations backed by the new
`recurring_exceptions` table (auto-created at startup via `create_all`).
