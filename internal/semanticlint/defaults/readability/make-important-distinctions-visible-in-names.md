---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make important distinctions visible in names

Apply this policy to names of variables, parameters, properties, and config or interface fields whose value has a unit or representation that matters: durations, money, sizes, rates, and timestamps.

Put the unit or representation in the name when the value could be read more than one way, as in `retryDelayMs`, `amountCents`, `sizeBytes`, or `expiresAtUtc`. Report any of these shapes:

- a plain `number` duration such as `delay`, `interval`, `timeout`, or `ttl` that code passes to a unit-specific API, such as `Duration.seconds(delay)` or `setTimeout(fn, delay)`, or scales to another unit;
- a money or measurement field such as `price` or `amount` without its unit, especially when sibling fields carry one (`baseCents` beside `amount`) or code divides it into major units for display;
- a timestamp such as `created_at` or `date` when its time zone, epoch unit, or string format matters.

Do not report a name whose type already carries the unit (`Duration`, `Date`, a branded money type), plain counts such as `retryCount`, or a value whose unit cannot reasonably be confused.
