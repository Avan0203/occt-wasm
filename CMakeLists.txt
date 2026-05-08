cmake_minimum_required(VERSION 3.30)
project(occt-wasm)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
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
    # Visualization
    TKService TKV3d
    # XCAF Framework
    TKCDF TKLCAF TKCAF TKVCAF TKXCAF
    # DataExchange
    TKDE TKXSBase TKDESTEP TKDEIGES TKDESTL
)

# ------------------------------------------------------------
# 2. Collect toolkit/package mapping (OCCT 8.0 layout)
# src/<Module>/<Toolkit>/<Package>
# ------------------------------------------------------------
include("${OCCT_SOURCE_DIR}/src/MODULES.cmake")

set(OCCT_TOOLKIT_PACKAGE_DIRS "")
set(OCCT_PACKAGE_DIRS "")
foreach(toolkit ${OCCT_TOOLKITS})
    set(TOOLKIT_FOUND FALSE)

    foreach(module ${OCCT_LIST_OF_MODULES})
        set(MODULE_TOOLKITS_FILE "${OCCT_SOURCE_DIR}/src/${module}/TOOLKITS.cmake")
        if(NOT EXISTS "${MODULE_TOOLKITS_FILE}")
            continue()
        endif()

        include("${MODULE_TOOLKITS_FILE}")
        set(MODULE_TOOLKITS_VAR "OCCT_${module}_LIST_OF_TOOLKITS")
        if(NOT DEFINED ${MODULE_TOOLKITS_VAR})
            continue()
        endif()

        list(FIND ${MODULE_TOOLKITS_VAR} "${toolkit}" TOOLKIT_INDEX)
        if(TOOLKIT_INDEX EQUAL -1)
            continue()
        endif()

        set(TOOLKIT_DIR "${OCCT_SOURCE_DIR}/src/${module}/${toolkit}")
        set(PACKAGES_CMAKE_FILE "${TOOLKIT_DIR}/PACKAGES.cmake")
        if(NOT EXISTS "${PACKAGES_CMAKE_FILE}")
            message(FATAL_ERROR "Missing PACKAGES.cmake for toolkit ${toolkit}: ${PACKAGES_CMAKE_FILE}")
        endif()

        include("${PACKAGES_CMAKE_FILE}")
        set(TOOLKIT_PACKAGES_VAR "OCCT_${toolkit}_LIST_OF_PACKAGES")
        if(NOT DEFINED ${TOOLKIT_PACKAGES_VAR})
            message(FATAL_ERROR "Missing package list variable ${TOOLKIT_PACKAGES_VAR} in ${PACKAGES_CMAKE_FILE}")
        endif()

        list(APPEND OCCT_TOOLKIT_PACKAGE_DIRS "${TOOLKIT_DIR}")
        foreach(pkg ${${TOOLKIT_PACKAGES_VAR}})
            list(APPEND OCCT_PACKAGE_DIRS "${TOOLKIT_DIR}/${pkg}")
        endforeach()

        set(TOOLKIT_FOUND TRUE)
        break()
    endforeach()

    if(NOT TOOLKIT_FOUND)
        message(FATAL_ERROR "Toolkit ${toolkit} not found in OCCT 8.0 module layout")
    endif()
endforeach()

list(REMOVE_DUPLICATES OCCT_TOOLKIT_PACKAGE_DIRS)
list(REMOVE_DUPLICATES OCCT_PACKAGE_DIRS)

# ------------------------------------------------------------
# 3. Exclude visualization-dependent XCAF package sources
# ------------------------------------------------------------
list(FILTER OCCT_PACKAGE_DIRS EXCLUDE REGEX ".*/XCAFApp$")

# ------------------------------------------------------------
# 4. Include directories
# ------------------------------------------------------------
set(OCCT_INCLUDE_DIRS "")
list(APPEND OCCT_INCLUDE_DIRS ${OCCT_PACKAGE_DIRS})
list(APPEND OCCT_INCLUDE_DIRS
    "${OCCT_SOURCE_DIR}/src"
    "${CMAKE_CURRENT_BINARY_DIR}/include"
    # Header-only: excluded package still needed for compilation
    "${OCCT_SOURCE_DIR}/src/DataExchange/TKXCAF/XCAFApp"
)

# ------------------------------------------------------------
# 5. Collect OCCT sources
# ------------------------------------------------------------
set(OCCT_SOURCES "")
foreach(pkg_dir ${OCCT_PACKAGE_DIRS})
    file(GLOB PKG_SRCS CONFIGURE_DEPENDS
        "${pkg_dir}/*.cxx"
        "${pkg_dir}/*.cpp"
        "${pkg_dir}/*.c"
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
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cxx"
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
    target_include_directories(${TARGET} PUBLIC
        ${OCCT_INCLUDE_DIRS}
        ${CMAKE_CURRENT_SOURCE_DIR}/src
    )
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
        -sDEMANGLE_SUPPORT=0              # ← 新增
        -sASSERTIONS=0                    # ← 新增
        -sERROR_ON_UNDEFINED_SYMBOLS=1    # ← 新增
        --bind
        --emit-tsd "${TARGET}.d.ts"
        -Oz
    )

    install(TARGETS ${TARGET} DESTINATION "${CMAKE_SOURCE_DIR}/packages/occt-wasm/lib")
    install(FILES "${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.wasm" DESTINATION "${CMAKE_SOURCE_DIR}/packages/occt-wasm/lib")
    install(FILES "${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.d.ts" DESTINATION "${CMAKE_SOURCE_DIR}/packages/occt-wasm/lib")
    
    # Copy build artifacts to examples/public for development
    add_custom_command(TARGET ${TARGET} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory "${CMAKE_SOURCE_DIR}/examples/public"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.js"
            "${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.wasm"
            "${CMAKE_CURRENT_BINARY_DIR}/${TARGET}.d.ts"
            "${CMAKE_SOURCE_DIR}/examples/public/"
        COMMENT "Copying build artifacts to examples/public"
    )
endif()