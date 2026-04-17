@echo off
chcp 65001 >nul 2>&1
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%scripts\create-release-tag.ps1"
set "FIRST_ARG=%~1"

if not exist "%PS_SCRIPT%" (
  echo [ERROR] Missing PowerShell helper: %PS_SCRIPT%
  exit /b 1
)

where pwsh >nul 2>&1
if errorlevel 1 goto use_windows_powershell

if /I "%FIRST_ARG%"=="--dry-run" (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -DryRun
) else (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
)
exit /b %ERRORLEVEL%

:use_windows_powershell
if /I "%FIRST_ARG%"=="--dry-run" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -DryRun
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
)
exit /b %ERRORLEVEL%
