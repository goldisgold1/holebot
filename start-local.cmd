@echo off
rem HoleA.I local test backend: the account API (127.0.0.1:3100) and Signal (3101) on this PC.
rem Keep this window open, then run open-local-app.cmd to use the built desktop app against it.
rem Sign-in uses the access codes in .openbot\access-hashes.json.
rem Add a person with: bun deploy\vps\add-user.ts --local someone@holeacquisition.com
cd /d "%~dp0"
if not exist .openbot\access-hashes.json (
  echo No .openbot\access-hashes.json yet. Add someone first: bun deploy\vps\add-user.ts --local you@holeacquisition.com
  exit /b 1
)
set /p AUTH_ACCESS_CODE_HASHES=<.openbot\access-hashes.json
bun scripts/dev-services.ts backend
