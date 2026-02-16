"""
pytest configuration and fixtures for E2E tests
"""

import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_client():
    """Provide an async HTTP client for testing"""
    async with AsyncClient(follow_redirects=True) as client:
        yield client


@pytest.fixture
def base_url():
    """Base URL for the API"""
    return "http://localhost:8001"
