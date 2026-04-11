@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "WAILS=%GOPATH%\bin\wails.exe"
set "EXE_NAME=xmreader.exe"

echo ============================================
echo   XMReader: Windows installer build
echo ============================================
echo.

where go >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Go not installed
    goto :fail
)
where bun >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] bun not installed
    goto :fail
)
where makensis >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] makensis not found
    echo           Install NSIS first: https://nsis.sourceforge.io/Download
    goto :fail
)
if not exist "%WAILS%" (
    echo   [ERROR] wails not found: %WAILS%
    goto :fail
)
echo   Go / bun / makensis / wails: OK

echo.
echo [1/4] Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
call bun install
if errorlevel 1 goto :fail

echo.
echo [2/4] Building frontend...
call bun run build
if errorlevel 1 goto :fail

echo.
echo [3/4] Building Windows installer...
cd /d "%PROJECT_DIR%"
"%WAILS%" build -clean -s -skipbindings -webview2 embed -nsis -o "%EXE_NAME%"
if errorlevel 1 goto :fail

echo.
echo [4/4] Done
echo   Check build\bin for the generated NSIS installer package.
pause
exit /b 0

:fail
echo.
echo   *** BUILD FAILED ***
pause
exit /b 1
