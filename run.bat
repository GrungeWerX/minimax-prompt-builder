@echo off
cd /d "%~dp0"
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] No virtual environment found. Run install.bat first.
    pause
    exit /b 1
)
call venv\Scripts\activate.bat
echo Starting Minimax Prompt Builder ...
echo (this window must stay open while you use the app - close it to quit)
echo.
python app.py
pause
