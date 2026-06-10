# Monolith build: single occt-wasm.js / occt-wasm.wasm (original layout)

add_library(occt STATIC ${OCCT_MONOLITH_SOURCES})
target_include_directories(occt PUBLIC ${OCCT_MONOLITH_INCLUDE_DIRS})
target_compile_options(occt PUBLIC ${OCCT_COMPILE_OPTIONS})

add_executable(${MONOLITH_TARGET} ${MY_SOURCES})
target_include_directories(${MONOLITH_TARGET} PUBLIC
    ${OCCT_MONOLITH_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)
target_compile_options(${MONOLITH_TARGET} PUBLIC
    $<$<CONFIG:Release>:-Os>
    $<$<CONFIG:Release>:-flto>
)
target_link_libraries(${MONOLITH_TARGET} PUBLIC occt)
target_link_options(${MONOLITH_TARGET} PUBLIC
    ${OCCT_LINK_OPTIONS_COMMON}
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sERROR_ON_UNDEFINED_SYMBOLS=1
    --bind
    --emit-tsd "${TSD_FILE}"
)

install(TARGETS ${MONOLITH_TARGET} DESTINATION "${OCCT_PACKAGE_LIB_DIR}")
install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/${MONOLITH_TARGET}.wasm"
    "${CMAKE_CURRENT_BINARY_DIR}/${TSD_FILE}"
    DESTINATION "${OCCT_PACKAGE_LIB_DIR}"
)

add_custom_command(TARGET ${MONOLITH_TARGET} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory "${OCCT_PUBLIC_DIR}"
    COMMAND ${CMAKE_COMMAND} -E remove -f
        "${OCCT_PUBLIC_DIR}/occt-wasm-core.js"
        "${OCCT_PUBLIC_DIR}/occt-wasm-core.wasm"
        "${OCCT_PUBLIC_DIR}/occt-wasm-exchange.wasm"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_CURRENT_BINARY_DIR}/${MONOLITH_TARGET}.js"
        "${CMAKE_CURRENT_BINARY_DIR}/${MONOLITH_TARGET}.wasm"
        "${CMAKE_CURRENT_BINARY_DIR}/${TSD_FILE}"
        "${OCCT_PUBLIC_DIR}/"
    COMMENT "Copying monolith build artifacts to examples/public"
)

message(STATUS "Build mode: MONOLITH -> ${MONOLITH_TARGET}.js/wasm")
