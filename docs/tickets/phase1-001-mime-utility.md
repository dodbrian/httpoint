# Ticket: Extract MIME Type Detection Utility

## Overview
Move `getMimeType` function from `src/serve.ts` to a dedicated utility module.

## Details
- **Source**: `src/serve.ts:83-101`
- **Target**: `src/utils/mime.ts`
- **Function**: `getMimeType(filePath: string): string`

## Tasks
1. Create `src/utils/` directory if it doesn't exist
2. Create `src/utils/mime.ts` with the `getMimeType` function
3. Remove the function from `src/serve.ts`
4. Add import for `getMimeType` in `src/serve.ts`

## Dependencies
- None (pure function)

## Testing Notes
- Test with various file extensions
- Verify default MIME type for unknown extensions
- Ensure case-insensitive extension matching works

## Acceptance Criteria
- Function moved to new location
- Import added in serve.ts
- All existing functionality preserved
- No breaking changes to API