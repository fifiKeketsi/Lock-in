@echo off
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\Git\bin;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo Pushing project to https://github.com/fifiKeketsi/Lock-in
echo ========================================================
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo Successfully pushed to GitHub!
) else (
    echo Push failed. Please check the error message above.
)
echo.
pause
