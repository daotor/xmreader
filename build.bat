@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "OUTPUT_DIR=%PROJECT_DIR%build\bin"
set "WAILS=%GOPATH%\bin\wails.exe"
set "EXE_NAME=kmread.exe"

echo ============================================
echo   KMRead: one-click build
echo ============================================
echo.

:: 1. Check dependencies
echo [1/5] Checking environment...
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
echo [2/5] Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
call bun install >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] bun install
    goto :fail
)
echo   Done

:: 3. Build frontend
echo.
echo [3/5] Building frontend (Vite)...
call bunx vite build
if errorlevel 1 (
    echo   [FAIL] vite build
    goto :fail
)
echo   Done

:: 4. Compile exe (skip bindings generation so main() won't block)
echo.
echo [4/5] Compiling exe (Go + Wails)...
cd /d "%PROJECT_DIR%"
"%WAILS%" build -o "%EXE_NAME%" -s -skipbindings
if errorlevel 1 (
    echo   [FAIL] wails build
    goto :fail
)
echo   Done

:: 5. Result
echo.
echo [5/5] Build success!
for %%F in ("%OUTPUT_DIR%\%EXE_NAME%") do (
    echo   Output: %%~nxF
    echo   Path:   %%~fF
    echo   Size:   %%~zF bytes (~%%~zF,00 bytes)
)

echo.
echo ============================================
echo   Usage:
echo     %EXE_NAME% test.md       - open a file
echo     %EXE_NAME% --register    - associate .md files
echo ============================================
echo.
pause
exit /b 0

:fail
echo.
echo   *** BUILD FAILED ***
pause
exit /b 1
