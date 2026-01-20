# Mesher 测试程序

## 编译测试程序

### 方法1: 使用CMake（推荐）

在项目根目录下：

```bash
mkdir -p build_test
cd build_test
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --target test_mesher
./test_mesher
```

### 方法2: 直接编译（如果OCCT已安装）

```bash
g++ -std=c++17 \
    -I/path/to/occt/include \
    -I../.. \
    test_mesher.cpp Mesher.cpp \
    -L/path/to/occt/lib \
    -lTKernel -lTKMath -lTKBRep -lTKG3d -lTKG2d -lTKGeomBase \
    -lTKGeomAlgo -lTKTopAlgo -lTKPrim -lTKMesh \
    -o test_mesher
```

## 运行测试

```bash
./test_mesher
```

测试程序会：
1. 创建一个Box并测试shapeToBRepResult
2. 创建一个Cylinder并测试shapeToBRepResult
3. 测试不同离散化参数的效果

输出会显示：
- 所有顶点的hash和坐标
- 所有边的信息（包括离散化点）
- 所有Wire的信息
- 所有Face的信息（path和holes）
