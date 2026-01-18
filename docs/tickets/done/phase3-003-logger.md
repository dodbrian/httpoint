# Phase 3-003: Logger Middleware

## Description
Create logging middleware to handle HTTP request/response logging with configurable debug output.

## Acceptance Criteria
- Logs requests in format: "METHOD PATH STATUS_CODE"
- Supports debug mode for verbose logging
- Conditionally logs asset requests based on debug flag
- Logs POST request bodies in debug mode
- Integrates with RequestContext interface

## Implementation Details
- Create `src/middleware/logger.ts`
- Function signature: `logger(context: RequestContext, statusCode: number): Promise<void>`
- Use config.debug for conditional logging
- Skip asset requests unless debug mode is enabled
- Log POST bodies only in debug mode
- Format: `console.log(\`${req.method} ${context.requestPath} ${statusCode}\`)`

## Dependencies
- Uses RequestContext from Phase 2
- Uses config.debug flag
- No external dependencies
- Independent logging function

## Testing Notes
- Test with debug mode enabled/disabled
- Test different HTTP methods
- Test asset request filtering
- Verify POST body logging in debug mode