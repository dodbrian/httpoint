# Phase 2-002: Config Parser

## Description
Extract the argument parsing logic from `src/serve.ts` into a dedicated config parser module.

## Current State
The `parseArgs()` function in `src/serve.ts` handles:
- Command line argument parsing
- Environment variable processing
- Help text display
- Error handling for unknown arguments

## Target State
Create `src/config/parser.ts` with:
- `parseArgs()` function
- `printHelp()` function
- Proper error handling and validation
- Exports for config parsing functionality

## Implementation Steps
1. Create `src/config/parser.ts`
2. Move `parseArgs()` function to new file
3. Move `printHelp()` function to new file
4. Add proper imports (Config interface)
5. Add exports for both functions
6. Update imports in `src/serve.ts`

## Files to Create
- `src/config/parser.ts`

## Files to Modify
- `src/serve.ts` - Update imports

## Validation
- `npm run build` - TypeScript compilation
- `npm run lint` - Code style compliance
- Manual testing - All CLI options work correctly

## Dependencies
- Depends on Config interface (ticket 2-001)

## Lines of Code
- ~40 lines moved from serve.ts
- ~5 lines added for exports

## Testing Notes
- Test with various argument combinations
- Verify help text displays correctly
- Confirm environment variable processing