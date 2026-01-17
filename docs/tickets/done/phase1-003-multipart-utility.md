# Ticket: Extract Multipart Parser Utility

## Overview
Move `parseMultipart` function and `MultipartPart` interface from `src/serve.ts` to a dedicated utility module.

## Details
- **Source**: `src/serve.ts:15-19,114-162`
- **Target**: `src/utils/multipart.ts`
- **Interface**: `MultipartPart`
- **Function**: `parseMultipart(body: Buffer, boundary: string): MultipartPart[]`

## Tasks
1. Create `src/utils/multipart.ts` with `MultipartPart` interface and `parseMultipart` function
2. Remove interface and function from `src/serve.ts`
3. Add imports in `src/serve.ts`

## Dependencies
- None (pure function)

## Testing Notes
- Test with various multipart boundaries
- Verify proper parsing of file metadata
- Ensure binary data preservation
- Test edge cases (empty parts, malformed data)

## Acceptance Criteria
- Interface and function moved to new location
- Imports added in serve.ts
- All existing functionality preserved
- No breaking changes to API