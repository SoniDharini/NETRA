# Netra Backend - Django Development Server
# Runs on http://localhost:8000

Set-Location $PSScriptRoot

if (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "Virtual environment not found. Run: py -3.12 -m venv venv"
    Write-Host "Then: .\venv\Scripts\pip install -r requirements.txt"
    exit 1
}

Write-Host "Starting Netra backend at http://localhost:8000"
Write-Host "Health check: http://localhost:8000/api/health/"
Write-Host "Using --noreload for faster startup (omit for auto-reload during dev)"
Write-Host ""
python manage.py runserver 0.0.0.0:8000 --noreload
