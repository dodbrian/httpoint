# Phase 2-003: Config Validator

## Description
Extract configuration validation logic from `src/serve.ts` into a dedicated config validator module.

## Current State
Configuration validation is done inline in the `main()` function:
```typescript
if (!fs.existsSync(config.root)) {
  console.error(`Error: Directory '${config.root}' does not exist`);
  process.exit(1);
}
```

## Target State
Create `src/config/validator.ts` with:
- `validateConfig()` function
- Root directory existence check
- Port number validation (if needed)
- Proper error handling and messages
- Export for validation functionality

## Implementation Steps
1. Create `src/config/validator.ts`
2. Extract validation logic from main()
3. Create `validateConfig()` function
4. Add proper imports (Config interface, fs)
5. Add export for validation function
6. Update `src/serve.ts` to use new validator

## Files to Create
- `src/config/validator.ts`

## Files to Modify
- `src/serve.ts` - Update main() function

## Validation
- `npm run build` - TypeScript compilation
- `npm run lint` - Code style compliance
- Manual testing - Invalid root directory handled correctly

## Dependencies
- Depends on Config interface (ticket 2-001)

## Lines of Code
- ~8 lines moved from serve.ts
- ~5 lines added for function structure and exports

## Testing Notes
- Test with non-existent root directory
- Verify error message format
- Confirm process.exit behavior