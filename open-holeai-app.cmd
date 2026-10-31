@echo off
rem Opens the built HoleA.I desktop app (bun run dist:win) against the VPS backend at bot.holeacquisition.com.
rem It keeps its data in .openbot\holeai-app-profile, apart from the local-backend profile of open-local-app.cmd.
rem The variables override any backend address baked into an older build.
cd /d "%~dp0"
if not exist dist\win-unpacked\OpenBot.exe (
  echo No build yet. Run: bun run dist:win
  exit /b 1
)
set OPENBOT_AUTH_API_URL=https://api.bot.holeacquisition.com
set OPENBOT_REMOTE_SIGNAL_URL=wss://signal.bot.holeacquisition.com/v1/signal
start "" dist\win-unpacked\OpenBot.exe --user-data-dir="%~dp0.openbot\holeai-app-profile" %*
