# Comlink Migration Plan

> **Status**: 🚧 In Progress  
> **Started**: July 2025  
> **Target Completion**: Phase-based approach, no fixed deadline  

## Executive Summary

Migration from manual `postMessage/onmessage` worker communication to Google's Comlink library for type-safe, RPC-style worker interaction. This migration will reduce worker communication code by ~50% while improving type safety and maintainability.

## Decision Record

### Why Comlink?

**Decision Date**: July 13, 2025

**Key Factors**:

- **Bundle Size**: 1.1KB (acceptable for our use case)
- **Type Safety**: Full TypeScript support with auto-completion
- **Usage**: 809K weekly downloads, 507+ dependent packages
- **Maintenance**: Stable with recent commit (June 2025)
- **Fit**: Perfect for our command/response pattern

**Alternatives Evaluated**:

- Workerize: Less features, basic TypeScript support
- Greenlet: Too simple for our needs
- Native postMessage: Current approach, lacks type safety

## Current Architecture Analysis

### Existing Implementation

```typescript
// 400+ line switch statement in Apple.worker.ts
onmessage = function (e: MessageEvent<WorkerMessage>) {
    switch (type) {
        case WORKER_MESSAGES.SET_BREAKPOINT:
            // ... implementation
            break;
        // ... 30+ more cases
    }
}
```

### Problems Identified

1. **Module-level state**: `export const video = new WebCRTVideo()`
2. **Large switch statement**: 400+ lines, hard to maintain
3. **No type safety**: Easy to miss message handling
4. **Testing complexity**: Requires manual mocking

## Migration Strategy

### Phase 0: Architecture Preparation ✅ COMPLETED

**Goal**: Refactor worker to be Comlink-ready without breaking changes

**Tasks**:

- [x] Create `WorkerState` class to encapsulate module-level variables
- [x] Move `video`, `keyboard`, `apple1` into class instance
- [x] Create `IWorkerAPI` interface
- [x] Refactor message handlers into methods
- [x] Ensure all tests still pass

**Success Criteria**:

- Zero functional changes
- All 601 tests passing
- Code ready for Comlink integration

### Phase 1: Hybrid Implementation ✅ COMPLETED

**Goal**: Implement Comlink for low-frequency operations

**Tasks**:

- [x] Install Comlink: `yarn add comlink`
- [x] Create `Apple.worker.comlink.ts` parallel implementation
- [x] Implement WorkerAPI class with Comlink.expose
- [x] Add feature flag: `USE_COMLINK_WORKER` in config.ts
- [x] Create WorkerManager service for abstraction
- [x] Integrate WorkerManager in index-web.tsx
- [x] Keep postMessage for video updates (high frequency)
- [ ] Create performance benchmarks (deferred to Phase 2)

**Success Criteria**:

- Both implementations working side-by-side ✅
- All tests passing with both implementations ✅
- Type-safe command operations ✅

### Phase 2: Full Migration

**Goal**: Complete migration to Comlink

**Tasks**:

- [ ] Migrate remaining message types
- [ ] Implement event handling strategy
- [ ] Remove old postMessage implementation
- [ ] Update all tests to use new API
- [ ] Update documentation
- [ ] Remove feature flag

**Success Criteria**:

- 100% Comlink-based communication
- Improved code maintainability
- All tests passing

## Technical Design

### New Worker API Interface

```typescript
// src/apple1/types/worker-api.ts
export interface IWorkerAPI {
    // Emulation Control
    pauseEmulation(): void;
    resumeEmulation(): void;
    step(): DebugData;
    saveState(): EmulatorState;
    loadState(state: EmulatorState): void;
    
    // Breakpoints
    setBreakpoint(address: number): number[];
    clearBreakpoint(address: number): number[];
    clearAllBreakpoints(): void;
    getBreakpoints(): number[];
    
    // Memory Operations
    readMemoryRange(start: number, length: number): number[];
    writeMemory(address: number, value: number): void;
    getMemoryMap(): MemoryMapData;
    
    // Configuration
    setCrtBsSupport(enabled: boolean): void;
    setCpuProfiling(enabled: boolean): void;
    setCycleAccurateMode(enabled: boolean): void;
    setDebuggerActive(active: boolean): void;
    
    // Events (using callbacks)
    onVideoUpdate: (callback: (data: VideoData) => void) => void;
    onBreakpointHit: (callback: (address: number) => void) => void;
    onEmulationStatus: (callback: (status: string) => void) => void;
}
```

### Hybrid Event Strategy

```typescript
// High-frequency events stay with postMessage
video.subscribe((data) => {
    postMessage({ type: 'VIDEO_UPDATE', data });
});

// Low-frequency events use Comlink callbacks
class WorkerAPI implements IWorkerAPI {
    private breakpointCallbacks: Set<(addr: number) => void> = new Set();
    
    onBreakpointHit(callback: (address: number) => void) {
        this.breakpointCallbacks.add(Comlink.proxy(callback));
    }
}
```

## Performance Considerations

### Benchmarks to Track

1. **Message Latency**: Time from command to response
2. **Video Frame Rate**: Must maintain 60fps
3. **Bundle Size Impact**: Target < 2KB increase
4. **Memory Usage**: Proxy object overhead

### Optimization Strategy

- Keep video updates on postMessage (60Hz)
- Batch operations where possible
- Use transferables for large data
- Profile proxy overhead

## Risk Management

### Identified Risks

1. **Performance Regression**: Mitigated by hybrid approach
2. **Breaking Changes**: Feature flag allows rollback
3. **Test Complexity**: Parallel implementations during migration
4. **Browser Compatibility**: Comlink supports all modern browsers

### Rollback Plan

```typescript
// Quick rollback via environment variable
const USE_COMLINK = import.meta.env.VITE_USE_COMLINK !== 'false';
```

## Progress Tracking

### Phase 0 Checklist ✅

- [x] WorkerState class created
- [x] Module-level state refactored
- [x] IWorkerAPI interface defined
- [x] Message handlers converted to methods
- [x] Worker refactoring complete
- [x] Type errors fixed (filtered debug data for backward compatibility)

### Phase 1 Checklist ✅

- [x] Comlink installed (4.4.2)
- [x] Parallel implementation created (Apple.worker.comlink.ts)
- [x] Feature flag implemented (USE_COMLINK_WORKER in config.ts)
- [x] WorkerManager service created for abstraction
- [x] Both implementations working side-by-side
- [x] All 601 tests passing with both modes
- [ ] Performance benchmarks (deferred to Phase 2)

### Phase 2 Checklist

- [ ] All message types migrated
- [ ] Event handling implemented
- [ ] Old code removed
- [ ] Documentation updated
- [ ] Migration complete

## Code Examples

### Before (Current)

```typescript
// Main thread
sendWorkerMessage(worker, WORKER_MESSAGES.SET_BREAKPOINT, 0x300);

// Worker
case WORKER_MESSAGES.SET_BREAKPOINT: {
    if (typeof data === 'number') {
        breakpoints.add(data);
        updateBreakpointHook();
        postMessage({
            data: Array.from(breakpoints),
            type: WORKER_MESSAGES.BREAKPOINTS_DATA
        });
    }
    break;
}
```

### After (Comlink)

```typescript
// Main thread
const api = Comlink.wrap<IWorkerAPI>(worker);
const breakpoints = await api.setBreakpoint(0x300);

// Worker
class WorkerAPI implements IWorkerAPI {
    setBreakpoint(address: number): number[] {
        this.breakpoints.add(address);
        this.updateBreakpointHook();
        return Array.from(this.breakpoints);
    }
}
```

## Dependencies

- **comlink**: ^4.4.2 (current latest)
- **TypeScript**: Already in project
- **Vite**: Already configured for workers

## References

- [Comlink GitHub](https://github.com/GoogleChromeLabs/comlink)
- [Comlink NPM](https://www.npmjs.com/package/comlink)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

## Phase 1 Implementation Details

### What Was Built

1. **Parallel Worker Implementation** (`Apple.worker.comlink.ts`)
   - ComlinkWorkerAPI wrapper class
   - Event subscription support with Comlink.proxy
   - Hybrid postMessage interception for gradual migration

2. **WorkerManager Service** (`src/services/WorkerManager.ts`)
   - Unified interface for both worker implementations
   - Feature flag checking from config
   - Transparent API that works with both modes
   - Type-safe method signatures

3. **Configuration System**
   - Added `USE_COMLINK_WORKER` to existing config
   - No environment variables needed
   - Easy toggle between implementations

### Key Design Decisions

1. **Hybrid Approach**: Video updates still use postMessage in Comlink mode for performance
2. **Wrapper Pattern**: WorkerManager abstracts implementation details from consumers
3. **Backwards Compatibility**: All existing code continues to work unchanged
4. **Type Safety**: Full TypeScript support maintained across both implementations

### Testing Results

- ✅ All 601 tests pass with `USE_COMLINK_WORKER: false`
- ✅ All 601 tests pass with `USE_COMLINK_WORKER: true`
- ✅ Build succeeds with both workers included
- ✅ No performance regression observed

## Notes

- Migration improves code quality regardless of messaging approach
- Required refactoring benefits the codebase long-term
- Phased approach minimizes risk and allows performance validation
- This is a learning opportunity aligned with project philosophy

---

**Last Updated**: July 13, 2025  
**Phase 1 Completed**: July 13, 2025  
**Next Review**: Before starting Phase 2
