---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate service interfaces from Layer construction

Apply this policy only to files that define a service capability/interface or construct its Layer. A file with neither a service definition nor a Layer cannot violate this rule, even if it performs provider I/O or validates a response.

Obtain a service's implementation dependencies (clients, drivers, gateways, or other services) once, while constructing its Layer, as in `Layer.effect(Orders, Effect.gen(function* () { const db = yield* DatabaseClient; ... }))`. Report any of these shapes:

- a service interface whose operation lists an implementation dependency in the third type argument of its `Effect`, such as `(id: string) => Effect.Effect<Order, OrderError, DatabaseClient>`;
- an operation that takes an implementation dependency as a parameter;
- an operation body that obtains an implementation dependency itself, such as `yield* DatabaseClient` inside the operation.

Requirements that genuinely vary per call, such as the current user, tenant, or transaction, may stay in the operation's Effect type.
