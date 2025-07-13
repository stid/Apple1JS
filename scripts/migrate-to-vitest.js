#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function migrateTestFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove Jest environment comment
    content = content.replace(/\/\*\*\s*\*\s*@jest-environment\s+\w+\s*\*\/\s*\n?/g, '');
    
    // Replace imports
    if (content.includes('jest.fn()') || content.includes('jest.mock')) {
        // Add vitest import if not present
        if (!content.includes("from 'vitest'")) {
            const imports = [];
            if (content.includes('describe')) imports.push('describe');
            if (content.includes('test') || content.includes('it')) imports.push('test');
            if (content.includes('expect')) imports.push('expect');
            if (content.includes('beforeEach')) imports.push('beforeEach');
            if (content.includes('afterEach')) imports.push('afterEach');
            if (content.includes('beforeAll')) imports.push('beforeAll');
            if (content.includes('afterAll')) imports.push('afterAll');
            if (content.includes('jest.fn()') || content.includes('jest.mock')) imports.push('vi');
            
            if (imports.length > 0) {
                content = `import { ${imports.join(', ')} } from 'vitest';\n` + content;
            }
        }
    }
    
    // Replace jest.fn() with vi.fn()
    content = content.replace(/jest\.fn\(\)/g, 'vi.fn()');
    
    // Replace jest.mock with vi.mock
    content = content.replace(/jest\.mock/g, 'vi.mock');
    
    // Replace mockClear with vi.clearAllMocks or individual mock.mockClear()
    content = content.replace(/(\w+)\.mockClear\(\)/g, '$1.mockClear()');
    
    // Replace jest.spyOn with vi.spyOn
    content = content.replace(/jest\.spyOn/g, 'vi.spyOn');
    
    // Replace jest.clearAllMocks with vi.clearAllMocks
    content = content.replace(/jest\.clearAllMocks/g, 'vi.clearAllMocks');
    
    // Replace jest.resetAllMocks with vi.resetAllMocks
    content = content.replace(/jest\.resetAllMocks/g, 'vi.resetAllMocks');
    
    return content;
}

function findTestFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
            files.push(...findTestFiles(fullPath));
        } else if (stat.isFile() && (item.endsWith('.test.ts') || item.endsWith('.test.tsx'))) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function main() {
    const srcDir = path.join(__dirname, '..', 'src');
    const testFiles = findTestFiles(srcDir);
    
    console.log(`Found ${testFiles.length} test files to migrate`);
    
    for (const file of testFiles) {
        try {
            const migrated = migrateTestFile(file);
            const newPath = file.replace('.test.', '.vitest.test.');
            fs.writeFileSync(newPath, migrated);
            console.log(`✓ Migrated: ${path.relative(process.cwd(), file)} → ${path.basename(newPath)}`);
        } catch (error) {
            console.error(`✗ Failed to migrate ${file}:`, error.message);
        }
    }
    
    console.log('\nMigration complete! Run "yarn test" to verify all tests pass.');
    console.log('Note: Complex mocks and setup may need manual adjustment.');
}

main();