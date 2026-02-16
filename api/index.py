# api/index.py — Vercel Python serverless entry point
from main import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")
