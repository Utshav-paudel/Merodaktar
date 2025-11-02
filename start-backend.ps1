Write-Host "🚀 Starting MeroDaktar Backend..." -ForegroundColor Cyan

# Activate virtual environment if it exists
if (Test-Path ".\md\Scripts\Activate.ps1") {
    & .\md\Scripts\Activate.ps1
}

# Navigate to app directory and run
Set-Location app
Write-Host "Backend running on http://localhost:8000" -ForegroundColor Green
Write-Host "API Documentation: http://localhost:8000/docs`n" -ForegroundColor Yellow
python main.py
