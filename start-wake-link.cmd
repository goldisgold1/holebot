@echo off
rem HoleA.I wake link: lets hole.fm wake the OpenBot agents on this PC until the VPS exists.
rem Runs the wake bridge (127.0.0.1:8790, deploy\vps\wake-hooks.json) and an SSH tunnel that opens
rem 127.0.0.1:18790 on the hole.fm VPS back to it. A bot's hole.fm wake URL is then
rem http://127.0.0.1:18790/hook/<bot> with the hob_ key that deploy\vps\add-wake-hook.ts prints.
rem Needs start-local.cmd (Signal on 3101) and the desktop app running. Keep this window open.
cd /d "%~dp0"
if not exist deploy\vps\wake-hooks.json echo {}> deploy\vps\wake-hooks.json
set WAKE_HOOKS_PATH=%~dp0deploy\vps\wake-hooks.json
set SIGNAL_INTERNAL_URL=http://127.0.0.1:3101
start "HoleA.I wake bridge" /min bun deploy\vps\wake-bridge\server.ts
:tunnel
ssh -i "%USERPROFILE%\.ssh\openclaw_nerve_vps" -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 127.0.0.1:18790:127.0.0.1:8790 root@194.233.80.34
echo Tunnel closed; reconnecting in 10 seconds.
timeout /t 10 /nobreak >nul
goto tunnel
