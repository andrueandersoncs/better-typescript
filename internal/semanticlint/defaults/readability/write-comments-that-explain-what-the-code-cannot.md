---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Write comments that explain what the code cannot

Apply this policy to code whose correctness depends on a rule, limit, or guarantee that lives outside the code: a business or legal rule, an external contract, or a concurrency or ordering guarantee. Names and control flow show what such code does; only a comment can say why it must be so.

Report the file when any of these appears without a comment giving its reason:

- a bare numeric cap on how many times an action may happen (sends, attempts, uses), such as `if (record.sentCount >= 3) return false` or `if (attempts > 5) return`, with no comment or named constant saying where the limit comes from;
- a deliberate ordering or normalization step that exists only to protect a guarantee, such as sorting two keys before taking row locks on them so concurrent callers cannot deadlock (`const [a, b] = [x, y].sort()` followed by two locking queries);
- a deliberately slower, redundant, or surprising choice that preserves a guarantee, such as re-reading a value inside a transaction or bypassing a cache.

A comment satisfies the policy when it states the reason or the source of the constraint, not when it merely restates the code. Do not report code whose purpose and constraints are already clear from its names and control flow, such as a constant whose name states its meaning or a plain unit conversion.
