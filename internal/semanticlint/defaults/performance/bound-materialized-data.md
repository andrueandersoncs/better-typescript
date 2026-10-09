---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Bound materialized data

Apply this policy to whole-body reads (`response.arrayBuffer()`, `response.json()`, `response.text()`, `readFile`), collection-to-array conversion, deep clones, JSON serialization, and stream collection on data whose size can grow beyond the operation's memory or request budget.

Report such a call unless an enforced byte bound limits the data actually materialized:

- a fetched response read whole with no size limit, such as `new Uint8Array(await response.arrayBuffer())`;
- a whole-body read guarded only by the peer-declared `Content-Length` header, such as `if (Number(res.headers.get("content-length")) > max) throw ...` followed by `await res.arrayBuffer()`. The header may be absent or wrong, and the read still consumes the whole body, so this is not an enforced bound;
- `Array.from(records)`, `structuredClone(payload)`, `JSON.stringify(body)`, or `Stream.runCollect(stream)` on variable-size input.

An enforced bound limits the bytes read, such as counting bytes while streaming and aborting past the limit, or checking a local file's size with `stat` before reading it. Do not report small fixed configuration or protocol values, input bounded this way, or code that streams or chunks when the complete value is not required at once.
