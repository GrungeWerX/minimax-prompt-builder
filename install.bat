@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ============================================
echo   Minimax Prompt Builder - Installer
echo ============================================
echo.
where py >nul 2>&1
if %errorlevel%==0 (
    set "PYLAUNCH=py -3"
) else (
    where python >nul 2>&1
    if !errorlevel!==0 (
        set "PYLAUNCH=python"
    ) else (
        echo [ERROR] Python was not found on this system.
        echo Install Python 3.10+ from https://www.python.org/downloads/
        echo and make sure to check "Add python.exe to PATH" during setup.
        echo.
        pause
        exit /b 1
    )
)
echo Using: %PYLAUNCH%
echo.
if exist "venv\" (
    echo A virtual environment already exists in .\venv - reusing it.
) else (
    echo Creating local virtual environment in .\venv ...
    %PYLAUNCH% -m venv venv
    if not exist "venv\Scripts\python.exe" (
        echo [ERROR] Failed to create the virtual environment.
        pause
        exit /b 1
    )
)
echo.
echo Installing dependencies (this only touches the local venv) ...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Dependency install failed. Check your internet connection and try again.
    pause
    exit /b 1
)
echo.
echo ============================================
echo   Install complete!
echo   Run "run.bat" any time to open the app.
echo ============================================
echo.
pause
