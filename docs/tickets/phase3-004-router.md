# Phase 3-004: Router Middleware

## Description
Create router middleware to dispatch requests to appropriate handlers based on URL patterns.

## Acceptance Criteria
- Routes requests to correct handlers based on path patterns
- Handles asset requests to `/_httpoint_assets/` path
- Distinguishes between file and directory requests
- Supports different HTTP methods (GET, POST)
- Integrates with RequestContext interface

## Implementation Details
- Create `src/middleware/router.ts`
- Function signature: `router(context: RequestContext): Promise<HandlerResult>`
- Pattern matching for asset paths
- File vs directory detection using fs.stat()
- Method-based routing (GET vs POST)
- Return handler function or direct response

## Dependencies
- Uses RequestContext from Phase 2
- Uses fs.promises.stat() for path checking
- Uses handlers from Phase 4 (as interface)
- No external dependencies
- Independent routing logic

## Testing Notes
- Test various path patterns
- Test different HTTP methods
- Test asset routing
- Test file vs directory detection
- Test invalid paths