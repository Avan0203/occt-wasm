# Split build: occt-wasm-core (MAIN_MODULE) + occt-wasm-exchange.wasm (SIDE_MODULE)

string(TOUPPER "${OCCT_WASM_BUILD_SCOPE}" _BUILD_SCOPE)
if(NOT _BUILD_SCOPE)
    set(_BUILD_SCOPE "ALL")
endif()

if(NOT _BUILD_SCOPE MATCHES "^(ALL|CORE|EXCHANGE)$")
    message(FATAL_ERROR "OCCT_WASM_BUILD_SCOPE must be ALL, CORE, or EXCHANGE (got: ${OCCT_WASM_BUILD_SCOPE})")
endif()

message(STATUS "Build mode: SPLIT (scope: ${_BUILD_SCOPE})")

set(_exchange_exclude_from_all FALSE)
set(_core_exclude_from_all FALSE)
if(_BUILD_SCOPE STREQUAL "CORE")
    set(_exchange_exclude_from_all TRUE)
elseif(_BUILD_SCOPE STREQUAL "EXCHANGE")
    set(_core_exclude_from_all TRUE)
endif()

# Exchange SIDE_MODULE: compile all OCCT exchange sources directly (static+whole-archive strips to ~100KB)
if(_exchange_exclude_from_all)
    add_executable(${EXCHANGE_TARGET} EXCLUDE_FROM_ALL
        ${OCCT_EXCHANGE_SOURCES}
        "${CMAKE_CURRENT_SOURCE_DIR}/cmake/exchange_stub.cpp"
    )
else()
    add_executable(${EXCHANGE_TARGET}
        ${OCCT_EXCHANGE_SOURCES}
        "${CMAKE_CURRENT_SOURCE_DIR}/cmake/exchange_stub.cpp"
    )
endif()

set_target_properties(${EXCHANGE_TARGET} PROPERTIES
    OUTPUT_NAME "${EXCHANGE_TARGET}"
    PREFIX ""
    SUFFIX ".wasm"
    POSITION_INDEPENDENT_CODE ON
)
target_include_directories(${EXCHANGE_TARGET} PUBLIC ${OCCT_ALL_INCLUDE_DIRS})
target_compile_options(${EXCHANGE_TARGET} PUBLIC ${OCCT_COMPILE_OPTIONS})
target_link_options(${EXCHANGE_TARGET} PUBLIC
    ${OCCT_SIDE_MODULE_LINK_OPTIONS}
    -sSIDE_MODULE=2
    -sEXPORT_ALL=1
    -sERROR_ON_UNDEFINED_SYMBOLS=0
    "--no-entry"
)

# Core OCCT static library
add_library(occt-core STATIC ${OCCT_CORE_SOURCES})
target_include_directories(occt-core PUBLIC ${OCCT_CORE_INCLUDE_DIRS})
target_compile_options(occt-core PUBLIC ${OCCT_COMPILE_OPTIONS})

if(_core_exclude_from_all)
    add_executable(${CORE_TARGET} EXCLUDE_FROM_ALL ${MY_SOURCES})
else()
    add_executable(${CORE_TARGET} ${MY_SOURCES})
endif()

add_dependencies(${CORE_TARGET} ${EXCHANGE_TARGET})
target_include_directories(${CORE_TARGET} PUBLIC
    ${OCCT_ALL_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)
target_compile_options(${CORE_TARGET} PUBLIC
    $<$<CONFIG:Release>:-Os>
    $<$<CONFIG:Release>:-flto>
)
target_link_libraries(${CORE_TARGET} PUBLIC occt-core)
target_link_options(${CORE_TARGET} PUBLIC
    ${OCCT_LINK_OPTIONS_COMMON}
    -sMAIN_MODULE=2
    -sAUTOLOAD_DYLIBS=0
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sERROR_ON_UNDEFINED_SYMBOLS=1
    "SHELL:${CMAKE_CURRENT_BINARY_DIR}/${EXCHANGE_TARGET}.wasm"
    --bind
    --emit-tsd "${TSD_FILE}"
)

install(TARGETS ${CORE_TARGET} DESTINATION "${OCCT_PACKAGE_LIB_DIR}")
install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/${CORE_TARGET}.wasm"
    "${CMAKE_CURRENT_BINARY_DIR}/${EXCHANGE_TARGET}.wasm"
    "${CMAKE_CURRENT_BINARY_DIR}/${TSD_FILE}"
    DESTINATION "${OCCT_PACKAGE_LIB_DIR}"
)

add_custom_command(TARGET ${CORE_TARGET} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory "${OCCT_PUBLIC_DIR}"
    COMMAND ${CMAKE_COMMAND} -E remove -f
        "${OCCT_PUBLIC_DIR}/occt-wasm.js"
        "${OCCT_PUBLIC_DIR}/occt-wasm.wasm"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_CURRENT_BINARY_DIR}/${CORE_TARGET}.js"
        "${CMAKE_CURRENT_BINARY_DIR}/${CORE_TARGET}.wasm"
        "${CMAKE_CURRENT_BINARY_DIR}/${EXCHANGE_TARGET}.wasm"
        "${CMAKE_CURRENT_BINARY_DIR}/${TSD_FILE}"
        "${OCCT_PUBLIC_DIR}/"
    COMMENT "Copying split build artifacts to examples/public"
)
