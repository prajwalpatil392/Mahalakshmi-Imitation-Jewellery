# Test Revenue Calculation
Write-Host "`n=== Testing Revenue Calculation ===" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/orders" -UseBasicParsing
    $orders = $response.Content | ConvertFrom-Json
    
    Write-Host "`nTotal Orders: $($orders.Count)" -ForegroundColor Yellow
    
    $confirmedOrders = $orders | Where-Object { $_.status -eq 'Confirmed' }
    Write-Host "Confirmed Orders: $($confirmedOrders.Count)" -ForegroundColor Yellow
    
    $totalRevenue = 0
    foreach ($order in $confirmedOrders) {
        $amount = [double]$order.total
        $totalRevenue += $amount
        Write-Host "  Order $($order.order_id): ₹$amount"
    }
    
    Write-Host "`nTotal Revenue: ₹$totalRevenue" -ForegroundColor Green
    Write-Host "Formatted: ₹$($totalRevenue.ToString('N0'))" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===`n" -ForegroundColor Cyan
