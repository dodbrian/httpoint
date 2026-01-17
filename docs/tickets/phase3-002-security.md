# Phase 3-002: Security Middleware

## Description
Create security middleware to validate file paths and prevent directory traversal attacks.

## Acceptance Criteria
- Validates that resolved file paths start with config.root
- Detects and blocks directory traversal attempts (../)
- Provides clear error messaging for security violations
- Integrates with RequestContext interface
- Handles edge cases (symlinks, absolute paths)

## Implementation Details
- Create `src/middleware/security.ts`
- Function signature: `security(context: RequestContext): Promise<void>`
- Use `path.resolve()` and `path.normalize()` for path validation
- Compare resolved path against config.root
- Throw security violation error with descriptive message
- Handle both file and directory paths

## Dependencies
- Uses RequestContext from Phase 2
- Uses Node.js `path` module
- No external dependencies
- Independent security function

## Testing Notes
- Test with various traversal attempts
- Test with valid paths
- Test with symbolic links
- Test edge cases (empty paths, special characters)