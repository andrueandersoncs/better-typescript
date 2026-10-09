---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Control test nondeterminism

Report a test whose assertion depends on an uncontrolled clock, random value, locale, timezone, generated identifier, or scheduling order. Trace each asserted value back to its inputs; the test violates this rule when one of those inputs can differ between runs. Report any of these shapes:

- the current time flows into an asserted value, such as `const now = new Date(); expect(format(now)).toBe("03-14")` or `expect(elapsed(Date.now())).toBe(0)`, without fake timers, a test clock, or a fixed `new Date("...")`;
- a random value decides what is asserted, such as `const i = Math.floor(Math.random() * items.length); expect(items[i]).toBe("first")`;
- locale- or timezone-dependent formatting such as `value.toLocaleString()` or `Intl.DateTimeFormat()` without an explicit locale and `timeZone`, compared to a fixed string;
- concurrent work is left to run for a fixed number of ticks, yields, or milliseconds, and the test then asserts how far it got, such as `for (let i = 0; i < 50; i++) yield* Effect.yieldNow` or `await sleep(20)` followed by `expect(count).toBeLessThan(10)`, instead of waiting on a latch, `Deferred`, or promise the work signals, or advancing a test clock;
- a race between a timer and real work, such as `Promise.race([work(), delay(10)])`, decides the asserted outcome.

Do not report `crypto.randomUUID()`, `Math.random()`, or the current time used only to allocate an isolated name, key, or identifier whose value is never asserted, or random input that cannot affect the asserted behavior. Do not report generated values such as timestamps that the test copies from the actual result into its expected value instead of asserting them.
