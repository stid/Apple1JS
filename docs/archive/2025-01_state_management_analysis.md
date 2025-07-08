# State Management and Routing Analysis

_Date: December 2025_  
_Analysis of current patterns and potential improvements_

## Summary

Apple1JS uses a simple, pragmatic approach to state management that works well. I've found some synchronization issues in cross-view navigation that would be good to fix. The current approach isn't broken - it just needs some targeted improvements to make it more robust.

## Current Architecture

### State Management

1. **Worker-UI Separation** (Excellent Pattern ✅)
   - Core emulation state lives in Web Worker
   - UI state managed in React components
   - Message-based communication prevents race conditions
   - Clear separation of concerns

2. **React Context for Cross-Cutting Concerns** (Good Pattern ✅)
   - `LoggingContext`: Centralized logging with batched updates
   - `DebuggerNavigationContext`: Cross-view navigation events
   - Appropriate use of Context API for app-wide state

3. **Component-Level State** (Appropriate ✅)
   - Tab selection, UI preferences in `AppContent`
   - Local state for component-specific needs
   - No prop drilling issues

### Navigation Architecture

1. **Tab-Based Navigation** (Fit for Purpose ✅)
   - Simple state-based tab switching
   - No URL routing (appropriate for emulator)
   - Three main views: Info, Inspector, Debugger

2. **Cross-View Navigation via Context** (Has Issues ⚠️)
   - `AddressLink` → `DebuggerNavigationContext` → Tab switch + Address navigation
   - Works but has synchronization problems

## Identified Pain Points

### 1. Navigation Synchronization Issues 🔴

**Problem**: Different components handle navigation differently, causing race conditions.

```typescript
// MemoryViewerPaginated: Only syncs once
useEffect(() => {
  if (initialAddress !== undefined && !hasInitialized.current) {
    hasInitialized.current = true;
    setCurrentAddress(initialAddress);
  }
}, [initialAddress]);

// DisassemblerPaginated: Continuous sync with potential feedback loops
useEffect(() => {
  if (externalAddress !== undefined && externalAddress !== lastExternalAddress.current) {
    lastExternalAddress.current = externalAddress;
    navigateTo(externalAddress);
  }
}, [externalAddress, navigateTo]);
```

**Impact**:

- Potential infinite loops when switching tabs
- Inconsistent behavior between memory viewer and disassembler
- Address changes might not propagate correctly

### 2. Pending Navigation Pattern 🟡

**Problem**: Complex handoff between components for navigation.

```typescript
// AppContent stores pending navigation
const [pendingNavigation, setPendingNavigation] = useState<...>

// DebuggerLayout receives and clears it
initialNavigation={pendingNavigation}
onNavigationHandled={() => setPendingNavigation(null)}
```

**Impact**:

- Extra state management complexity
- Potential for lost navigation events
- Timing-dependent behavior

### 3. No State Persistence 🟡

**Current Behavior**:

- Complete state loss on page refresh
- No URL-based deep linking
- Manual save/load only option

**Impact**:

- Users lose work on accidental refresh
- Can't share specific debugger views
- No progressive enhancement

### 4. Event Listener Management in Context 🟡

**Problem**: Direct array manipulation for listeners.

```typescript
setListeners(prev => [...prev, callback]);
```

**Impact**:

- Recreates array on each subscription
- Potential memory leaks if not cleaned up
- Could use Map or Set for better performance

## Ideas for Improvement

### Worth Fixing Soon 🔧

#### 1. Standardize Navigation Synchronization

Create a unified navigation hook that handles the synchronization pattern consistently:

```typescript
// useNavigableComponent.ts
export function useNavigableComponent(
  externalAddress: number | undefined,
  onAddressChange?: (address: number) => void
) {
  const [currentAddress, setCurrentAddress] = useState(0);
  const [navigationSource, setNavigationSource] = useState<'external' | 'internal'>('external');
  const lastExternalAddress = useRef<number>();

  // Handle external navigation
  useEffect(() => {
    if (externalAddress !== undefined && 
        externalAddress !== lastExternalAddress.current &&
        navigationSource === 'external') {
      lastExternalAddress.current = externalAddress;
      setCurrentAddress(externalAddress);
    }
  }, [externalAddress, navigationSource]);

  // Handle internal navigation
  const navigateInternal = useCallback((address: number) => {
    setNavigationSource('internal');
    setCurrentAddress(address);
    onAddressChange?.(address);
    // Reset source after a tick
    setTimeout(() => setNavigationSource('external'), 0);
  }, [onAddressChange]);

  return { currentAddress, navigateInternal };
}
```

#### 2. Simplify Pending Navigation

Instead of storing pending navigation in AppContent, handle it directly in DebuggerLayout:

```typescript
// DebuggerLayout.tsx
const [hasHandledInitialNav, setHasHandledInitialNav] = useState(false);

useEffect(() => {
  const unsubscribe = subscribeToNavigation((event) => {
    // Direct handling, no pending state needed
    if (event.target === 'disassembly') {
      setActiveView('disassembly');
      setDisassemblerAddress(event.address);
    } else if (event.target === 'memory') {
      setActiveView('memory');
      setMemoryViewAddress(event.address);
    }
  });
  return unsubscribe;
}, [subscribeToNavigation]);
```

### Nice to Have Features 📋

#### 1. Add Optional URL State for Debugger

Implement lightweight URL state for debugger views without adding a routing library:

```typescript
// useDebuggerUrlState.ts
export function useDebuggerUrlState() {
  const [state, setState] = useState(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    return {
      view: params.get('view') as DebugView || 'overview',
      address: params.get('addr') ? parseInt(params.get('addr')!, 16) : undefined
    };
  });

  const updateUrl = useCallback((view: DebugView, address?: number) => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (address !== undefined) {
      params.set('addr', address.toString(16));
    }
    window.location.hash = params.toString();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      setState({
        view: params.get('view') as DebugView || 'overview',
        address: params.get('addr') ? parseInt(params.get('addr')!, 16) : undefined
      });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return { state, updateUrl };
}
```

#### 2. Add Session Storage for UI Preferences

```typescript
// usePersistedState.ts
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue;
      window.sessionStorage.setItem(key, JSON.stringify(nextValue));
      return nextValue;
    });
  }, [key]);

  return [value, setPersistedValue] as const;
}

// In AppContent
const [rightTab, setRightTab] = usePersistedState('ui.rightTab', 'info');
const [supportBS, setSupportBS] = usePersistedState('ui.supportBS', CONFIG.CRT_SUPPORT_BS);
```

### Future Possibilities 💭

#### 1. Event Bus Pattern for Navigation

If navigation becomes more complex, consider an event bus:

```typescript
class NavigationBus extends EventTarget {
  navigate(address: number, target: NavigationTarget) {
    this.dispatchEvent(new CustomEvent('navigate', { 
      detail: { address, target } 
    }));
  }
}

export const navigationBus = new NavigationBus();
```

#### 2. State Machine for Complex Flows

If we add breakpoints, watchpoints, and complex debugging:

```typescript
// Using XState or similar
const debuggerMachine = createMachine({
  initial: 'idle',
  states: {
    idle: {},
    running: {},
    paused: {},
    stepInto: {},
    stepOver: {},
    runningToAddress: {}
  }
});
```

## What NOT to Do ❌

1. **Don't add Redux/Zustand/MobX** - Current state management is sufficient
2. **Don't add React Router** - URL routing adds complexity without clear benefit
3. **Don't centralize all state** - Component-local state is working well
4. **Don't rewrite the Worker communication** - Message passing is solid

## Conclusion

The current architecture is **fundamentally sound** but needs **targeted fixes** for navigation synchronization. The recommendations above will:

1. Fix immediate bugs without major refactoring
2. Add useful features (URL state, preference persistence) without complexity
3. Prepare for future features without over-engineering

**Key Principle**: Keep it simple. The focus is emulation accuracy, not complex UI state management. Any improvements should enhance the experience without compromising the simplicity that makes this codebase fun to work with.

## Things to Explore

**If the navigation bugs get annoying**:

- [ ] Try the `useNavigableComponent` hook approach
- [ ] Fix synchronization between MemoryViewer and Disassembler
- [ ] Simplify the pending navigation pattern

**Would be cool to have**:

- [ ] URL state for sharing debugger views with others
- [ ] Remember UI preferences between sessions

**Maybe someday**:

- [ ] Event bus if navigation gets more complex
- [ ] State machine if we add complex debugging features
