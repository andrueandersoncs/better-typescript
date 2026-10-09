---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep expected failures out of the defect channel

Report code that moves an expected failure into the defect channel merely to simplify an Effect signature, such as `Effect.die(new NotFoundError())`, `Effect.orDie`, or a `throw` for a known domain error. Expected failures belong in the Effect error channel and should be composed or handled with Effect operators such as `Effect.catchTag`. Do not report genuine unexpected defects that remain in the defect channel.
