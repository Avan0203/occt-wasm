# Shared OCCT toolkit lists and source collection for occt-wasm builds.

set(OCCT_SOURCE_DIR "${CMAKE_SOURCE_DIR}/source/occt")

set(CORE_TARGET occt-wasm-core)
set(EXCHANGE_TARGET occt-wasm-exchange)
set(MONOLITH_TARGET occt-wasm)
set(TSD_FILE occt-wasm.d.ts)

# FoundationClasses + ModelingData + ModelingAlgorithms
set(OCCT_CORE_TOOLKITS
    TKernel TKMath
    TKBRep TKG3d TKG2d TKGeomBase
    TKGeomAlgo TKTopAlgo TKPrim TKBO TKBool TKHLR TKFillet TKOffset TKFeat TKMesh TKShHealing
)

# XCAF + DataExchange + Forced Viz Coupling
set(OCCT_EXCHANGE_TOOLKITS
    TKService TKV3d
    TKCDF TKLCAF TKCAF TKVCAF TKXCAF
    TKDE TKXSBase TKDESTEP TKDEIGES TKDESTL
)

set(OCCT_MONOLITH_TOOLKITS ${OCCT_CORE_TOOLKITS} ${OCCT_EXCHANGE_TOOLKITS})

include("${OCCT_SOURCE_DIR}/src/MODULES.cmake")

function(occt_collect_toolkit_packages TOOLKITS OUT_PACKAGE_DIRS)
    set(_PACKAGE_DIRS "")
    foreach(toolkit ${TOOLKITS})
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

            foreach(pkg ${${TOOLKIT_PACKAGES_VAR}})
                list(APPEND _PACKAGE_DIRS "${TOOLKIT_DIR}/${pkg}")
            endforeach()

            set(TOOLKIT_FOUND TRUE)
            break()
        endforeach()

        if(NOT TOOLKIT_FOUND)
            message(FATAL_ERROR "Toolkit ${toolkit} not found in OCCT 8.0 module layout")
        endif()
    endforeach()

    list(REMOVE_DUPLICATES _PACKAGE_DIRS)
    set(${OUT_PACKAGE_DIRS} ${_PACKAGE_DIRS} PARENT_SCOPE)
endfunction()

function(occt_collect_sources PACKAGE_DIRS OUT_SOURCES OUT_COUNT)
    set(_SOURCES "")
    foreach(pkg_dir ${PACKAGE_DIRS})
        file(GLOB PKG_SRCS CONFIGURE_DEPENDS
            "${pkg_dir}/*.cxx"
            "${pkg_dir}/*.cpp"
            "${pkg_dir}/*.c"
        )
        list(APPEND _SOURCES ${PKG_SRCS})
    endforeach()
    list(REMOVE_DUPLICATES _SOURCES)
    list(LENGTH _SOURCES _COUNT)
    set(${OUT_SOURCES} ${_SOURCES} PARENT_SCOPE)
    set(${OUT_COUNT} ${_COUNT} PARENT_SCOPE)
endfunction()

set(OCCT_COMMON_INCLUDE_DIRS
    "${OCCT_SOURCE_DIR}/src"
    "${CMAKE_CURRENT_BINARY_DIR}/include"
    "${OCCT_SOURCE_DIR}/src/DataExchange/TKXCAF/XCAFApp"
)

function(occt_make_include_dirs PACKAGE_DIRS OUT_INCLUDE_DIRS)
    set(_DIRS ${PACKAGE_DIRS} ${OCCT_COMMON_INCLUDE_DIRS})
    list(REMOVE_DUPLICATES _DIRS)
    set(${OUT_INCLUDE_DIRS} ${_DIRS} PARENT_SCOPE)
endfunction()

occt_collect_toolkit_packages("${OCCT_CORE_TOOLKITS}" OCCT_CORE_PACKAGE_DIRS)
occt_collect_toolkit_packages("${OCCT_EXCHANGE_TOOLKITS}" OCCT_EXCHANGE_PACKAGE_DIRS)
occt_collect_toolkit_packages("${OCCT_MONOLITH_TOOLKITS}" OCCT_MONOLITH_PACKAGE_DIRS)

list(FILTER OCCT_EXCHANGE_PACKAGE_DIRS EXCLUDE REGEX ".*/XCAFApp$")
list(FILTER OCCT_MONOLITH_PACKAGE_DIRS EXCLUDE REGEX ".*/XCAFApp$")

occt_collect_sources("${OCCT_CORE_PACKAGE_DIRS}" OCCT_CORE_SOURCES OCCT_CORE_SOURCES_COUNT)
occt_collect_sources("${OCCT_EXCHANGE_PACKAGE_DIRS}" OCCT_EXCHANGE_SOURCES OCCT_EXCHANGE_SOURCES_COUNT)
occt_collect_sources("${OCCT_MONOLITH_PACKAGE_DIRS}" OCCT_MONOLITH_SOURCES OCCT_MONOLITH_SOURCES_COUNT)

message(STATUS "OCCT core source files: ${OCCT_CORE_SOURCES_COUNT}")
message(STATUS "OCCT exchange source files: ${OCCT_EXCHANGE_SOURCES_COUNT}")
message(STATUS "OCCT monolith source files: ${OCCT_MONOLITH_SOURCES_COUNT}")

occt_make_include_dirs("${OCCT_CORE_PACKAGE_DIRS}" OCCT_CORE_INCLUDE_DIRS)
occt_make_include_dirs("${OCCT_CORE_PACKAGE_DIRS};${OCCT_EXCHANGE_PACKAGE_DIRS}" OCCT_ALL_INCLUDE_DIRS)
occt_make_include_dirs("${OCCT_MONOLITH_PACKAGE_DIRS}" OCCT_MONOLITH_INCLUDE_DIRS)

include("${OCCT_SOURCE_DIR}/adm/cmake/version.cmake")
configure_file(
    "${OCCT_SOURCE_DIR}/adm/templates/Standard_Version.hxx.in"
    "${CMAKE_CURRENT_BINARY_DIR}/include/Standard_Version.hxx"
    @ONLY
)

file(GLOB_RECURSE MY_SOURCES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cxx"
)

set(OCCT_COMPILE_OPTIONS
    $<$<CONFIG:Release>:-Os>
    $<$<CONFIG:Release>:-flto>
    -DOCCT_NO_PLUGINS
)

set(OCCT_LINK_OPTIONS_COMMON
    -sSTACK_SIZE=8MB
    -sINITIAL_HEAP=64MB
    -sALLOW_MEMORY_GROWTH=1
    -sMAXIMUM_MEMORY=4GB
    -sENVIRONMENT=web,worker
    -sDEMANGLE_SUPPORT=0
    -sASSERTIONS=0
    -Oz
)

# SIDE_MODULE 使用主模块内存，不能设置 INITIAL_HEAP / ALLOW_MEMORY_GROWTH 等
set(OCCT_SIDE_MODULE_LINK_OPTIONS
    -sENVIRONMENT=web,worker
    -sDEMANGLE_SUPPORT=0
    -sASSERTIONS=0
    -Oz
)

set(OCCT_PUBLIC_DIR "${CMAKE_SOURCE_DIR}/examples/public")
set(OCCT_PACKAGE_LIB_DIR "${CMAKE_SOURCE_DIR}/packages/occt-wasm/lib")
