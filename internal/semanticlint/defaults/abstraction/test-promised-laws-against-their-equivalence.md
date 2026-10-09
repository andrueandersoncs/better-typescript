---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Test promised laws against their equivalence

Apply this policy to tests of code whose contract (a doc comment, a comment in the test, or the test name) promises a law: identity, associativity, idempotency, normalization, round trip, or wrapper transparency. The test for that law must state the law itself and compare by the promised equivalence, as in `expect(f(f(x))).toEqual(f(x))` for idempotency, or `expect(equivalent(decode(encode(x)), x)).toBe(true)` when the contract defines equivalence more loosely than structural equality. Report any of these shapes:

- a test named for or covering the law that only compares one call's output with a hard-coded expected value, such as `it("is idempotent", () => expect(f(alreadyNormal)).toBe(alreadyNormal))`;
- a round trip compared with `toEqual`/`toStrictEqual` against a literal holding one particular representation (for example, a specific element order or casing) when the contract says that detail is not significant or not preserved;
- an equivalence helper or comparator defined in the file but bypassed by the law test, which uses exact structural equality instead.

Do not report ordinary example tests that pin specific outputs alongside a test that does check the law, tests for behavior with no promised law, or shared contract tests that check the law across several implementations.
