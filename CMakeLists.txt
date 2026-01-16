cmake_minimum_required(VERSION 3.30)
project(occt-wasm)
set(CMAKE_CXX_STANDARD 17)
set(TARGET occt-wasm)

# ------------------------------------------------------------
# Build type
# ------------------------------------------------------------
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_NINJA_FORCE_RESPONSE_FILE 1 CACHE INTERNAL "")

# ------------------------------------------------------------
# OCCT source root
# ------------------------------------------------------------
set(OCCT_SOURCE_DIR "${CMAKE_SOURCE_DIR}/source/occt")

# ------------------------------------------------------------
# 1. Define OCCT toolkits to include
# ------------------------------------------------------------
# 基础 + 建模 + 数据交换 + STEP / STEPCAF，但不编译渲染模块
set(OCCT_TOOLKITS
    # FoundationClasses
    TKernel TKMath
    # ModelingData 
    TKBRep TKG3d TKG2d TKGeomBase
    # ModelingAlgorithms
    TKGeomAlgo TKTopAlgo TKPrim TKBO TKBool TKHLR TKFillet TKOffset TKFeat TKMesh TKShHealing
    # DataExchange
    # TKDE TKXSBase TKDESTEP TKDEIGES TKDESTL
)

# ------------------------------------------------------------
# 2. Collect PACKAGES
# ------------------------------------------------------------
set(OCCT_USED_PACKAGES "")
foreach(toolkit ${OCCT_TOOLKITS})
    set(PACKAGES_FILE "${OCCT_SOURCE_DIR}/src/${toolkit}/PACKAGES")
    if(EXISTS "${PACKAGES_FILE}")
        file(STRINGS "${PACKAGES_FILE}" PKGS)
        list(APPEND OCCT_USED_PACKAGES ${PKGS})
    endif()
endforeach()
list(REMOVE_DUPLICATES OCCT_USED_PACKAGES)

# ------------------------------------------------------------
# 3. Exclude modules that require TDF/XCAF
# ------------------------------------------------------------
# list(REMOVE_ITEM OCCT_USED_PACKAGES
#     TDF
#     TDataStd
#     TDocStd
#     XCAFDoc
#     XCAFDimTolObjects
#     XCAFNoteObjects
#     XCAFPrs
#     XCAFView
#     TKCAF
#     TKCDF
#     TKLCAF
#     AppStd
# )

# ------------------------------------------------------------
# 4. Include directories
# ------------------------------------------------------------
set(OCCT_INCLUDE_DIRS "")
foreach(pkg ${OCCT_USED_PACKAGES})
    list(APPEND OCCT_INCLUDE_DIRS "${OCCT_SOURCE_DIR}/src/${pkg}")
endforeach()
list(APPEND OCCT_INCLUDE_DIRS
    "${OCCT_SOURCE_DIR}/src"
    "${CMAKE_CURRENT_BINARY_DIR}/include"
)

# ------------------------------------------------------------
# 5. Collect OCCT sources
# ------------------------------------------------------------
set(OCCT_SOURCES "")
foreach(pkg ${OCCT_USED_PACKAGES})
    file(GLOB PKG_SRCS CONFIGURE_DEPENDS
        "${OCCT_SOURCE_DIR}/src/${pkg}/*.cxx"
        "${OCCT_SOURCE_DIR}/src/${pkg}/*.cpp"
    )
    list(APPEND OCCT_SOURCES ${PKG_SRCS})
endforeach()
list(REMOVE_DUPLICATES OCCT_SOURCES)
list(LENGTH OCCT_SOURCES OCCT_SOURCES_COUNT)
message(STATUS "Total OCCT source files: ${OCCT_SOURCES_COUNT}")

# ------------------------------------------------------------
# 6. Standard_Version.hxx
# ------------------------------------------------------------
include("${OCCT_SOURCE_DIR}/adm/cmake/version.cmake")
configure_file(
    "${OCCT_SOURCE_DIR}/adm/templates/Standard_Version.hxx.in"
    "${CMAKE_CURRENT_BINARY_DIR}/include/Standard_Version.hxx"
    @ONLY
)

# ------------------------------------------------------------
# 7. User sources
# ------------------------------------------------------------
file(GLOB_RECURSE MY_SOURCES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/math/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/math/*.cxx"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/brep/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/brep/*.cxx"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/geometry/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/geometry/*.cxx"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/utils/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/utils/*.cxx"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/mesher/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/mesher/*.cxx"
)

# ------------------------------------------------------------
# 8. Target (Emscripten)
# ------------------------------------------------------------
include_directories(${OCCT_INCLUDE_DIRS})

if(EMSCRIPTEN)
    # 编译 OCCT 库
    add_library(occt STATIC ${OCCT_SOURCES})
    target_include_directories(occt PUBLIC ${OCCT_INCLUDE_DIRS})
    target_compile_options(occt PUBLIC
        $<$<CONFIG:Release>:-Os>
        $<$<CONFIG:Release>:-flto>
        -DOCCT_NO_PLUGINS
    )

    # 编译 wasm 可执行文件
    add_executable(${TARGET} ${MY_SOURCES})
    target_include_directories(${TARGET} PUBLIC ${OCCT_INCLUDE_DIRS})
    target_compile_options(${TARGET} PUBLIC
        $<$<CONFIG:Release>:-Os>
        $<$<CONFIG:Release>:-flto>
    )
    target_link_libraries(${TARGET} PUBLIC occt)
    target_link_options(${TARGET} PUBLIC
        -sMODULARIZE=1
        -sEXPORT_ES6=1
        -sSTACK_SIZE=8MB
        -sINITIAL_HEAP=64MB
        -sALLOW_MEMORY_GROWTH=1
        -sMAXIMUM_MEMORY=4GB
        -sENVIRONMENT=web,worker
        --bind
        --emit-tsd "${TARGET}.d.ts"
    )

    install(TARGETS ${TARGET} DESTINATION "${CMAKE_SOURCE_DIR}/packages/occt-wasm/lib")
    install(FILES "${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.wasm" DESTINATION "${CMAKE_SOURCE_DIR}/packages/occt-wasm/lib")
    install(FILES "${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.d.ts" DESTINATION "${CMAKE_SOURCE_DIR}/packages/occt-wasm/lib")
endif()
