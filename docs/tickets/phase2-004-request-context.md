# Phase 2-004: Request Context

## Description
Create a request context module to encapsulate request-specific data and utilities.

## Current State
Request context is handled inline in the server callback:
- URL parsing
- Path resolution
- Body buffer collection
- Request metadata

## Target State
Create `src/context/request.ts` with:
- RequestContext interface
- `createRequestContext()` function
- Body parsing utilities
- Path resolution with security validation
- Request metadata collection

## Implementation Steps
1. Create `src/context/request.ts`
2. Define RequestContext interface
3. Extract URL parsing logic
4. Extract body collection logic
5. Extract path resolution logic
6. Add security validation (directory traversal)
7. Create `createRequestContext()` function
8. Update server callback to use new context

## Files to Create
- `src/context/request.ts`

## Files to Modify
- `src/serve.ts` - Update server callback

## Validation
- `npm run build` - TypeScript compilation
- `npm run lint` - Code style compliance
- Manual testing - All request types handled correctly

## Dependencies
- Depends on Config interface (ticket 2-001)

## Lines of Code
- ~15 lines moved from serve.ts
- ~10 lines added for interface and function structure

## Testing Notes
- Test various URL formats
- Verify directory traversal protection
- Confirm body parsing for uploads