---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Generate the domain the property claims

Apply this policy only to property tests: a generator (such as `fc.string()`, `fc.integer()`, `fc.record(...)`) fed to a property runner (such as `fc.assert(fc.property(...))`). A file with only example-based tests cannot violate it.

Compare the domain the test name or description claims with what the generator can actually produce. A claim over "every", "all", or "any" value of a type covers that type's edge classes too. Report any of these shapes:

- a test claiming behavior for every value of a type while the generator narrows that type, such as `it("handles every input", ...)` with `fc.string({ minLength: 1, maxLength: 20 })`, which can never produce the empty string or a long string;
- bounds, filters, or fixed alphabets (`minLength`, `maxLength`, `min`, `max`, `.filter(...)`, a constant-character generator) that remove a class relevant to the asserted behavior, such as empty, whitespace-only, very long, negative, zero, or non-ASCII values;
- a property claiming behavior for malformed or untrusted input while generating only valid domain values;
- a property claiming boundary behavior while the generator cannot reach that boundary.

Do not report a generator that produces the whole claimed type (such as plain `fc.string()` for "every string"), or a narrowed generator whose test states the same narrowed domain (such as "every non-empty value" with `minLength: 1`). Do not report omitted classes irrelevant to the asserted behavior.
