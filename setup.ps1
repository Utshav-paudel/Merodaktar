# MeroDaktar v2 - Quick Start Guide

Write-Host "🩺 MeroDaktar v2 - Quick Start" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if virtual environment exists
if (Test-Path ".\md\Scripts\Activate.ps1") {
    Write-Host "✓ Virtual environment found" -ForegroundColor Green
    Write-Host "Activating virtual environment...`n" -ForegroundColor Yellow
    & .\md\Scripts\Activate.ps1
} else {
    Write-Host "⚠ Virtual environment not found at .\md\" -ForegroundColor Yellow
    Write-Host "Please ensure you're in the project root directory`n" -ForegroundColor Yellow
}

# Check if .env file exists
if (-not (Test-Path ".\app\.env")) {
    Write-Host "⚠ .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".\app\.env.example" ".\app\.env"
    Write-Host "✓ Created .env file. Please add your API keys!`n" -ForegroundColor Green
    Write-Host "Edit app\.env and add:" -ForegroundColor Yellow
    Write-Host "  - OPENAI_API_KEY (required)" -ForegroundColor Yellow
    Write-Host "  - GEMINI_API_KEY (optional)`n" -ForegroundColor Yellow
    
    $continue = Read-Host "Press Enter to continue or Ctrl+C to exit and configure .env first"
}

Write-Host "`n📦 Installing Backend Dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "`n📦 Installing Frontend Dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
Set-Location ..

Write-Host "`n✨ Setup Complete!" -ForegroundColor Green
Write-Host "`nTo start the application:" -ForegroundColor Cyan
Write-Host "  1. Backend:  cd app && python main.py" -ForegroundColor White
Write-Host "  2. Frontend: cd frontend && npm run dev`n" -ForegroundColor White

Write-Host "Or use separate terminals:" -ForegroundColor Cyan
Write-Host "  Terminal 1: .\start-backend.ps1" -ForegroundColor White
Write-Host "  Terminal 2: .\start-frontend.ps1`n" -ForegroundColor White

Write-Host "Access the application at: http://localhost:5176" -ForegroundColor Green
Write-Host "  - Patient Portal: http://localhost:5176/login" -ForegroundColor Yellow
Write-Host "  - Doctor Portal:  http://localhost:5176/doctor/login`n" -ForegroundColor Yellow
