# Performance Analysis: Disassembler & Debug Components

## What's This About

I noticed the CPU usage goes up when the debugger is open, especially with the disassembler tab. Here's what I found when digging into it.

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

### CPU Overhead Sources

1. **Worker Message Processing**: ~10 messages/second minimum
2. **Data Serialization**: Converting debug objects to messages
3. **React Re-renders**: Each message triggers component updates
4. **Memory Reads**: Continuous memory range requests for disassembly

### Estimated Overhead

- Base: 10 msgs/sec × 2ms/msg = 20ms/sec (2% CPU)
- With multiple tabs: Can reach 5-10% CPU usage
- During stepping/debugging: Additional spikes

## Ideas to Make It Faster

### 1. Only Update When Needed

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

### 2. Combine the Update Messages

- Remove the global 100ms `DEBUG_DATA` timer
- Use request-based updates only
- Combine `DEBUG_DATA` and `DEBUG_INFO` into single message type

### 3. Cache Memory Reads

- Cache memory reads in components
- Only re-request when PC changes significantly
- Implement dirty tracking for memory modifications

### 4. Only Update What's Visible

- Track which debug tab is active
- Only update visible components
- Pause updates for hidden tabs

### 5. Slow Down Updates When Running

- Reduce update frequency when running (not paused)
- Increase frequency only during stepping/debugging
- Use 500ms intervals for running state, 100ms for paused

### 6. Bundle Messages Together

- Combine multiple data requests into single message
- Reduce message passing overhead

## How I Might Fix This

### Easy Stuff First

1. Only run the debug timer when the debugger is actually open
2. Stop the duplicate requests when not paused
3. Use slower updates (250ms) when running

### Bigger Changes

1. Track when the debugger is active
2. Know which tab is visible
3. Make one unified way to request debug data

### Fancy Stuff (Maybe Later)

1. Cache memory reads
2. Track which memory changed
3. Pre-fetch disassembly before it's needed

## What This Should Fix

- Cut CPU usage by half or more when debugging
- Almost no overhead when debugger is closed
- Smoother UI when stepping through code
