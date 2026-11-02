@echo off
rem Opens the built HoleA.I desktop app (bun run dist:win) against the local backend from start-local.cmd.
rem It keeps its data in .openbot\local-app-profile, so it runs next to an installed HoleBot without sharing data.
rem Publish the server (Server settings > Members) and the web app at http://localhost:3100/app can connect to it.
cd /d "%~dp0"
set APP_EXE=dist\win-unpacked\HoleBot.exe
rem Builds from before the HoleBot name have OpenBot.exe.
if not exist %APP_EXE% set APP_EXE=dist\win-unpacked\OpenBot.exe
if not exist %APP_EXE% (
  echo No build yet. Run: bun run dist:win
  exit /b 1
)
set OPENBOT_AUTH_API_URL=http://127.0.0.1:3100
start "" %APP_EXE% --user-data-dir="%~dp0.openbot\local-app-profile" %*
