---
globs:
  - "**/*.{ts,tsx}"
---
# Use schemas for external contracts

Report an external request, response, or event contract that has no schema as its source of truth, or whose TypeScript type is handwritten instead of derived from that schema. Examples: an HTTP body declared only as `interface CreateOrderRequest`, or a queue payload declared as `type OrderEvent` rather than derived from `Schema.Struct(...)` with `Schema.Schema.Type<typeof OrderEventSchema>`. Do not report schemas and types used only for internal contracts.
