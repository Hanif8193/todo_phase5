---
id: "010"
title: "Fix Async Fixture Pytest Asyncio"
stage: general
date: "2026-02-16"
surface: agent
model: claude-sonnet-4-5-20250929
feature: none
branch: main
user: PMLS
command: "fix the conftest.py async fixture issue"
labels: ["testing", "pytest", "asyncio", "bugfix", "e2e"]
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

fix the conftest.py async fixture issue

## Response

Fixed async fixture compatibility with `pytest-asyncio` STRICT mode (v1.3.0):

**`tests/e2e/conftest.py`**
- Added `import pytest_asyncio`
- Changed `@pytest.fixture` → `@pytest_asyncio.fixture` on `async def test_client()`

**`tests/e2e/test_recurring_tasks.py`**
- Added `import pytest_asyncio`
- Changed `@pytest.fixture(autouse=True)` → `@pytest_asyncio.fixture(autouse=True)` on `async def setup()`

After fix: all 14 tests progress past fixture setup. Remaining 13 errors and 1 failure are server-not-running (all hit `localhost:8000` returning 404) — expected for E2E tests requiring a live backend.

## Outcome

Async fixture errors resolved. Tests require `uvicorn main:app --port 8000` running to pass.
