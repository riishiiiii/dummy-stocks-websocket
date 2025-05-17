class StockDashboard {
    constructor() {
        this.stocks = new Map();
        this.connections = new Map();
        this.priceHistory = new Map();
        this.chart = null;
        this.selectedStock = null;
        this.lastPrice = new Map();
        this.initializeElements();
        this.initializeChart();
        this.loadAvailableStocks();
    }

    initializeElements() {
        this.stockList = document.getElementById('stockList');
        this.currentPriceElement = document.getElementById('currentPrice');
        this.priceChangeElement = document.getElementById('priceChange');
        this.listItemTemplate = document.getElementById('stockListItemTemplate');
    }

    initializeChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');
        
        // Create gradient for the chart
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(41, 98, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(41, 98, 255, 0)');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price',
                    data: [],
                    borderColor: '#2962ff',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#2962ff',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(45, 45, 45, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#3d3d3d',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `$${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#b0b0b0',
                            maxRotation: 0
                        }
                    },
                    y: {
                        position: 'right',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#b0b0b0',
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }

    async loadAvailableStocks() {
        try {
            const response = await fetch('http://localhost:8000/api/stocks');
            const data = await response.json();
            
            data.stocks.forEach(stock => {
                this.addStockToList(stock);
                this.connectWebSocket(stock.symbol);
                // Initialize price history for each stock
                this.priceHistory.set(stock.symbol, []);
            });

            // Select the first stock by default
            if (data.stocks.length > 0) {
                this.selectStock(data.stocks[0].symbol);
            }
        } catch (error) {
            console.error('Error loading stocks:', error);
            this.showError('Failed to load available stocks');
        }
    }

    addStockToList(stock) {
        const item = this.listItemTemplate.content.cloneNode(true);
        const listItem = item.querySelector('.stock-list-item');
        listItem.dataset.symbol = stock.symbol;
        
        listItem.querySelector('.stock-symbol').textContent = stock.symbol;
        listItem.querySelector('.stock-name').textContent = stock.name;

        listItem.addEventListener('click', () => this.selectStock(stock.symbol));
        
        this.stockList.appendChild(listItem);
        this.stocks.set(stock.symbol, listItem);
    }

    selectStock(symbol) {
        // Update active state in sidebar
        const listItems = this.stockList.querySelectorAll('.stock-list-item');
        listItems.forEach(item => {
            item.classList.toggle('active', item.dataset.symbol === symbol);
        });

        this.selectedStock = symbol;
        this.updateChart();
        
        // Update header with current price if available
        const listItem = this.stocks.get(symbol);
        if (listItem) {
            const price = listItem.querySelector('.price').textContent.replace('$', '');
            const change = listItem.querySelector('.change').textContent.replace('%', '');
            this.updateHeaderInfo(symbol, parseFloat(price), parseFloat(change));
        }
    }

    connectWebSocket(symbol) {
        const ws = new WebSocket(`ws://localhost:8000/ws/${symbol}`);
        
        ws.onopen = () => {
            console.log(`Connected to ${symbol} WebSocket`);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.updateStockListItem(symbol, data);
            this.updatePriceHistory(symbol, data);
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for ${symbol}:`, error);
            this.showError(`Connection error for ${symbol}`);
        };

        ws.onclose = () => {
            console.log(`Disconnected from ${symbol} WebSocket`);
            this.connections.delete(symbol);
        };

        this.connections.set(symbol, ws);
    }

    updateStockListItem(symbol, data) {
        const listItem = this.stocks.get(symbol);
        if (!listItem) return;

        const priceElement = listItem.querySelector('.price');
        const changeElement = listItem.querySelector('.change');

        const lastPrice = this.lastPrice.get(symbol) || data.price;
        const priceChange = ((data.price - lastPrice) / lastPrice) * 100;
        this.lastPrice.set(symbol, data.price);

        priceElement.textContent = `$${data.price.toFixed(2)}`;
        changeElement.textContent = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
        changeElement.className = `change ${priceChange >= 0 ? 'positive' : 'negative'}`;

        if (symbol === this.selectedStock) {
            this.updateHeaderInfo(symbol, data.price, priceChange);
        }
    }

    updateHeaderInfo(symbol, price, change) {
        if (!symbol) {
            this.currentPriceElement.textContent = '$0.00';
            this.priceChangeElement.textContent = '0.00%';
            this.priceChangeElement.className = 'price-change';
            return;
        }

        this.currentPriceElement.textContent = `$${price.toFixed(2)}`;
        this.priceChangeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        this.priceChangeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    updatePriceHistory(symbol, data) {
        if (!this.priceHistory.has(symbol)) {
            this.priceHistory.set(symbol, []);
        }

        const history = this.priceHistory.get(symbol);
        history.push({
            price: data.price,
            timestamp: new Date(data.timestamp)
        });

        // Keep only last 100 data points
        if (history.length > 100) {
            history.shift();
        }

        if (symbol === this.selectedStock) {
            this.updateChart();
        }
    }

    updateChart() {
        if (!this.selectedStock || !this.priceHistory.has(this.selectedStock)) {
            return;
        }

        const history = this.priceHistory.get(this.selectedStock);
        if (history.length === 0) return;

        const labels = history.map(point => 
            point.timestamp.toLocaleTimeString()
        );
        const data = history.map(point => point.price);

        // Update chart data
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;

        // Update Y-axis range
        const min = Math.min(...data) * 0.999;
        const max = Math.max(...data) * 1.001;
        this.chart.options.scales.y.min = min;
        this.chart.options.scales.y.max = max;

        // Update chart title
        this.chart.options.plugins.title = {
            display: true,
            text: `${this.selectedStock} Price History`,
            color: '#fff',
            font: {
                size: 16,
                weight: '500'
            }
        };

        this.chart.update('none'); // Update without animation
    }

    showError(message) {
        console.error(message);
        // You could implement a more sophisticated error display system
        alert(message);
    }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StockDashboard();
}); 