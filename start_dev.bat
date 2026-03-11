@echo off
echo =========================================
echo  Starting Universal Video Downloader...
echo =========================================
echo.

echo [Setup 1/2] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo  - node_modules not found. Running npm install in frontend...
    cd frontend
    npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. Please check your Node.js installation and try again.
        pause
        exit /b 1
    )
    cd ..
    echo  - Frontend dependencies installed.
) else (
    echo  - Frontend dependencies already installed.
)
echo.

echo [Setup 2/2] Checking backend dependencies...
if not exist "backend\venv" (
    echo  - venv not found. Creating virtual environment and installing dependencies...
    cd backend
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create Python virtual environment. Please check your Python installation.
        cd ..
        pause
        exit /b 1
    )
    call venv\Scripts\activate
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: pip install failed. Please check requirements.txt and try again.
        deactivate
        cd ..
        pause
        exit /b 1
    )
    deactivate
    cd ..
    echo  - Backend dependencies installed.
) else (
    echo  - Backend dependencies already installed.
)
echo.

echo [1/2] Starting Backend Server (FastAPI on port 8000)...
start "Backend Server" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Starting Frontend Server (React/Vite on port 5173)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo.
echo Access the interface at: http://localhost:5173
echo Access from phone at:    http://YOUR-PC-IP:5173  (same WiFi)
echo Access the API docs at:  http://localhost:8000/docs
echo.
echo To stop the servers, simply close the two new command prompt windows that popped up.
pause
