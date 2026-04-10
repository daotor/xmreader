@echo off
setlocal enabledelayedexpansion
set r=%~dp0
cd /d !r!

git.exe pull --no-rebase "origin"

git add .

git commit -m "sync"

git push origin

pause...