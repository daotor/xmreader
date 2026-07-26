@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "OUTPUT_DIR=%PROJECT_DIR%build\bin"
set "WAILS=%GOPATH%\bin\wails.exe"
set "EXE_NAME=xmreader.exe"

echo ============================================
echo   XMReader: one-click build
echo ============================================
echo.

:: 1. Check dependencies
echo [1/6] Checking environment...
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
if not exist "%WAILS%" (
    echo   [ERROR] wails not found: %WAILS%
    goto :fail
)
echo   Go / bun / wails: OK

:: 2. Install frontend deps
echo.
echo [2/6] Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
call bun install >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] bun install
    goto :fail
)
echo   Done

:: 3. Build frontend
echo.
echo [3/6] Building frontend (Vite)...
call bunx vite build
if errorlevel 1 (
    echo   [FAIL] vite build
    goto :fail
)
echo   Done

:: 4. Prepare Wails build assets from the canonical app icon
echo.
echo [4/6] Preparing application icon...
cd /d "%PROJECT_DIR%"
go run ./scripts/buildassets
if errorlevel 1 (
    echo   [FAIL] application icon preparation
    goto :fail
)
echo   Done

:: 5. Compile exe with Wails production tags and embedded WebView2 bootstrapper
echo.
echo [5/6] Compiling exe (Go + Wails)...
"%WAILS%" build -clean -o "%EXE_NAME%" -webview2 embed -s -skipbindings
if errorlevel 1 (
    echo   [FAIL] wails build
    goto :fail
)
echo   Done

:: 6. Result
echo.
echo [6/6] Build success!
for %%F in ("%OUTPUT_DIR%\%EXE_NAME%") do (
    echo   Output: %%~nxF
    echo   Path:   %%~fF
    echo   Size:   %%~zF bytes (~%%~zF,00 bytes)
)

echo.
echo ============================================
echo   Usage:
echo     %EXE_NAME% test.md       - open a file
echo     %EXE_NAME% test.mdc      - open an AI rules file
echo     %EXE_NAME% --register    - associate .md / .mdc files
echo     build-installer.bat      - generate NSIS installer
echo ============================================
echo.
pause
exit /b 0

:fail
echo.
echo   *** BUILD FAILED ***
pause
exit /b 1
