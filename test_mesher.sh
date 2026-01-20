#!/bin/bash

echo "Building test_mesher..."

if [ ! -d "build_test" ]; then
    mkdir build_test
fi

cd build_test

cmake .. -DCMAKE_BUILD_TYPE=Release
if [ $? -ne 0 ]; then
    echo "CMake configuration failed!"
    exit 1
fi

cmake --build . --target test_mesher
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "Running test..."
echo "===================================="
./test_mesher
