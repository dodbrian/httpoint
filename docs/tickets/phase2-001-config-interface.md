# Phase 2-001: Config Interface

## Description
Extract the Config interface and related types from `src/serve.ts` into a dedicated config module.

## Current State
The Config interface is defined inline in `src/serve.ts`:
```typescript
interface Config {
  port: number | string;
  root: string;
  debug: boolean;
}
```

## Target State
Create `src/config/types.ts` with:
- Config interface
- Any related types (e.g., port validation types)
- Type exports for use by other modules

## Implementation Steps
1. Create `src/config/types.ts`
2. Move Config interface to new file
3. Add proper export
4. Update import in `src/serve.ts`

## Files to Create
- `src/config/types.ts`

## Files to Modify
- `src/serve.ts` - Update import

## Validation
- `npm run build` - TypeScript compilation
- `npm run lint` - Code style compliance
- Manual testing - Application functionality preserved

## Dependencies
- None (standalone types)

## Lines of Code
- ~5 lines moved from serve.ts
- ~2 lines added for exports