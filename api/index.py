# api/index.py — Vercel Python serverless entry point
import sys
import os

# Ensure project root is in path so main.py and other modules are importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # FastAPI ASGI app — Vercel @vercel/python handles ASGI natively
