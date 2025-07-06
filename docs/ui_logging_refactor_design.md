# UI Logging Refactor Design

## Problem Statement

The current UI logging system displays alerts inline with content, causing:
- Intrusive and confusing user experience
- Inconsistent display across tabs (appears in Info/Inspector but not Debugger)
- Poor visual integration with the interface
- Alerts appearing at every start

## Proposed Solution

### 1. Alert Badge System
Move alert notifications to the right header area with:
- **Badge counters** showing count by type (info/warning/error)
- **Semantic colors** using design tokens
- **Non-intrusive** display that doesn't disrupt content

### 2. Alert Details Overlay
When badges are clicked:
- **Slide-out panel** from the right edge
- **Filterable list** of all alerts
- **Dismissable** individual messages
- **Clear all** functionality
- **Auto-dismiss** logic preserved

### 3. Architecture Changes

#### New Components:
1. **AlertBadges.tsx** - Header badge display
2. **AlertPanel.tsx** - Slide-out overlay for details
3. **AlertContainer.tsx** - Manages overlay state and animations

#### Modified Components:
1. **App.tsx** - Add badges to header, manage overlay state
2. **LoggingContext.tsx** - Add methods for getting counts by level
3. Remove **StatusPanel** from inline display

## How to Build It

### Badge System
```tsx
// In App.tsx header area (after tab buttons)
<div className="flex items-center gap-2 ml-auto">
  <AlertBadges 
    onInfoClick={() => setAlertPanelOpen(true, 'info')}
    onWarnClick={() => setAlertPanelOpen(true, 'warn')}
    onErrorClick={() => setAlertPanelOpen(true, 'error')}
  />
</div>
```

### Phase 2: Alert Panel
```tsx
// Overlay component with slide animation
<AlertPanel 
  isOpen={alertPanelOpen}
  initialFilter={alertFilter}
  onClose={() => setAlertPanelOpen(false)}
/>
```

### Benefits:
1. **Non-intrusive** - Alerts don't disrupt workflow
2. **Always visible** - Badge counts show system status at a glance
3. **Consistent** - Same UI across all tabs
4. **Scalable** - Can handle many alerts without cluttering interface
5. **Familiar pattern** - Similar to notification systems in modern apps

## Visual Design

### Badge Layout:
```
[Guide] [Inspector] [Debugger]                    ℹ️ 2  ⚠️ 1  ❌ 0
```

### Alert Panel:
- Slides in from right edge
- Semi-transparent backdrop
- Filter buttons at top
- Scrollable list of alerts
- Each alert shows: timestamp, source, message, dismiss button

## Color Scheme (using design tokens):
- Info badge: `designTokens.colors.semantic.info`
- Warning badge: `designTokens.colors.semantic.warning`
- Error badge: `designTokens.colors.semantic.error`
- Panel background: `designTokens.colors.surface.overlay`