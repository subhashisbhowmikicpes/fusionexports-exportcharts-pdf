@echo off

SET FE_REL_PATH=fusionexport-service.exe
SET FE_DIR=%~dp0

SET FE_FULL_PATH=%FE_DIR%\%FE_REL_PATH%

if not exist "%FE_FULL_PATH%" (
    echo "FusionExport Service executable is not found, aborting."
    exit /b 1
)

"%FE_FULL_PATH%" %*