@echo off
REM Netra Backend - Django Development Server
REM Runs on http://localhost:8000

cd /d "%~dp0"

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found. Run: py -3.12 -m venv venv
    echo Then: venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo Starting Netra backend at http://localhost:8000
echo Health check: http://localhost:8000/api/health/
echo.
python manage.py runserver 0.0.0.0:8000 --noreload
