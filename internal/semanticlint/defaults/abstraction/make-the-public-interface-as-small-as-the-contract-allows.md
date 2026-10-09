---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make the public interface as small as the contract allows

Report a public export, member, option, type, or broad parameter list that exposes an implementation detail callers do not need. Examples: exporting `SqlOrderRow`, accepting a `cacheTableName` option, or making an internal parsing helper public. Do not report a narrow public member or type required by the caller-facing contract, even when it is implemented near private code. Keep private helpers and folder, storage, transport, schema, and cache details out of the public surface.
