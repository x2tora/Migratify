@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "release-dist\win-unpacked\Migratify.exe" (
    start "" "release-dist\win-unpacked\Migratify.exe"
) else (
    npx electron .
)
