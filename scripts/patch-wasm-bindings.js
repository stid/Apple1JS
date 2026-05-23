/**
 * Patch WASM Bindings Script
 *
 * This script patches the wasm-bindgen generated JS file to properly access
 * the wasmMemoryBridge global in ES modules running in Web Workers.
 *
 * The generated code uses bare `wasmMemoryBridge` references which don't resolve
 * to globalThis in ES modules. This script replaces them with `globalThis.wasmMemoryBridge`.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wasmJsPath = join(__dirname, '../src/wasm/apple1_cpu_wasm.js');

function patchWasmBindings() {
    if (!existsSync(wasmJsPath)) {
        console.log('WASM JS file not found, skipping patch');
        return;
    }

    console.log('Patching WASM bindings for globalThis compatibility...');

    let content = readFileSync(wasmJsPath, 'utf8');
    let patchCount = 0;

    // Replace bare wasmMemoryBridge references with globalThis.wasmMemoryBridge
    // Use negative lookbehind to avoid matching already-patched references

    // Pattern 1: wasmMemoryBridge.readByte (not preceded by globalThis.)
    const readBytePattern = /(?<!globalThis\.)wasmMemoryBridge\.readByte\(/g;
    const readByteMatches = content.match(readBytePattern);
    if (readByteMatches) {
        content = content.replace(readBytePattern, 'globalThis.wasmMemoryBridge.readByte(');
        patchCount += readByteMatches.length;
    }

    // Pattern 2: wasmMemoryBridge.writeByte (not preceded by globalThis.)
    const writeBytePattern = /(?<!globalThis\.)wasmMemoryBridge\.writeByte\(/g;
    const writeByteMatches = content.match(writeBytePattern);
    if (writeByteMatches) {
        content = content.replace(writeBytePattern, 'globalThis.wasmMemoryBridge.writeByte(');
        patchCount += writeByteMatches.length;
    }

    if (patchCount > 0) {
        writeFileSync(wasmJsPath, content);
        console.log(`Patched ${patchCount} wasmMemoryBridge reference(s)`);
    } else {
        console.log('No patches needed (already patched or pattern not found)');
    }
}

patchWasmBindings();
