@echo off
cd /d "%~dp0"
echo Iniciando Cicchetti Reservas...
echo.
echo Cuando veas "Cicchetti reservas", abri:
echo http://127.0.0.1:8080
echo.
"C:\Users\smpar\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" server.py
pause
