#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'contexts', '__tests__', 'LoggingContext.vitest.test.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Pattern 1: Fix tests that combine handler calls and timer advances in single act()
content = content.replace(
    /act\(\(\) => \{\s*(\w+\.click\(\);|handler\([^)]+\);)\s*vi\.advanceTimersByTime\(10\);\s*\}\);\s*await waitFor\(\(\) => \{\s*(expect\([^}]+\}\);\s*\}\);/g,
    `act(() => {
        $1
    });
    
    act(() => {
        vi.advanceTimersByTime(10);
    });
    
    $2`
);

// Pattern 2: Fix tests with multiple handler calls in single act with timer advance
content = content.replace(
    /act\(\(\) => \{\s*((?:handler\([^)]+\);\s*)+)vi\.advanceTimersByTime\(10\);\s*\}\);\s*await waitFor\(\(\) => \{\s*(expect\([^}]+\}\);\s*\}\);/g,
    `act(() => {
        $1
    });
    
    act(() => {
        vi.advanceTimersByTime(10);
    });
    
    $2`
);

// Pattern 3: Complex batch test with multiple timer advances
content = content.replace(
    /act\(\(\) => \{\s*((?:[^}]+;\s*)+)vi\.advanceTimersByTime\(10\);\s*\}\);\s*await waitFor\(\(\) => \{\s*(expect\([^}]+\}\);\s*\}\);/g,
    `act(() => {
        $1
    });
    
    act(() => {
        vi.advanceTimersByTime(10);
    });
    
    $2`
);

fs.writeFileSync(filePath, content);
console.log('Fixed LoggingContext test async timing issues');