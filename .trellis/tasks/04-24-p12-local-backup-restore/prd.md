# P12 Local Backup Restore

## Goal

Add a minimal local backup and restore path for the desktop product so a user can export current local product data, import it back later, and recover from accidental local resets or machine changes without relying on any cloud service.

## Requirements

- Keep the feature local-first and file-based.
- Reuse the existing local data and reset surface instead of introducing a separate admin workflow.
- Support a minimal but useful backup payload:
  - product database
  - locally persisted provider metadata
  - locally persisted app settings needed to resume use
- Keep secrets out of the exported backup unless the current secret backend already stores them in exportable local files.
- Make restore behavior explicit and destructive-safe:
  - explain that current local data will be replaced
  - require an intentional restore action
- Keep Electron and local dev flows compatible.
- Keep bilingual user-facing copy.

## Acceptance Criteria

- [x] The product exposes an export backup action and an import/restore action in an existing local-data/settings surface.
- [x] Export creates a single portable local backup artifact that can be chosen by the user.
- [x] Restore can load that backup artifact, replace the targeted local data, and leave the app in a recoverable state.
- [x] Unsupported or malformed backups fail with clear user-facing errors.
- [x] Tests cover the new backup payload contract and renderer wiring.

## Technical Notes

- Prefer a simple archive or structured JSON manifest over a complicated migration system for this first cut.
- Reuse existing storage path helpers and existing reset/import flows where possible.
- Be explicit about what is and is not included in backups.
