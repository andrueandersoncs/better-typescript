---
globs:
  - "**/*"
---
# Represent conceptual hierarchy structurally

When several peers share a meaningful context, represent that context once with a shared boundary and name each peer by what distinguishes it. Do not flatten a conceptual hierarchy by repeating its context in every name.

Use the smallest native boundary that expresses real ownership: a directory for related files, a module or object for related code, a package for an independently owned contract, or a route segment for related endpoints. Choose boundaries from cohesion, not merely from matching text.

Repeated prefixes or suffixes across siblings signal a likely missing boundary. Keep the repetition only when consumers cannot see the shared context, an external convention requires it, or removing it would make the siblings ambiguous.

For example, sibling files named `semantic-lint-config.ts`, `semantic-lint-rules.ts`, and `semantic-lint-run.ts` should be `semantic-lint/config.ts`, `semantic-lint/rules.ts`, and `semantic-lint/run.ts`. Unrelated files that happen to begin with the same word should remain separate.