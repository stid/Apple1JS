#!/usr/bin/env node

/**
 * Check if WASM needs to be rebuilt
 * Compares timestamps of Rust source files with WASM output
 */

const fs = require('fs');
const path = require('path');

const RUST_SRC_DIR = path.join(__dirname, '../wasm-cpu/src');
const WASM_OUTPUT_DIR = path.join(__dirname, '../src/wasm');
const WASM_FILE = path.join(WASM_OUTPUT_DIR, 'apple1_cpu_wasm_bg.wasm');

function getLatestModTime(dir) {
    let latest = 0;
    
    function walkDir(currentDir) {
        const files = fs.readdirSync(currentDir);
        
        for (const file of files) {
            const filePath = path.join(currentDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                walkDir(filePath);
            } else if (file.endsWith('.rs')) {
                latest = Math.max(latest, stat.mtimeMs);
            }
        }
    }
    
    walkDir(dir);
    return latest;
}

function checkWasmNeedsRebuild() {
    // Check if WASM output exists
    if (!fs.existsSync(WASM_FILE)) {
        console.log('✗ WASM not built - need to build');
        return true;
    }
    
    // Get WASM file modification time
    const wasmMtime = fs.statSync(WASM_FILE).mtimeMs;
    
    // Get latest Rust source modification time
    const rustMtime = getLatestModTime(RUST_SRC_DIR);
    
    // Compare timestamps
    if (rustMtime > wasmMtime) {
        console.log('✗ Rust sources changed - WASM needs rebuild');
        console.log(`  Rust modified: ${new Date(rustMtime).toLocaleString()}`);
        console.log(`  WASM built:    ${new Date(wasmMtime).toLocaleString()}`);
        return true;
    }
    
    console.log('✓ WASM is up to date');
    return false;
}

// Check Cargo.toml as well
function checkCargoToml() {
    const cargoPath = path.join(__dirname, '../wasm-cpu/Cargo.toml');
    if (!fs.existsSync(WASM_FILE)) {
        return true;
    }
    
    const cargoMtime = fs.statSync(cargoPath).mtimeMs;
    const wasmMtime = fs.statSync(WASM_FILE).mtimeMs;
    
    if (cargoMtime > wasmMtime) {
        console.log('✗ Cargo.toml changed - WASM needs rebuild');
        return true;
    }
    
    return false;
}

// Main check
const needsRebuild = checkWasmNeedsRebuild() || checkCargoToml();

if (needsRebuild) {
    console.log('\nRun "yarn wasm:build" to rebuild the WASM module');
    process.exit(1);
} else {
    console.log('\n✓ WASM module is up to date');
    process.exit(0);
}