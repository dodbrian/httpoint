# Phase 3-001: Body Collector Middleware

## Description
Create middleware to buffer incoming request body into memory for processing by subsequent middleware and handlers.

## Acceptance Criteria
- Buffers entire request body into a Buffer
- Handles different request methods appropriately
- Preserves raw binary data for multipart parsing
- Integrates with RequestContext interface
- Handles edge cases (empty body, large payloads)

## Implementation Details
- Create `src/middleware/body-collector.ts`
- Function signature: `bodyCollector(context: RequestContext): Promise<void>`
- Use `req.on('data')` and `req.on('end')` events
- Concatenate chunks into single Buffer
- Store result in `context.body`
- Handle memory limits appropriately

## Dependencies
- Uses RequestContext from Phase 2
- No external dependencies
- Independent utility function

## Testing Notes
- Test with various request sizes
- Test with different content types
- Test with empty requests
- Verify binary data integrity