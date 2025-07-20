# DisassemblerPaginated Issues Roadmap

## Context
As of version 4.33.30, we've completed a major refactoring of the DisassemblerPaginated component to fix critical issues with navigation, scrolling, and auto-follow behavior. This document captures remaining issues and improvements identified during the refactoring.

## Completed Work
- ✅ Fixed PC stuck at 0 in disassembly view
- ✅ Implemented event-based auto-follow (only on pause/step/breakpoint)
- ✅ Restored working row calculation logic from usePaginatedTable hook
- ✅ Fixed scroll navigation to page by full views
- ✅ Fixed row count and address range display

## Known Issues to Address

### High Priority

1. **Address Input Navigation** (#34) - IN PROGRESS
   - User reported typing "4610" in address field didn't navigate
   - Need to verify if PaginatedTableView → navigateTo flow works correctly
   
   **Investigation findings:**
   - Added logging to trace the flow
   - Improved address parsing to handle $ prefix (e.g., $4610)
   - The basic flow appears correct:
     - PaginatedTableView.handleAddressSubmit → onAddressChange → DisassemblerPaginated.navigateTo
     - navigateTo sets viewStartAddress which triggers fetchAndDisassemble
   - Need to test with actual user input to verify fix

2. **Memory Boundary Edge Cases** (#35)
   - Scrolling near $FFFF may cause issues
   - `Math.min(0xFFFF, nextAddr)` might not handle end of memory correctly
   - Scroll up at end of memory needs testing

3. **Race Conditions** (#37)
   - `actualVisibleRows` set async with requestAnimationFrame
   - `lines` might fetch before row calculation completes
   - Multiple resize events could overlap

### Medium Priority

4. **Variable Instruction Size Handling** (#36)
   - Scroll up estimates bytes based on current page
   - If previous page has very different instruction mix (1 vs 3 byte), scroll amount may be incorrect

5. **Component Unmount Safety** (#38)
   - 150ms timeout could error if component unmounts quickly
   - Need cleanup checks before setState calls

6. **Empty Memory Regions** (#41)
   - Regions full of invalid opcodes (???) affect byte estimation
   - Could cause incorrect scroll amounts

7. **External Address Debouncing** (#42)
   - Rapid external address changes could cause flickering
   - No debouncing on externalAddress effect

### Low Priority

8. **Performance Optimization** (#39)
   - Fetching `visibleRows + 10` extra rows might be excessive
   - Could optimize based on actual scroll patterns

9. **Safety Limit Review** (#40)
   - 100-line limit in disassembly function might truncate valid large views
   - Consider dynamic limit based on viewport

## Technical Details

### Current Architecture
- Uses `requestAnimationFrame` for DOM measurements
- Tracks both `visibleRows` (for fetching) and `actualVisibleRows` (for display)
- Event-based auto-follow via EmulationContext NavigationEvents
- Full-page scrolling (not half-page as before)

### Key Functions
- `calculateRows()` - Measures viewport and calculates visible rows
- `handleNavigateUp/Down()` - Page-based navigation
- `fetchAndDisassemble()` - Fetches memory and disassembles instructions

### Dependencies
- EmulationContext for execution state and events
- WorkerManager for memory access
- PaginatedTableView for UI framework

## Testing Recommendations

1. Test address input with various formats (hex with/without $, decimal)
2. Test scrolling at memory boundaries (0x0000, 0xFFFF)
3. Test with varying instruction mixes (NOPs vs complex instructions)
4. Test rapid pause/resume cycles
5. Test window resizing during execution

## Next Steps

Start with high-priority issues that affect user experience:
1. Verify address input navigation
2. Fix memory boundary edge cases
3. Address race conditions in row calculation

Then move to medium priority issues for stability and correctness.