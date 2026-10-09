---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make important consequences apparent

Apply this policy to functions and methods whose name, signature, or documentation tells callers what they do. Report one whose body has an important consequence that the description hides:

- a name that promises harmless local work (`calculateX`, `computeX`, `getX`, `formatX`, `toX`) whose body also writes or deletes data, issues an `update`/`insert`/`delete` query, writes a file, or sends a request that changes remote state, such as `calculateTotal()` that calls `saveOrder()`;
- a read or query that triggers an expensive or destructive action, such as `getReport()` that silently sends an email;
- a name promising a complete result (`getAllX`, `loadEveryX`, `fetchAllX`) whose body stops after a fixed number of pages, items, or rounds, as in `for (let i = 0; i < max; i++) { ...; if (!next) break }`, and returns what it has with no truncation flag, continuation token, or error, so callers silently receive partial data;
- a result presented as current or consistent that may be stale or partial without saying so.

Do not report a consequence that is apparent from the public name, result, or API: `saveReport()`, `deleteUser()`, `sendInvite()`, an explicitly returned `Effect`, a result type carrying `truncated` or `hasMore`, or an async `fetchX`/`loadX`/`listX` performing the read it names. A paging loop that ends only when the data runs out returns a complete result.
