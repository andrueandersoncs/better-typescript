---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Treat streaming responses as active work

Apply this policy only to code that consumes or produces a streamed body incrementally: a `ReadableStream`, `response.body`, a `getReader()` reader, `pipeTo`/`pipeThrough`, or `new Response(stream)`. Code that reads a body fully with `await body.json()`, `.text()`, or `.arrayBuffer()` cannot violate this rule.

A stream is active work until it finishes or is canceled. Completion, results, and released ownership must wait for that point, as in `await response.body.pipeTo(destination)`. Report any of these shapes:

- `stream.pipeTo(destination)` or a similar transfer promise that is neither awaited nor returned, followed by returning a result or reporting success while the transfer is still running;
- reading part of a stream through a reader and then returning without `await reader.cancel()` or `body.cancel()`, leaving the unread transfer running with no owner;
- releasing a semaphore permit or lock, decrementing an in-flight counter, marking a job done, or closing the owning scope right after `new Response(stream)` is created, instead of in the stream's finish or cancel handling.

Do not report a stream that is awaited until it ends, canceled before returning, read to completion, or skipped because the body is `null`.
