---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Preserve replay data for generated failures

Apply this policy only to tests whose checked input is generated: drawn from a property-test generator or from a random source such as `Math.random()` or `crypto.getRandomValues(...)`. Tests whose inputs are all literals, and nondeterminism that is not generated data (such as reading the current clock), cannot violate it.

When a generated value decides whether the test passes, its failure must carry the seed or the generated value so the case can be replayed. Report any of these shapes:

- an unseeded random draw that feeds an asserted outcome, where the failure reports neither seed nor drawn value, such as `const i = Math.floor(Math.random() * items.length)` followed by `if (items[i] !== expected) throw new Error("mismatch")`;
- catching a property-check error and discarding it: a bare `catch { throw new Error("property failed") }`, or a `catch (e)` whose new error or log line never uses `e`;
- running a generator manually in a loop and failing with a fixed message that omits the generated input.

Do not report:

- a failure message that includes the seed, the counterexample, or the drawn value, such as `JSON.stringify(input)`;
- a catch that rethrows the caught error or attaches it as the cause, such as `catch (e) { throw new Error("property failed", { cause: e }) }`, since that error still carries the seed and counterexample;
- a draw derived from a constant, explicit seed (such as `createRng(42)`);
- a random value used only as an opaque unique identifier that cannot change whether any assertion passes.
