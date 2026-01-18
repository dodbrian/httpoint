# Test Helpers

This directory contains utility functions and helpers for testing.

## Available Helpers

### `mocks.ts`
- Mock implementations for Node.js built-in modules
- Mock factories for complex objects
- Common mock scenarios

### `test-server.ts`
- Test HTTP server utilities
- Request/response helpers
- Server lifecycle management

### `file-utils.ts`
- File system test utilities
- Temporary file creation/cleanup
- Test data generation

## Usage

Import helpers in your test files:

```typescript
import { createMockRequest } from '../helpers/mocks';
import { createTestServer } from '../helpers/test-server';
import { createTempFile } from '../helpers/file-utils';
```

## Guidelines

- Keep helpers focused and reusable
- Document helper functions clearly
- Use TypeScript types for better IDE support
- Reset state between tests