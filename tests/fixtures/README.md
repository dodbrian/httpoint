# Test Fixtures

This directory contains test data and fixtures used across the test suite.

## Directory Structure

```
fixtures/
├── sample-files/           # Sample files for testing
│   ├── test.html
│   ├── test.css
│   ├── test.js
│   ├── test.json
│   └── test.txt
├── multipart-data/         # Multipart form data samples
│   ├── single-file.txt
│   ├── multiple-files.txt
│   └── malformed.txt
├── test-configs/           # Configuration test data
│   ├── valid-config.json
│   ├── invalid-config.json
│   └── edge-cases.json
└── directory-structure/   # Test directory layouts
    ├── empty-dir/
    ├── nested/
    └── special-chars/
```

## Usage Guidelines

- Keep fixtures minimal and focused
- Use descriptive names
- Update fixtures when source code changes
- Document any special requirements in fixture comments