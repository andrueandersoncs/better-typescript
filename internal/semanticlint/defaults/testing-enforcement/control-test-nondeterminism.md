---
globs:
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Control test nondeterminism

Check each test separately: trace every asserted value back to its inputs. The test violates this rule when one of those inputs is an uncontrolled clock, random value, locale, timezone, or scheduling order. One such test is enough to report the file, even if other tests are deterministic. Report any of these shapes:

- the current time reaches the code under test, stored or inline, such as `const now = new Date(); expect(format(now)).toBe("03-14")` or `expect(isExpired(token, new Date())).toBe(false)`, without fake timers, a test clock, or a fixed `new Date("...")`; a constant expected value does not make the result stable;
- a random value or generated identifier decides what is asserted, such as `expect(items[Math.floor(Math.random() * items.length)]).toBe("first")`, or an exact expected value for an ID the code creates with `crypto.randomUUID()` or a counter shared across tests;
- `toLocaleString()` or `Intl.DateTimeFormat()` without an explicit locale and `timeZone`, compared to a fixed string;
- concurrent work runs for real time or a fixed number of yields, then the test asserts how far it got, such as `await sleep(20)`, `Effect.sleep("20 millis")` in a live test, or a loop of `Effect.yieldNow`, followed by `expect(count).toBe(2)`, instead of awaiting a latch or `Deferred` or advancing a test clock;
- `Promise.race([work(), delay(10)])` decides the asserted outcome.

Do not report random IDs or the current time used only to build an isolated name or key whose value is never asserted, random input that cannot change the asserted result, or generated values the test copies from the actual result into its expectation.
