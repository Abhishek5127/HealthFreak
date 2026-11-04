@echo off
echo ==============================================
echo   HealthFreak Voice & Auth Services Starter
echo ==============================================
echo.
echo Starting backend server on port 3001...
start "HealthFreak Backend" cmd /k "npm --prefix server run dev"
timeout /t 3 /nobreak >nul
echo.
echo Starting Cloudflare Tunnel...
start "HealthFreak Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:3001"
echo.
echo Services launched! Check the Cloudflare window for your trycloudflare.com URL.
pause

