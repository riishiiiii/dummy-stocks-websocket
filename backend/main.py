from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import asyncio
import random
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {} 

    async def connect(self, websocket: WebSocket, symbol: str):
        await websocket.accept()
        if symbol not in self.active_connections:
            self.active_connections[symbol] = []
        self.active_connections[symbol].append(websocket)

    def disconnect(self, websocket: WebSocket, symbol: str):
        if symbol in self.active_connections:
            self.active_connections[symbol].remove(websocket)
            if not self.active_connections[symbol]:
                del self.active_connections[symbol]

    async def broadcast(self, symbol: str, message: str):
        if symbol in self.active_connections:
            for connection in self.active_connections[symbol]:
                try:
                    await connection.send_text(message)
                except WebSocketDisconnect:
                    self.disconnect(connection, symbol)

manager = ConnectionManager()

def generate_stock_price(symbol: str) -> dict:
    base_prices = {
        "AAPL": 150,
        "GOOGL": 2800,
        "MSFT": 300,
        "AMZN": 3300,
        "TSLA": 800
    }
    base = base_prices.get(symbol, 100)
    price = round(base + random.uniform(-10, 10), 2)
    return {
        "symbol": symbol,
        "price": price,
        "timestamp": datetime.now().isoformat(),
        "change": round(random.uniform(-5, 5), 2)
    }

async def send_stock_updates(websocket: WebSocket, symbol: str):
    try:
        while True:
            data = generate_stock_price(symbol)
            await websocket.send_json(data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket, symbol)
    except Exception as e:
        print(f"Error: {e}")
        manager.disconnect(websocket, symbol)

@app.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    await manager.connect(websocket, symbol)
    try:
        await send_stock_updates(websocket, symbol)
    except WebSocketDisconnect:
        manager.disconnect(websocket, symbol)

@app.get("/api/stocks")
async def get_available_stocks():
    return {
        "stocks": [
            {"symbol": "AAPL", "name": "Apple Inc."},
            {"symbol": "GOOGL", "name": "Alphabet Inc."},
            {"symbol": "MSFT", "name": "Microsoft Corporation"},
            {"symbol": "AMZN", "name": "Amazon.com Inc."},
            {"symbol": "TSLA", "name": "Tesla Inc."}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 