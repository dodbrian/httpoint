# Ticket: Extract File Size Formatting Utility

## Overview
Move `formatFileSize` function from `src/serve.ts` to a dedicated utility module.

## Details
- **Source**: `src/serve.ts:103-112`
- **Target**: `src/utils/format.ts`
- **Function**: `formatFileSize(bytes: number): string`

## Tasks
1. Create `src/utils/format.ts` with the `formatFileSize` function
2. Remove the function from `src/serve.ts`
3. Add import for `formatFileSize` in `src/serve.ts`

## Dependencies
- None (pure function)

## Testing Notes
- Test with various file sizes (B, KB, MB, GB, TB)
- Verify decimal precision (1 decimal place)
- Ensure proper unit selection based on size

## Acceptance Criteria
- Function moved to new location
- Import added in serve.ts
- All existing functionality preserved
- No breaking changes to API