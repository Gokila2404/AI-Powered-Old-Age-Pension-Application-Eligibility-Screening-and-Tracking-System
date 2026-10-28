from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from backend.services.websocket_manager import ws_manager
from backend.auth import decode_access_token

router = APIRouter(tags=["Real-Time WebSockets"])

@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    user_id = None
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")

    await ws_manager.connect(websocket, user_id=user_id)
    try:
        while True:
            # Keep alive and listen for client pings or heartbeats
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id=user_id)
    except Exception:
        ws_manager.disconnect(websocket, user_id=user_id)
