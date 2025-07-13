#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixVitestTypes(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Replace jest.SpyInstance with ReturnType<typeof vi.spyOn>
    if (content.includes('jest.SpyInstance')) {
        content = content.replace(/jest\.SpyInstance/g, 'ReturnType<typeof vi.spyOn>');
        changed = true;
    }
    
    // Replace jest.restoreAllMocks with vi.restoreAllMocks
    if (content.includes('jest.restoreAllMocks')) {
        content = content.replace(/jest\.restoreAllMocks/g, 'vi.restoreAllMocks');
        changed = true;
    }
    
    // Replace jest.clearAllMocks with vi.clearAllMocks
    if (content.includes('jest.clearAllMocks')) {
        content = content.replace(/jest\.clearAllMocks/g, 'vi.clearAllMocks');
        changed = true;
    }
    
    // Replace jest.resetAllMocks with vi.resetAllMocks
    if (content.includes('jest.resetAllMocks')) {
        content = content.replace(/jest\.resetAllMocks/g, 'vi.resetAllMocks');
        changed = true;
    }
    
    // Replace MockedFunction with vi.MockedFunction
    if (content.includes('MockedFunction')) {
        content = content.replace(/MockedFunction/g, 'vi.MockedFunction');
        changed = true;
    }
    
    // Replace jest.vi.MockedFunction with vi.MockedFunction
    if (content.includes('jest.vi.MockedFunction')) {
        content = content.replace(/jest\.vi\.MockedFunction/g, 'vi.MockedFunction');
        changed = true;
    }
    
    // Replace jest.Mock with vi.Mock
    if (content.includes('jest.Mock')) {
        content = content.replace(/jest\.Mock/g, 'vi.Mock');
        changed = true;
    }
    
    // Replace jest.useFakeTimers with vi.useFakeTimers
    if (content.includes('jest.useFakeTimers')) {
        content = content.replace(/jest\.useFakeTimers/g, 'vi.useFakeTimers');
        changed = true;
    }
    
    // Replace jest.useRealTimers with vi.useRealTimers
    if (content.includes('jest.useRealTimers')) {
        content = content.replace(/jest\.useRealTimers/g, 'vi.useRealTimers');
        changed = true;
    }
    
    // Replace jest.advanceTimersByTime with vi.advanceTimersByTime
    if (content.includes('jest.advanceTimersByTime')) {
        content = content.replace(/jest\.advanceTimersByTime/g, 'vi.advanceTimersByTime');
        changed = true;
    }
    
    // Fix complex jest.vi.vi.MockedFunction patterns (handle multiple levels)
    if (content.includes('jest.vi.vi.MockedFunction') || content.includes('jest.vi.vi.vi.MockedFunction')) {
        // Handle any number of .vi repeats
        content = content.replace(/jest\.vi(\.vi)*\.MockedFunction/g, 'vi.MockedFunction');
        changed = true;
    }
    
    // Fix remaining jest.fn() calls inside vi.doMock
    if (content.includes('jest.fn(')) {
        content = content.replace(/jest\.fn\(/g, 'vi.fn(');
        changed = true;
    }
    
    // Replace jest-dom jest-globals import with vitest equivalent
    if (content.includes("'@testing-library/jest-dom/jest-globals'")) {
        content = content.replace(/'@testing-library\/jest-dom\/jest-globals'/g, "'@testing-library/jest-dom/vitest'");
        changed = true;
    }
    
    // Fix unused 'test' import - remove it if only 'it' is used
    const hasTestUsage = /\btest\s*\(/m.test(content);
    const hasItUsage = /\bit\s*\(/m.test(content);
    
    if (!hasTestUsage && hasItUsage && content.includes('test,')) {
        content = content.replace(/,\s*test\s*,/g, ',');
        content = content.replace(/{\s*describe,\s*test,\s*expect/g, '{ describe, expect');
        content = content.replace(/{\s*test,\s*describe,\s*expect/g, '{ describe, expect');
        changed = true;
    }
    
    // Add 'vi' import if it's used but missing
    const hasViUsage = /\bvi\./m.test(content);
    const hasViImport = /import.*vi.*from\s+['"]vitest['"]/.test(content);
    
    if (hasViUsage && !hasViImport && content.includes("from 'vitest'")) {
        content = content.replace(/(import\s*{\s*[^}]*)(}\s*from\s*['"]vitest['"])/g, (match, before, after) => {
            if (!before.includes('vi')) {
                return before + ', vi' + after;
            }
            return match;
        });
        changed = true;
    }
    
    // Fix SpyInstance type annotations
    if (content.includes(': SpyInstance')) {
        content = content.replace(/: SpyInstance/g, ': ReturnType<typeof vi.spyOn>');
        changed = true;
    }
    
    // Replace jest.doMock with vi.doMock
    if (content.includes('jest.doMock')) {
        content = content.replace(/jest\.doMock/g, 'vi.doMock');
        changed = true;
    }
    
    // Replace jest.resetModules with vi.resetAllMocks (closest equivalent)
    if (content.includes('jest.resetModules')) {
        content = content.replace(/jest\.resetModules/g, 'vi.resetAllMocks');
        changed = true;
    }
    
    // Fix console.error.mockImplementation() missing argument  
    if (content.includes('.mockImplementation()')) {
        content = content.replace(/console\.error\)\.mockImplementation\(\)/g, 'console.error).mockImplementation(() => {})');
        changed = true;
    }
    
    // Fix spyOn calls without arguments (need empty function)
    if (content.includes('.mockImplementation()')) {
        content = content.replace(/\.mockImplementation\(\)/g, '.mockImplementation(() => {})');
        changed = true;
    }
    
    // Replace .ts import with .js for worker imports
    if (content.includes("'../Apple.worker.ts'")) {
        content = content.replace(/'\.\.\/Apple\.worker\.ts'/g, "'../Apple.worker.js'");
        changed = true;
    }
    
    // Add vi to imports if missing but used
    if (content.includes('vi.hoisted') && !content.includes(', vi')) {
        content = content.replace(/(import\s*{\s*[^}]*)(}\s*from\s*['"]vitest['"])/g, (match, before, after) => {
            if (!before.includes('vi') && before.includes('describe')) {
                return before.replace('describe', 'describe, vi') + after;
            }
            return match;
        });
        changed = true;
    }
    
    return { content, changed };
}

function findVitestFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
            files.push(...findVitestFiles(fullPath));
        } else if (stat.isFile() && item.endsWith('.vitest.test.ts') || item.endsWith('.vitest.test.tsx')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function main() {
    const srcDir = path.join(__dirname, '..', 'src');
    const testFiles = findVitestFiles(srcDir);
    
    console.log(`Found ${testFiles.length} Vitest test files to fix`);
    
    let fixedCount = 0;
    
    for (const file of testFiles) {
        try {
            const { content, changed } = fixVitestTypes(file);
            if (changed) {
                fs.writeFileSync(file, content);
                console.log(`✓ Fixed: ${path.relative(process.cwd(), file)}`);
                fixedCount++;
            }
        } catch (error) {
            console.error(`✗ Failed to fix ${file}:`, error.message);
        }
    }
    
    console.log(`\nFixed ${fixedCount} test files`);
    console.log('Run "yarn vitest run" to verify all tests pass.');
}

main();