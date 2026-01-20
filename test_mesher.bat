@echo off
echo Building test_mesher...

if not exist build_test mkdir build_test
cd build_test

cmake .. -DCMAKE_BUILD_TYPE=Release
if %errorlevel% neq 0 (
    echo CMake configuration failed!
    pause
    exit /b 1
)

cmake --build . --target test_mesher --config Release
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Running test...
echo ====================================

REM Try to find the executable in Release or Debug directory
if exist "Release\test_mesher.exe" (
    Release\test_mesher.exe
) else if exist "Debug\test_mesher.exe" (
    Debug\test_mesher.exe
) else if exist "test_mesher.exe" (
    test_mesher.exe
) else (
    echo Error: test_mesher.exe not found!
    echo Please check the build output directory.
    pause
    exit /b 1
)

pause
