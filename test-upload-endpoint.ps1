# Test Upload Endpoint
Write-Host "`n=== Testing Upload Endpoint ===" -ForegroundColor Cyan

# Test if endpoint exists
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/upload/product" -Method POST -UseBasicParsing -ErrorAction Stop
    Write-Host "Response: $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Endpoint exists (400 = No file uploaded - expected)" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Test Complete ===`n" -ForegroundColor Cyan
