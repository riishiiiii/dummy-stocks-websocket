# Real-Time Stock Price Dashboard

A real-time stock price monitoring application built with FastAPI and WebSockets, featuring a modern, responsive frontend.

## Features

- Real-time stock price updates using WebSockets
- Interactive price charts with Chart.js
- Responsive dark-themed UI
- Live price changes with color-coded indicators
- Historical price tracking (last 100 data points)
- Multiple stock monitoring
- Professional trading platform-like interface

## Tech Stack

### Backend
- FastAPI (Python web framework)
- WebSockets for real-time communication
- Python 3.7+

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Chart.js for interactive charts
- WebSocket API for real-time updates
- Modern CSS with CSS variables and Flexbox

## Project Structure

```
.
├── main.py              # FastAPI backend server
├── frontend/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # Styling
│   └── app.js          # Frontend logic
└── README.md           # This file
```

## Setup and Installation

1. Clone the repository:
```bash
git clone https://github.com/riishiiiii/dummy-stocks-websocket
cd dummy-stocks-websocket
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
uvicorn main:app --reload
```

5. Open the frontend:
   - Open `frontend/index.html` in your browser
   - Or serve it using a local server

## Usage

1. The application will automatically load available stocks
2. Click on any stock in the sidebar to view its price chart
3. Real-time price updates will be displayed in the chart
4. Price changes are color-coded:
   - Green: Positive change
   - Red: Negative change

## WebSocket Implementation

The application uses WebSockets for real-time communication:

### Backend (FastAPI)
```python
@app.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    await websocket.accept()
    while True:
        # Generate and send price updates
        price = generate_price(symbol)
        await websocket.send_json({
            "symbol": symbol,
            "price": price,
            "timestamp": datetime.now().isoformat()
        })
        await asyncio.sleep(1)
```

### Frontend (JavaScript)
```javascript
connectWebSocket(symbol) {
    const ws = new WebSocket(`ws://localhost:8000/ws/${symbol}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.updateStockListItem(symbol, data);
        this.updatePriceHistory(symbol, data);
    };
}
```

## Features in Detail

### Real-Time Updates
- WebSocket connection for each stock
- Automatic reconnection on disconnection
- Smooth price updates with animations

### Chart Features
- Interactive tooltips
- Dynamic Y-axis scaling
- Gradient fill for better visualization
- Price formatting with currency symbols
- Time-based X-axis

### UI Components
- Responsive sidebar with stock list
- Price change indicators
- Current price display
- Professional dark theme
- Mobile-friendly design

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.
