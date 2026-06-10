cmake_minimum_required(VERSION 3.30)

include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/OcctWasmCcache.cmake")

project(occt-wasm)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ------------------------------------------------------------
# Build type
# ------------------------------------------------------------
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_NINJA_FORCE_RESPONSE_FILE 1 CACHE INTERNAL "")

# MONOLITH: occt-wasm.js/wasm (single bundle)
# SPLIT:    occt-wasm-core + occt-wasm-exchange.wasm
set(OCCT_WASM_BUILD_MODE "SPLIT" CACHE STRING "MONOLITH | SPLIT")
set_property(CACHE OCCT_WASM_BUILD_MODE PROPERTY STRINGS MONOLITH SPLIT)

# SPLIT mode only: default targets for `cmake --build .`
# ALL      - build core + exchange
# CORE     - default build core (exchange still built when out of date via dependency)
# EXCHANGE - default build exchange only
set(OCCT_WASM_BUILD_SCOPE "ALL" CACHE STRING "ALL | CORE | EXCHANGE")
set_property(CACHE OCCT_WASM_BUILD_SCOPE PROPERTY STRINGS ALL CORE EXCHANGE)

include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/OcctWasmCommon.cmake")

if(EMSCRIPTEN)
    # Emscripten 默认 TARGET_SUPPORTS_SHARED_LIBS=FALSE，需开启才能建 SIDE_MODULE
    set_property(GLOBAL PROPERTY TARGET_SUPPORTS_SHARED_LIBS TRUE)
    string(TOUPPER "${OCCT_WASM_BUILD_MODE}" _BUILD_MODE)
    if(_BUILD_MODE STREQUAL "MONOLITH")
        include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/OcctWasmMonolith.cmake")
    elseif(_BUILD_MODE STREQUAL "SPLIT")
        include("${CMAKE_CURRENT_SOURCE_DIR}/cmake/OcctWasmSplit.cmake")
    else()
        message(FATAL_ERROR "Unknown OCCT_WASM_BUILD_MODE: ${OCCT_WASM_BUILD_MODE}. Use MONOLITH or SPLIT.")
    endif()
endif()
