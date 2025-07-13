# Apple1JS Documentation

This directory contains all project documentation, organized for easy navigation and maintenance.

## 📁 Directory Structure

### `/active/` - Current Reference Documentation

Living documents that are actively maintained and reflect the current state of the project.

- **[architecture.md](active/architecture.md)** - Primary architecture reference with system overview, module structure, and key interfaces
- **[cpu_test_guidelines.md](active/cpu_test_guidelines.md)** - Guidelines for writing and maintaining CPU tests
- **[roadmap.md](active/roadmap.md)** - Feature roadmap and improvement tracking for the project
- **[standardization-progress.md](active/standardization-progress.md)** - Tracks ongoing code standardization efforts and completed work
- **[type-hierarchy.md](active/type-hierarchy.md)** - Documents the TypeScript type system organization
- **[user_experience_analysis.md](active/user_experience_analysis.md)** - UX improvements tracking and ideas to explore
- **[woz_monitor_cheatsheet.md](active/woz_monitor_cheatsheet.md)** - Quick reference for WOZ Monitor commands
- **[ui_logging_implementation.md](active/ui_logging_implementation.md)** - Current UI logging system documentation

### `/adr/` - Architecture Decision Records

Captures significant architectural decisions with their context and rationale.

- Formal ADR format for tracking important decisions
- Each decision includes context, consequences, and implementation details
- See [ADR index](adr/README.md) for the complete list

### `/proposals/` - Unimplemented Ideas

Design documents for features that have been proposed but not yet implemented.

- **[ui_logging_badge_system.md](proposals/ui_logging_badge_system.md)** - Proposed alert badge system (NOT IMPLEMENTED)

### `/archive/` - Historical Documentation

Point-in-time analyses and completed work for historical reference.

- **2024-12_architecture_analysis.md** - Initial architecture analysis and refactoring notes
- **2025-01_state_management_analysis.md** - State management patterns investigation
- **2025-07_cpu_timing_validation.md** - CPU timing accuracy validation report
- **2025-07_performance_analysis_debugger.md** - Debugger performance investigation
- **2025-07_test_coverage_snapshot.md** - Test coverage analysis at a point in time
- **type_consolidation_plan_completed.md** - Completed type system consolidation plan

## 🧭 Which Document Do I Need?

### For Understanding the System

→ Start with **[architecture.md](active/architecture.md)**

### For Writing Tests

→ See **[cpu_test_guidelines.md](active/cpu_test_guidelines.md)**

### For Type System Questions

→ Check **[type-hierarchy.md](active/type-hierarchy.md)**

### For Understanding Past Decisions

→ Browse the **[ADRs](adr/)**

### For Current Work Status

→ Review **[standardization-progress.md](active/standardization-progress.md)**

### For UI/UX Improvements

→ See **[user_experience_analysis.md](active/user_experience_analysis.md)**

### For Future Plans and Improvements

→ Check **[roadmap.md](active/roadmap.md)**

### For Using the Apple 1

→ Reference **[woz_monitor_cheatsheet.md](active/woz_monitor_cheatsheet.md)**

## 📝 Documentation Guidelines

### Active Documents

- Keep up-to-date with code changes
- Mark sections that become outdated
- Use clear version references

### Proposals

- Clearly mark as "PROPOSAL - NOT IMPLEMENTED"
- Include rationale and design details
- Update status if implemented

### Archive

- Add date prefix when archiving (YYYY-MM_filename.md)
- Don't modify archived documents
- Reference in new documents when relevant

### ADRs

- Follow the ADR template
- Number sequentially (ADR-NNN)
- Never delete, only supersede

## 🔄 Maintenance

When making significant changes:

1. Update relevant active documentation
2. Consider if an ADR is needed
3. Archive outdated analyses with dates
4. Keep this README current
