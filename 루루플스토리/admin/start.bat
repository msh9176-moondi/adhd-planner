@echo off
echo 관리자 페이지 서버 시작...
echo http://127.0.0.1:3001 에서 접속하세요
echo 종료하려면 Ctrl+C
echo.
python -m http.server 3001
pause
