---
description: Commit git changes with logical grouping
---

Analyze the current git changes, including untracked files and create a well-structured commit.

Based on the changes, group them logically and create appropriate commit messages following conventional commits format (type: description). Types should be: fix, refactor, test, docs, chore, feat. Use lowercase for type except for "Add" or "Update" when appropriate.

Before committing, verify that tests pass.

If tests pass, create the commit with a clear, concise message that describes what was changed and why. Use the commit message format: "type: description" (e.g., "fix: resolve issue with file upload").

If there are multiple logical groups of changes, create separate commits for each group.
