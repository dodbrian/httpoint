# Ticket: Extract Network Detection Utility

## Overview
Move IP detection logic from `src/serve.ts` to a dedicated utility module.

## Details
- **Source**: `src/serve.ts:21-25,336-349`
- **Target**: `src/utils/network.ts`
- **Interface**: `NetworkAddress`
- **Function**: `getLocalIP(): string`

## Tasks
1. Create `src/utils/network.ts` with `NetworkAddress` interface and `getLocalIP` function
2. Extract network interface detection logic from main() function
3. Remove interface and logic from `src/serve.ts`
4. Add import in `src/serve.ts`

## Dependencies
- None (pure function)

## Testing Notes
- Test on machines with multiple network interfaces
- Verify IPv4 address selection
- Ensure non-internal address preference
- Test fallback to localhost behavior

## Acceptance Criteria
- Interface and function moved to new location
- Network detection logic extracted from main()
- Import added in serve.ts
- All existing functionality preserved
- No breaking changes to API