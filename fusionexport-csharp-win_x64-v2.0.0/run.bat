@echo off
echo LOG :: Starting FusionExport...
setlocal

set "CHART_CONFIG=%~1"
echo LOG :: Received chart config path: %CHART_CONFIG%

if not exist "%CHART_CONFIG%" (
    echo ❌ Chart config not found at %CHART_CONFIG%
    exit /b 1
)

echo LOG :: Starting FusionExport service...
start "FusionExportService" fusionexport-service.exe --port 1337
timeout /t 5 /nobreak >nul
echo LOG :: FusionExport service started.

set "OUTPUT_DIR=%~dp0output"
set "TIMESTAMP=%DATE:~-4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "OUTPUT_FILE=%OUTPUT_DIR%\export_%TIMESTAMP%.pdf"

echo LOG :: Output will be saved to: %OUTPUT_FILE%

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo LOG :: Sending export request...
powershell -Command ^
  "$json = Get-Content '%CHART_CONFIG%' -Raw; " ^
  "Invoke-WebRequest -Uri 'http://localhost:1337/api/v2.0/export' -Method Post -Body $json -ContentType 'application/json' -OutFile '%OUTPUT_FILE%'"

echo LOG :: Export complete.
echo OUTPUT_FILE=%OUTPUT_FILE%
exit /b 0
