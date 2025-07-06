# Performance Analysis: Disassembler & Debug Components

## Overview

Analysis of performance issues in the disassembler and debug components, particularly CPU overhead when the disassembler tab is open.

## Key Findings

### 1. Redundant Periodic Updates

Multiple components are requesting debug information independently:

- **Apple.worker.ts:241-249**: Sends `DEBUG_DATA` every 100ms with only PC value
- **DebuggerLayout.tsx:39-42**: Requests full `DEBUG_INFO` every 100ms
- **DisassemblerPaginated.tsx:329-332**: Requests `DEBUG_INFO` every 100ms when paused
- **MemoryViewerPaginated.tsx:134**: Requests memory data every 500ms

This creates unnecessary worker message traffic and processing overhead.

### 2. Inefficient Message Broadcasting

The worker sends `DEBUG_DATA` every 100ms to ALL components, even when:

- The debugger is not visible
- The disassembler tab is not active
- The emulation is running at full speed

### 3. Duplicate Data Requests

When the debugger is open:

- `DEBUG_DATA` provides only PC updates
- `DEBUG_INFO` provides full CPU state
- Both are being requested simultaneously, creating redundant work

### 4. Memory Polling

Components poll for memory data even when:

- The view hasn't changed
- The memory hasn't been modified
- The component isn't visible

## Performance Impact

### CPU Overhead Sources:

1. **Worker Message Processing**: ~10 messages/second minimum
2. **Data Serialization**: Converting debug objects to messages
3. **React Re-renders**: Each message triggers component updates
4. **Memory Reads**: Continuous memory range requests for disassembly

### Estimated Overhead:

- Base: 10 msgs/sec × 2ms/msg = 20ms/sec (2% CPU)
- With multiple tabs: Can reach 5-10% CPU usage
- During stepping/debugging: Additional spikes

## Recommended Optimizations

### 1. Conditional Updates (High Priority)

Only send debug data when needed:

```typescript
// Worker: Track if debugger is active
let debuggerActive = false;
let activeDebugTabs = new Set<string>();

// Only send updates if debugger is open
if (debuggerActive) {
    // Send debug data
}
```

### 2. Consolidate Update Mechanisms (High Priority)

- Remove the global 100ms `DEBUG_DATA` timer
- Use request-based updates only
- Combine `DEBUG_DATA` and `DEBUG_INFO` into single message type

### 3. Smart Memory Caching (Medium Priority)

- Cache memory reads in components
- Only re-request when PC changes significantly
- Implement dirty tracking for memory modifications

### 4. Visibility-Based Updates (Medium Priority)

- Track which debug tab is active
- Only update visible components
- Pause updates for hidden tabs

### 5. Throttle Updates During Execution (Medium Priority)

- Reduce update frequency when running (not paused)
- Increase frequency only during stepping/debugging
- Use 500ms intervals for running state, 100ms for paused

### 6. Batch Worker Messages (Low Priority)

- Combine multiple data requests into single message
- Reduce message passing overhead

## Implementation Plan

### Phase 1: Quick Wins

1. Make worker debug timer conditional on debugger visibility
2. Remove duplicate DEBUG_INFO requests in DisassemblerPaginated when not paused
3. Increase update interval to 250ms for running state

### Phase 2: Architectural Improvements

1. Implement debugger active state tracking
2. Add visibility detection for debug tabs
3. Create unified debug data request system

### Phase 3: Advanced Optimizations

1. Implement memory caching layer
2. Add dirty tracking for memory regions
3. Create predictive prefetching for disassembly

## Expected Results

- 50-70% reduction in CPU usage when debugger is open
- Near-zero overhead when debugger is closed
- Smoother UI interactions during debugging
