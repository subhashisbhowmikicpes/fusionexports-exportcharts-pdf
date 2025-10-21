@echo off
echo LOG :: Starting FusionExport...
setlocal

REM Get chart config path from argument
@REM set "CHART_CONFIG=%~1"
set "CHART_CONFIG=%~dp0chartConfig.json"


REM Validate input
if not exist "%CHART_CONFIG%" (
    echo ❌ Chart config not found at %CHART_CONFIG%
    exit /b 1
)

echo LOG :: Using chart config: %CHART_CONFIG%

REM Start FusionExport service
start "FusionExportService" fusionexport-service.exe --port 1337
timeout /t 5 /nobreak >nul

echo LOG :: FusionExport service started.

REM Prepare output path
set "OUTPUT_DIR=%~dp0output"
set "TIMESTAMP=%DATE:~-4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "OUTPUT_FILE=%OUTPUT_DIR%\export_%TIMESTAMP%.pdf"

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Send export request
powershell -Command ^
  "$json = Get-Content '%CHART_CONFIG%' -Raw; " ^
  "Invoke-WebRequest -Uri 'http://localhost:1337/api/v2.0/export' -Method Post -Body $json -ContentType 'application/json' -OutFile '%OUTPUT_FILE%'"

REM Output path for Azure Function to read
echo %OUTPUT_FILE%

exit /b 0
