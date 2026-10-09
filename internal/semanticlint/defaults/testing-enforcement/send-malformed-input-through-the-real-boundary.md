---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e,fixtures}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Send malformed input through the real boundary

Apply this policy to tests that check how invalid input is handled: the test name or assertion expects a rejection, error, or ignored input. Such a test must feed the bad input through the untrusted-input boundary that validates it, such as a decoder, request handler, parser, or message consumer, as in `expect((await handle(requestWith(badBody))).status).toBe(400)`. Report any of these shapes:

- a malformed value (missing required field, negative or out-of-range number, unknown tag) asserted to the domain type with `as T`, `as unknown as T`, or `<T>`, then passed straight to an internal function, such as `const input = { ...valid, count: -1 } as Input; expect(() => run(input)).toThrow()`;
- the file sends valid input through the boundary, such as a handler or `decode(...)`, but hands the malformed variant directly to the function behind it.

Do not report:

- valid domain input, even when built with a cast, such as a fixture cast with `as unknown as T` only to drop or add fields while every value is valid;
- malformed input supplied through the actual boundary, such as `decode(JSON.stringify(bad))` expected to fail.
