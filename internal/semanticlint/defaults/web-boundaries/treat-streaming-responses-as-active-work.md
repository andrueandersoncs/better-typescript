---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Treat streaming responses as active work

Report a streaming response whose work is marked complete, whose owner is released, or whose concurrency slot is freed when the response starts rather than when its stream finishes or is canceled. Examples: releasing a semaphore immediately after `new Response(stream)`, or ending an Effect scope that owns the stream before `stream.cancel()` or close. Do not report a response whose stream remains owned and counted as active until finish or cancellation.
