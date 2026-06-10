# Optional ccache integration. Must be included before project().

set(OCCT_WASM_USE_CCACHE "AUTO" CACHE STRING "Use ccache compiler launcher: AUTO | ON | OFF")
set_property(CACHE OCCT_WASM_USE_CCACHE PROPERTY STRINGS AUTO ON OFF)

if(OCCT_WASM_USE_CCACHE STREQUAL "OFF")
    return()
endif()

find_program(CCACHE_PROGRAM ccache)
if(NOT CCACHE_PROGRAM)
    if(OCCT_WASM_USE_CCACHE STREQUAL "ON")
        message(WARNING "OCCT_WASM_USE_CCACHE=ON but ccache was not found in PATH")
    endif()
    return()
endif()

# Emscripten + OCCT: relax timestamp checks for better hit rate across reconfigures
if(NOT DEFINED ENV{CCACHE_SLOPPINESS})
    set(ENV{CCACHE_SLOPPINESS} "include_file_mtime,include_file_ctime,time_macros")
endif()

set(CMAKE_CXX_COMPILER_LAUNCHER "${CCACHE_PROGRAM}" CACHE STRING "C++ compiler launcher" FORCE)
set(CMAKE_C_COMPILER_LAUNCHER "${CCACHE_PROGRAM}" CACHE STRING "C compiler launcher" FORCE)
message(STATUS "ccache enabled: ${CCACHE_PROGRAM}")
