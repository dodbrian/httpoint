# Ticket: Extract Directory Listing View

## Overview
Move `generateDirectoryListing` function from `src/serve.ts` to a dedicated view module.

## Details
- **Source**: `src/serve.ts:164-223`
- **Target**: `src/views/directory-listing.ts`
- **Function**: `generateDirectoryListing(dirPath: string, requestPath: string): string`

## Tasks
1. Create `src/views/` directory
2. Create `src/views/directory-listing.ts` with `generateDirectoryListing` function
3. Remove function from `src/serve.ts`
4. Add import in `src/serve.ts`

## Dependencies
- `../utils/format.ts` (for `formatFileSize`)

## Testing Notes
- Test directory listing generation
- Verify HTML structure preservation
- Ensure proper file/directory icons
- Test parent directory navigation
- Verify file size formatting integration

## Acceptance Criteria
- Function moved to new location
- Import added in serve.ts
- All existing functionality preserved
- Proper dependency on format utility
- No breaking changes to API