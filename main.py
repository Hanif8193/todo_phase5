from dotenv import load_dotenv
load_dotenv('.env.local')

from fastapi import FastAPI, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, tasks, recurring, websocket_router
from database import engine, Base, get_db
from models import User, Task, RecurringRule, RecurringException
from typing import Optional
import json
import re
import asyncio
import logging
import event_handlers
from sqlalchemy.orm import Session

# Kafka is optional
try:
    from kafka import KafkaProducer
    from kafka_service import kafka_service as kafka_service
    KAFKA_IMPORT_OK = True
except ImportError:
    KafkaProducer = None
    kafka_service = None
    KAFKA_IMPORT_OK = False

# Import Redis WebSocket manager (with fallback to in-memory mode)
try:
    from websocket_manager_redis import manager as websocket_manager
    REDIS_WEBSOCKET_ENABLED = True
except ImportError:
    from websocket_manager import manager as websocket_manager
    REDIS_WEBSOCKET_ENABLED = False
    logger = logging.getLogger(__name__)
    logger.warning("⚠️ Redis WebSocket manager not available, using in-memory mode")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Todo Phase5 API with Kafka & Real-Time Updates", version="2.0.0")

# ---------------------------
# Kafka Producer Setup (Optional)
# ---------------------------
producer = None
kafka_available = False

def init_kafka_producer():
    """Initialize Kafka producer if available"""
    global producer, kafka_available
    if not KAFKA_IMPORT_OK or KafkaProducer is None:
        logger.info("ℹ️ Kafka package not installed — skipping producer init")
        return
    try:
        producer = KafkaProducer(
            bootstrap_servers='localhost:9092',
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            request_timeout_ms=5000,
            max_block_ms=5000
        )
        kafka_available = True
        logger.info("✅ Kafka producer initialized successfully")
    except Exception as e:
        logger.warning(f"⚠️ Kafka not available: {e}. Event streaming disabled.")
        kafka_available = False

def send_event(topic: str, event: dict):
    """Helper function to send events to Kafka (no-op if Kafka unavailable)"""
    if kafka_available and producer:
        try:
            producer.send(topic, value=event)
            producer.flush()
        except Exception as e:
            logger.error(f"Failed to send event to Kafka: {e}")
    else:
        logger.debug(f"Kafka unavailable - event not sent: {event}")


# ---------------------------
# Startup Event: DB Tables & Kafka Consumer
# ---------------------------
@app.on_event("startup")
async def startup_event():
    """Initialize database and start Kafka consumer on application startup"""
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database initialized successfully")

    # Initialize Kafka producer (optional)
    init_kafka_producer()

    # Initialize Redis WebSocket manager (if Redis-enabled)
    if REDIS_WEBSOCKET_ENABLED:
        try:
            await websocket_manager.startup()
            logger.info("✅ Redis WebSocket manager initialized")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize Redis WebSocket manager: {e}")

    # Start Kafka consumer in background (optional)
    if kafka_available and kafka_service is not None:
        try:
            asyncio.create_task(kafka_service.start())
            logger.info("✅ Kafka consumer service started in background")
        except Exception as e:
            logger.warning(f"⚠️ Failed to start Kafka consumer: {e}")
    else:
        logger.info("ℹ️ Kafka consumer not started (Kafka unavailable)")


@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully shutdown Kafka consumer and Redis on application shutdown"""
    # Shutdown Redis WebSocket manager
    if REDIS_WEBSOCKET_ENABLED:
        try:
            await websocket_manager.shutdown()
            logger.info("✅ Redis WebSocket manager shutdown")
        except Exception as e:
            logger.warning(f"⚠️ Error shutting down Redis WebSocket manager: {e}")

    # Shutdown Kafka consumer
    if kafka_available:
        try:
            kafka_service.stop()
            logger.info("✅ Kafka consumer service stopped")
        except Exception as e:
            logger.warning(f"⚠️ Error stopping Kafka consumer: {e}")


# ---------------------------
# CORS configuration
# ---------------------------
origins = [
    "http://localhost:3000",
    "https://frontend-hazel-gamma-xtb0q17d6f.vercel.app",
]

allow_origin_regex = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Include routers
# ---------------------------
app.include_router(auth.router)
app.include_router(recurring.router)
app.include_router(tasks.router)
app.include_router(websocket_router.router)


# ---------------------------
# Root & Health endpoints
# ---------------------------
@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/debug/token")
def debug_token(authorization: Optional[str] = Header(None)):
    """Debug endpoint to check if token is being received"""
    return {
        "authorization_header": authorization,
        "has_token": authorization is not None,
        "message": "Check if Authorization header is present"
    }


# ---------------------------
# Kafka Event Integration
# ---------------------------
# Example: Patch task routes to send events
from fastapi import APIRouter
from routers import tasks as tasks_router

original_create_task = tasks_router.create_task
original_complete_task = tasks_router.complete_task

async def create_task_with_event(task: dict):
    result = await original_create_task(task)
    send_event("task-events", {
        "type": "task_created",
        "task_id": result["task_id"],
        "title": result["title"],
        "user_id": result["user_id"]
    })
    return result

async def complete_task_with_event(task_id: int, user_id: str):
    result = await original_complete_task(task_id, user_id)
    send_event("task-events", {
        "type": "task_completed",
        "task_id": task_id,
        "user_id": user_id
    })
    return result

tasks_router.create_task = create_task_with_event
tasks_router.complete_task = complete_task_with_event
