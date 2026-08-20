# LayerMap.Service overlap report

## Selected example

[`01_effect/05_resources/30_layer-map.ts`](../../repos/effect/ai-docs/src/01_effect/05_resources/30_layer-map.ts)

> **@title Dynamic resources with LayerMap**
>
> Use `LayerMap.Service` to dynamically build and manage resources that are keyed by some
> identifier, such as a tenant ID.

## Documented predicate

- **Situation:** resources are dynamically built and managed by an identifier.
- **Noncompliant pattern:** an observable keyed resource registry omits or replaces
  `LayerMap.Service`.
- **Advice:** use `LayerMap.Service`.
- **Predicate:** the situation and noncompliant pattern together.

“Use” is normative and establishes an omitted or replaced alternative. The JSDoc does not require a
particular resource name, key name, declaration form, cache API, lifetime policy, or AST target.

## Catalog coverage

The frozen catalog contains 129 built-ins. Its implementations, messages, tests, and fixtures do not
collectively detect every keyed resource registry that omits `LayerMap.Service` and give equivalent
advice. No catalog rule mentions `LayerMap`, `RcMap`, or `ScopedCache`.

- `scoped-client-cache` detects Effect acquisition, `Effect.provide`, `Layer.build`, and Layer
  acquisition nested in an Effect `Cache` lookup. It does not advise `LayerMap.Service`.
- `cache-per-request` owns where `Cache.make` is constructed, not the keyed Layer-backed resource
  abstraction.
- `cache-preference`, `handrolled-ttl-cache`, and `inflight-dedupe-map` advise Effect `Cache` for
  hand-rolled caches when its semantics fit. They do not recognize the complete candidate predicate.
- Layer composition, acquisition-lifetime, and `Layer.unwrap` rules own independent Layer concerns.

The candidate is therefore uncovered, not exactly covered.

## Blocking competing predicate

[`scoped-client-cache`](../../packages/rules/src/rules/scoped-client-cache/index.ts) reports a
Layer build or acquisition inside an Effect `Cache` lookup. It advises:

> Acquire clients outside Cache lookup functions and share them through a layer. Build the client
> once in the owning layer, then make lookup a plain call.

The candidate instead advises replacing the same keyed, Layer-backed registry design with
`LayerMap.Service`. One says to remove per-key acquisition from the lookup and share one client
through the owning Layer. The other says to use a facility that builds keyed Layers on demand.
These are competing remediations for the same registry and acquisition decision.

## Minimal overlap witness

```ts
import { Cache, Context, Layer } from "effect"

class Client extends Context.Tag("Client")<Client, { readonly tenant: string }>() {}

const clientLayer = (tenant: string) => Layer.succeed(Client, { tenant })

export const clients = Cache.make({
  capacity: 32,
  timeToLive: "1 minute",
  lookup: (tenant: string) => Layer.build(clientLayer(tenant))
})
```

This is a registry that dynamically builds and caches a Layer-provided resource by tenant. It omits
`LayerMap.Service`, so it satisfies the candidate predicate. The current catalog mechanically
reports `scoped-client-cache` on `Layer.build` inside the `Cache.make` lookup. Both findings govern
whether and where the keyed client Layer is acquired. Different possible targets such as
`Cache.make`, its `lookup`, and `Layer.build` do not make the decisions independent.

## Authoritative API boundaries

Vendored Effect source documents several valid keyed-value and keyed-resource abstractions:

- [`LayerMap.Service`](../../repos/effect/packages/effect/src/LayerMap.ts) creates a generated
  `Context.Service` class with default Layers and static `get`, `contextEffect`, and `invalidate`
  helpers.
- [`LayerMap.make`](../../repos/effect/packages/effect/src/LayerMap.ts) directly creates a dynamic
  keyed map of Layer-built service contexts when that generated class is not the API shape.
- [`LayerMap.fromRecord`](../../repos/effect/packages/effect/src/LayerMap.ts) creates a LayerMap from
  a predefined record of Layers.
- [`RcMap`](../../repos/effect/packages/effect/src/RcMap.ts) directly acquires reference-counted
  scoped values by key and releases them after their last active reference.
- [`ScopedCache`](../../repos/effect/packages/effect/src/ScopedCache.ts) gives each cached resource
  value an entry scope and closes it on expiry, eviction, invalidation, or cache closure.
- Ordinary [`Cache`](../../repos/effect/packages/effect/src/Cache.ts) stores values and exits without
  per-entry scoped resource ownership.

These boundaries show that `LayerMap.Service` is not the sole authoritative keyed abstraction. The
candidate JSDoc does not say when the generated service-class form owns a situation instead of these
alternatives. They also do not remove the witness: it observably uses a keyed Cache lookup to build a
Layer-backed service context, and the existing rule already owns that acquisition decision.

## Attempted source-grounded distinctions

| Attempted distinction | Result |
| --- | --- |
| Treat the JSDoc as capability-only | Rejected. “Use `LayerMap.Service`” is normative and establishes an omitted or replaced alternative. |
| Only report a class that should extend `LayerMap.Service` | Rejected. An omitted generated class has no complete observable marker, and this would miss non-class keyed registries covered by the wording. |
| Exclude Effect `Cache` alternatives | Rejected. The JSDoc says keyed dynamic resources and contains no Cache exclusion. The witness stores a Layer-built service context by key. |
| Treat Cache entries as values rather than resources | Rejected for the witness. `Layer.build(clientLayer(tenant))` observably acquires the Layer and returns its service context. |
| Require the alternative itself to return a `Layer` | Rejected as partial. The documented decision includes building and managing resources; building the Layer into a context does not leave that situation. |
| Restrict the candidate to public or generated service APIs | Rejected. Visibility and API-boundary conditions are absent from the JSDoc. |
| Use the sample names `PoolMap`, `DatabasePool`, or `tenantId` | Rejected. Names below the JSDoc cannot add policy, and “such as” makes tenant ID an example. |
| Exclude clients because the candidate says resources | Rejected. Clients and connections are resources in LayerMap and RcMap source, and the existing scanner does not mechanically require a client name. |
| Restrict alternatives to direct `RcMap` use | Rejected as partial. `LayerMap` uses RcMap internally, but the JSDoc does not limit noncompliance to that implementation API. |
| Assign `LayerMap.make` and `fromRecord` to non-service situations | This is authoritative API guidance, but the candidate JSDoc supplies no observable conjunct that proves when a generated service class is required. It does not exclude the Cache witness. |
| Distinguish bounded TTL caches from idle reference-counted resources | Rejected for the candidate. Capacity, TTL, idle time, and reference counts are absent from its JSDoc. |
| Restrict ordinary Cache to unscoped values | This is an authoritative boundary for compliant ordinary Cache use, but the witness crosses it by calling `Layer.build`; overlap remains. |
| Choose a different AST target | Rejected. The Cache constructor, lookup property, and nested Layer build represent one registry/acquisition design. |
| Exclude the exact current `scoped-client-cache` matches | Rejected. Negating another scanner's implementation is not a source-grounded predicate and removes the minimal witness. |

The other Cache rules also pose pairwise competing-advice risks. A hand-rolled keyed registry can be
advised toward `Cache`, while the candidate can advise the same resource registry toward
`LayerMap.Service`; a per-request keyed registry can receive placement advice instead of replacement
advice. Those risks would need their own source-supported ownership conjuncts. The direct
`scoped-client-cache` witness is already sufficient to block a unique rule.

## Earlier-example ledger

| Example | Classification | Evidence |
| --- | --- | --- |
| `01_effect/01_basics/01_effect-gen.ts` | Existing overlap outcome | Its async/await workflow intersects `no-async-functions`; see [`01_effect--01_basics--01_effect-gen.md`](01_effect--01_basics--01_effect-gen.md). |
| `01_effect/01_basics/02_effect-fn.ts` | Covered | `prefer-effect-fn` detects functions that return `Effect.gen` across the documented function forms and advises `Effect.fn`. |
| `01_effect/01_basics/10_creating-effects.ts` | Ineligible | It is a capability overview of independent source kinds, with no one noncompliant pattern and advice. |
| `01_effect/02_schema/10_schema-basics.ts` | Ineligible | Defining, decoding, and encoding are independent concerns without one common predicate. |
| `01_effect/03_services/01_service.ts` | Covered | `prefer-context-service-class` implements the class-style `Context.Service` preference. |
| `01_effect/03_services/10_reference.ts` | Ineligible | It describes the default-value capability but supplies no normative advice or noncompliant alternative. |
| `01_effect/03_services/20_layer-composition.ts` | Covered | `dependent-layer-merge` detects dependent `merge` and `mergeAll` composition and advises `Layer.provide` or `Layer.provideMerge`. |
| `01_effect/03_services/20_layer-unwrap.ts` | Covered | `prefer-layer-unwrap` detects the manual `Layer.effect` and `Layer.flatMap` bridge and advises `Layer.unwrap`. |
| `01_effect/04_errors/01_error-handling.ts` | Ineligible | It is a descriptive, multi-topic definition and recovery overview without one common predicate. |
| `01_effect/04_errors/10_catch-tags.ts` | Existing overlap outcome | Its broad multi-tag recovery predicate conflicts with supported `catch` and array-valued `catchTag`; see [`01_effect--04_errors--10_catch-tags.md`](01_effect--04_errors--10_catch-tags.md). |
| `01_effect/04_errors/20_reason-errors.ts` | Existing overlap outcome | Its reason-recovery predicate conflicts with supported parent `catchTag` and `catch`; see [`01_effect--04_errors--20_reason-errors.md`](01_effect--04_errors--20_reason-errors.md). |
| `01_effect/05_resources/10_acquire-release.ts` | Ineligible | Cleanup need is not completely observable. A service can omit `acquireRelease` because its value needs no cleanup, and constructor or resource names would be invented markers. |
| `01_effect/05_resources/20_layer-side-effects.ts` | Ineligible | The type erases whether an Effect performs background work. Treating any alternative `Layer<never>` construction as noncompliant would falsely report ordinary effects such as `Effect.succeed(Context.empty())`; API-specific background markers would cover only an invented subset. |

## Conclusion

The candidate is uncovered but not uniquely scoped. The Cache witness satisfies its full
source-derived predicate and is mechanically reported by `scoped-client-cache` at the same keyed
resource acquisition decision. The two rules would give competing remediation, and no
source-supported conjunct assigns disjoint ownership. This run therefore adds no TypeScript rule or
test changes.
