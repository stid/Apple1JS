#!/bin/bash

# Rebuild WASM module for Apple1JS
# This script ensures the WASM module is built with the latest Rust code

echo "🔨 Rebuilding WASM module..."
echo ""

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack is not installed!"
    echo "Install it with: cargo install wasm-pack"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "wasm-cpu" ]; then
    echo "❌ wasm-cpu directory not found!"
    echo "Please run this script from the project root"
    exit 1
fi

# Clean old build
echo "🧹 Cleaning old WASM build..."
rm -rf src/wasm

# Build based on argument (default to dev)
BUILD_MODE=${1:-dev}

if [ "$BUILD_MODE" = "release" ]; then
    echo "📦 Building WASM in RELEASE mode (optimized)..."
    cd wasm-cpu && wasm-pack build --release --target web --out-dir ../src/wasm
else
    echo "🚀 Building WASM in DEV mode (fast build)..."
    cd wasm-cpu && wasm-pack build --dev --target web --out-dir ../src/wasm
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ WASM module built successfully!"
    echo ""
    echo "Build output: src/wasm/"
    ls -lh ../src/wasm/*.wasm 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
else
    echo ""
    echo "❌ WASM build failed!"
    exit 1
fi