# Dove9 Cognitive Layer — CMake Build
# Builds libdove9 (static library) containing the complete cognitive
# architecture: triadic engine, kernel, DTE processor, mail bridges,
# Sys6 scheduler, and the top-level Dove9System.

cmake_minimum_required(VERSION 3.16)
project(dove9 VERSION 1.0.0 LANGUAGES C)

# ---- Build options ----
option(DOVE9_ENABLE_COVERAGE "Enable code coverage with gcov/lcov" OFF)
option(DOVE9_ENABLE_DEVEL_CHECKS "Enable development checks (-DDEBUG)" OFF)

# ---- C11 standard enforcement ----
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

# ---- Export compile_commands.json for clangd/IntelliSense ----
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ---- Compiler warning flags ----
if(CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(-Wall -Wextra -Wno-unused-parameter)
elseif(MSVC)
    add_compile_options(/W4)
endif()

# ---- Coverage flags ----
if(DOVE9_ENABLE_COVERAGE)
    if(CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
        add_compile_options(-fprofile-arcs -ftest-coverage)
        add_link_options(-fprofile-arcs -ftest-coverage)
    endif()
endif()

# ---- Development checks ----
if(DOVE9_ENABLE_DEVEL_CHECKS)
    add_compile_definitions(DEBUG)
endif()

# ---- Include directories ----
set(DOVE9_INCLUDE_DIRS
    ${CMAKE_CURRENT_SOURCE_DIR}/types
    ${CMAKE_CURRENT_SOURCE_DIR}/utils
    ${CMAKE_CURRENT_SOURCE_DIR}/cognitive
    ${CMAKE_CURRENT_SOURCE_DIR}/core
    ${CMAKE_CURRENT_SOURCE_DIR}/integration
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/test
)

# ---- Library sources ----
set(DOVE9_LIB_SOURCES
    utils/dove9-logger.c
    cognitive/dove9-triadic-engine.c
    cognitive/dove9-dte-processor.c
    integration/dove9-mail-protocol-bridge.c
    core/dove9-kernel.c
    integration/dove9-orchestrator-bridge.c
    integration/dove9-sys6-mail-scheduler.c
    integration/dove9-sys6-orchestrator-bridge.c
    dove9-system.c
)

# ---- Static library target ----
add_library(dove9 STATIC ${DOVE9_LIB_SOURCES})
target_include_directories(dove9 PUBLIC ${DOVE9_INCLUDE_DIRS})

# ---- Link math library (needed on UNIX; Windows links implicitly) ----
if(UNIX)
    find_library(MATH_LIBRARY m)
    if(MATH_LIBRARY)
        target_link_libraries(dove9 PUBLIC ${MATH_LIBRARY})
    endif()
endif()

# ====================================================================
# Tests — 27 executables via CTest
# ====================================================================
enable_testing()

# Common test framework source
set(TEST_COMMON_SRC test/dove9-test-common.c)
set(TEST_MOCK_SRC   test/dove9-test-mocks.c)

# Helper: add a test that links only dove9-test-common
macro(dove9_add_test_common name)
    add_executable(${name} test/${name}.c ${TEST_COMMON_SRC})
    target_include_directories(${name} PRIVATE ${DOVE9_INCLUDE_DIRS})
    target_link_libraries(${name} PRIVATE dove9)
    if(MATH_LIBRARY)
        target_link_libraries(${name} PRIVATE ${MATH_LIBRARY})
    endif()
    add_test(NAME ${name} COMMAND ${name})
endmacro()

# Helper: add a test that links both dove9-test-common and dove9-test-mocks
macro(dove9_add_test_mocks name)
    add_executable(${name} test/${name}.c ${TEST_COMMON_SRC} ${TEST_MOCK_SRC})
    target_include_directories(${name} PRIVATE ${DOVE9_INCLUDE_DIRS})
    target_link_libraries(${name} PRIVATE dove9)
    if(MATH_LIBRARY)
        target_link_libraries(${name} PRIVATE ${MATH_LIBRARY})
    endif()
    add_test(NAME ${name} COMMAND ${name})
endmacro()

# ---- 11 common-only tests ----
dove9_add_test_common(test-dove9-types)
dove9_add_test_common(test-dove9-logger)
dove9_add_test_common(test-dove9-mail-bridge)
dove9_add_test_common(test-dove9-sys6-scheduler)
dove9_add_test_common(test-dove9-sys6-correctness)
dove9_add_test_common(test-dove9-cognitive-context)
dove9_add_test_common(test-dove9-triadic-math)
dove9_add_test_common(test-dove9-coupling-detection)
dove9_add_test_common(test-dove9-mail-protocol)
dove9_add_test_common(test-dove9-salience-landscape)
dove9_add_test_common(test-dove9-step-assignment)

# ---- 16 tests with mocks ----
dove9_add_test_mocks(test-dove9-triadic-engine)
dove9_add_test_mocks(test-dove9-dte-processor)
dove9_add_test_mocks(test-dove9-kernel)
dove9_add_test_mocks(test-dove9-orchestrator-bridge)
dove9_add_test_mocks(test-dove9-sys6-bridge)
dove9_add_test_mocks(test-dove9-system)
dove9_add_test_mocks(test-dove9-security)
dove9_add_test_mocks(test-dove9-integration)
dove9_add_test_mocks(test-dove9-stress)
dove9_add_test_mocks(test-dove9-kernel-mail)
dove9_add_test_mocks(test-dove9-event-callbacks)
dove9_add_test_mocks(test-dove9-system-config)
dove9_add_test_mocks(test-dove9-memory-lifecycle)
dove9_add_test_mocks(test-dove9-api-boundary)
dove9_add_test_mocks(test-dove9-process-management)
dove9_add_test_mocks(test-dove9-cognitive-pipeline)

# ====================================================================
# Install rules
# ====================================================================
include(GNUInstallDirs)

install(TARGETS dove9
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR})

# Public headers
file(GLOB DOVE9_PUBLIC_HEADERS
    types/*.h
    core/*.h
    cognitive/*.h
    integration/*.h
    dove9-system.h)
install(FILES ${DOVE9_PUBLIC_HEADERS}
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}/dovecho/dove9)

# ====================================================================
# Coverage target (only when coverage is enabled)
# ====================================================================
if(DOVE9_ENABLE_COVERAGE)
    find_program(LCOV_EXECUTABLE lcov)
    find_program(GENHTML_EXECUTABLE genhtml)
    if(LCOV_EXECUTABLE AND GENHTML_EXECUTABLE)
        add_custom_target(coverage
            COMMAND ${LCOV_EXECUTABLE} --capture --directory . --output-file coverage.info
            COMMAND ${GENHTML_EXECUTABLE} coverage.info --output-directory coverage-html
            WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
            COMMENT "Generating code coverage report"
            DEPENDS dove9)
    endif()
endif()
