@echo off
echo ============================================================
echo Starting Frontend Server for Recurring Tasks Testing
echo ============================================================
echo.

cd frontend

echo Starting Next.js development server...
echo Frontend will be available at http://localhost:3000
echo.
echo Press CTRL+C to stop the server
echo ============================================================
echo.

start "" npm run dev
