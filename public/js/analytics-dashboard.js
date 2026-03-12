let analyticsData = {
    pageViews: 0,
    avgLoadTime: 0,
    cartAdditions: 0,
    orders: 0,
    events: []
};

// Simulate real-time data (in production, this would connect to your analytics API)
function generateMockData() {
    analyticsData.pageViews += Math.floor(Math.random() * 5);
    analyticsData.avgLoadTime = 800 + Math.floor(Math.random() * 400);
    analyticsData.cartAdditions += Math.floor(Math.random() * 3);
    analyticsData.orders += Math.floor(Math.random() * 2);

    // Add mock events
    const eventTypes = ['page_view', 'event', 'ecommerce', 'performance'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    analyticsData.events.unshift({
        type: eventType,
        timestamp: new Date(),
        data: generateEventData(eventType)
    });

    // Keep only last 50 events
    if (analyticsData.events.length > 50) {
        analyticsData.events = analyticsData.events.slice(0, 50);
    }
}

function generateEventData(type) {
    switch (type) {
        case 'page_view':
            return { page: '/mahalakshmi-client.html', title: 'Home Page' };
        case 'event':
            return { name: 'add_to_cart', productId: Math.floor(Math.random() * 100) };
        case 'ecommerce':
            return { action: 'purchase', total: Math.floor(Math.random() * 5000) + 1000 };
        case 'performance':
            return { loadTime: Math.floor(Math.random() * 2000) + 500 };
        default:
            return {};
    }
}

function updateMetrics() {
    document.getElementById('pageViews').textContent = analyticsData.pageViews;
    document.getElementById('avgLoadTime').textContent = analyticsData.avgLoadTime;
    document.getElementById('cartAdditions').textContent = analyticsData.cartAdditions;
    document.getElementById('orders').textContent = analyticsData.orders;

    // Update load time status
    const loadTimeStatus = document.getElementById('loadTimeStatus');
    if (analyticsData.avgLoadTime < 1000) {
        loadTimeStatus.className = 'status-indicator status-good';
    } else if (analyticsData.avgLoadTime < 2000) {
        loadTimeStatus.className = 'status-indicator status-warning';
    } else {
        loadTimeStatus.className = 'status-indicator status-error';
    }

    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

function updateLog() {
    const logContainer = document.getElementById('analyticsLog');
    logContainer.innerHTML = analyticsData.events.map(event => {
        const timestamp = event.timestamp.toLocaleTimeString();
        const typeClass = `log-${event.type.replace('_', '-')}`;

        return `
            <div class="log-entry">
                <span class="log-timestamp">${timestamp}</span>
                <span class="log-type ${typeClass}">${event.type.toUpperCase()}</span>
                <span>${JSON.stringify(event.data)}</span>
            </div>
        `;
    }).join('');
}

function refreshMetrics() {
    generateMockData();
    updateMetrics();
    updateLog();
}

function clearLogs() {
    analyticsData.events = [];
    updateLog();
}

function exportData() {
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// Initialize
generateMockData();
updateMetrics();
updateLog();

// Auto-refresh every 10 seconds
setInterval(() => {
    generateMockData();
    updateMetrics();
    updateLog();
}, 10000);

// Note for production
console.log('📊 Analytics Dashboard loaded');
console.log('🔧 In production, connect this to your /api/analytics/summary endpoint');
