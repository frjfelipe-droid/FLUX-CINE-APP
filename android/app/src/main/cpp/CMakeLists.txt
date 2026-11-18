cmake_minimum_required(VERSION 3.18)
project(fluxwhisper C CXX)

# Sempre otimizado (mesmo no APK de debug), senão a transcrição fica muito lenta.
set(CMAKE_BUILD_TYPE Release)
set(CMAKE_C_FLAGS_RELEASE "-O3 -DNDEBUG")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GGML_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)

# whisper.cpp é baixado pelo build (GitHub Actions) para esta pasta
add_subdirectory(whisper.cpp)

add_library(fluxwhisper SHARED whisper_jni.cpp)
target_link_libraries(fluxwhisper PRIVATE whisper log)
