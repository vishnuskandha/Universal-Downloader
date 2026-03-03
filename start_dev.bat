@echo off
echo =========================================
echo  Starting Universal Video Downloader...
echo =========================================
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
