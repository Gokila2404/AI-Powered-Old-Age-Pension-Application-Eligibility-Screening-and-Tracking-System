import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger("pension_seva.websocket")

class WebSocketManager:
    """
    Manages active WebSocket connections for real-time notifications,
    application status updates, and administrative alerts.
    """
    def __init__(self):
        # Map user_id to list of active WebSocket connections
        self.user_connections: Dict[str, List[WebSocket]] = {}
        # Global broadcast connections (e.g., active dashboard listeners)
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
        logger.info("WebSocket connected. User: %s (Total active: %d)", user_id, len(self.active_connections))

    def disconnect(self, websocket: WebSocket, user_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        logger.info("WebSocket disconnected. User: %s", user_id)

    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Sends real-time message specifically to a designated user."""
        conns = self.user_connections.get(user_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning("Error sending WS to user %s: %s", user_id, e)
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts real-time message to all active connected clients."""
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning("Error broadcasting WS: %s", e)
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

# Global WebSocket Manager singleton
ws_manager = WebSocketManager()
