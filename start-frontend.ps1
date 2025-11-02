Write-Host "🎨 Starting MeroDaktar Frontend..." -ForegroundColor Cyan

Set-Location frontend
Write-Host "Frontend running on http://localhost:5176" -ForegroundColor Green
Write-Host "  - Patient Portal: http://localhost:5176/login" -ForegroundColor Yellow
Write-Host "  - Doctor Portal:  http://localhost:5176/doctor/login`n" -ForegroundColor Yellow
npm run dev
