import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from config import settings
from database import SessionLocal
from models import User
from services.kafka_monitor_service import kafka_monitor

router = APIRouter(prefix="/api/kafka", tags=["kafka-monitor"])
logger = logging.getLogger(__name__)


def _require_admin(token: str) -> User:
    # decodeert het JWT-token en valideert dat de gebruiker admin is
    db = SessionLocal()
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Geen user_id in token")
        user = db.get(User, int(user_id))
        if not user or user.role != "admin":
            raise ValueError("Alleen admins hebben toegang tot de Kafka monitor")
        return user
    except JWTError as e:
        raise ValueError(f"Ongeldig token: {e}")
    finally:
        db.close()


@router.get("/messages")
def get_messages(limit: int = 100, token: str = Query(...)):
    # geeft recente Kafka-berichten en statistieken terug, alleen voor admins
    try:
        _require_admin(token)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return {
        "messages": kafka_monitor.get_recent(limit),
        "stats": kafka_monitor.stats,
    }


@router.websocket("/ws")
async def kafka_ws(websocket: WebSocket, token: str = Query(...)):
    # streamt live Kafka-berichten naar de admin via een websocket
    try:
        _require_admin(token)
    except ValueError:
        await websocket.close(code=4003)
        return

    await websocket.accept()
    queue = kafka_monitor.subscribe()

    # stuurt eerst de recente geschiedenis naar de nieuwe verbinding
    for msg in kafka_monitor.get_recent(50):
        try:
            await websocket.send_json(msg)
        except Exception:
            kafka_monitor.unsubscribe(queue)
            return

    try:
        while True:
            try:
                # wacht op nieuwe berichten, stuurt heartbeat bij timeout
                msg = await asyncio.wait_for(queue.get(), timeout=20)
                await websocket.send_json(msg)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        kafka_monitor.unsubscribe(queue)
