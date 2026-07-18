# Effect Skill Candidate Checks

## Status

Approved candidate backlog. This document records the review of the upstream Effect skill; it does
not add or enable checks.

## Source inventory

- Skill: [`skills/effect/SKILL.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/SKILL.md)
- References: [`skills/effect/references/`](https://github.com/kitlangton/skills/tree/main/skills/effect/references)
  - [`SCHEMA.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/SCHEMA.md)
  - [`SERVICES_LAYERS.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/SERVICES_LAYERS.md)
  - [`CONFIG.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/CONFIG.md)
  - [`SCHEDULING.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/SCHEDULING.md)
  - [`CACHING.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/CACHING.md)
  - [`STREAMS.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/STREAMS.md)
  - [`HTTP_CLIENTS.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/HTTP_CLIENTS.md)
  - [`TESTING.md`](https://github.com/kitlangton/skills/blob/main/skills/effect/references/TESTING.md)

## High-confidence static checks

| Check | Detection | Source advice |
| --- | --- | --- |
| `effect/no-unsafe-casts` | `as any`, other unchecked assertions, and non-null assertions in Effect code. | Do not silence Effect typing problems with casts. |
| `effect/no-schema-class-models` | `Schema.Class` and `Schema.TaggedClass`. | Avoid them as default data-model patterns. |
| `effect/no-typescript-namespaces` | TypeScript `namespace` declarations. | Do not use namespaces for organization. |
| `effect/no-process-env-in-app` | `process.env.*` or `process.env[...]` reads outside config/bootstrap code. | Use `Config` recipes and providers. |
| `effect/no-test-sleeps` | `Effect.sleep(...)` in test files. | Use deterministic synchronization and `TestClock`. |
| `effect/no-production-sleep-loops` | `while (true)` or recursive loops containing `Effect.sleep`. | Use `Effect.repeat` with `Schedule`. |
| `effect/no-unbounded-stream-collect` | `Stream.runCollect` in production code or on syntactically unbounded streams. | Collect only small, finite test streams. |
| `effect/no-unbounded-stream-buffer` | `Stream.buffer({ capacity: "unbounded" })`. | Use only when growth is bounded elsewhere. |
| `effect/no-handrolled-ttl-cache` | A `Map` storing expiry values with timestamp comparison/prune logic. | Prefer `Cache` when it fits. |
| `effect/no-inflight-dedupe-map` | A `Map` storing pending `Promise` or `Effect` work by request key. | `Cache.get` deduplicates missing-key lookups. |
| `effect/no-cache-per-request` | `Cache.make` or `Cache.makeWith` directly in request handlers or per-call functions. | Build caches once in their owning layer/scope. |
| `effect/no-scoped-client-in-cache-lookup` | `Layer.build`, `Effect.provide`, or client-layer construction in a `Cache.make*` lookup. | Acquire clients once in the layer. |
| `effect/no-raw-fetch-without-abort-signal` | `fetch` in `Effect.tryPromise` that ignores its supplied signal. | Wire `AbortSignal` into unavoidable raw fetch calls. |
| `effect/no-cause-recovery-for-typed-errors` | Broad `Effect.catchCause` or `Stream.catchCause` where typed recovery suffices. | Prefer typed-error recovery. |
| `effect/no-layer-forever-acquisition` | Layer acquisition directly runs an infinite stream/worker rather than forking it into scope. | Fork long-lived work into the layer scope. |
| `effect/no-global-config-mutation-tests` | `process.env` mutation in Effect tests. | Use `ConfigProvider` and test layers. |

## Checks requiring configuration or type information

| Check | Detection | Source advice |
| --- | --- | --- |
| `effect/service-method-effect-fn` | Exported/public service operations returning `Effect` but not wrapped with `Effect.fn("Domain.operation")`. | Name public and non-trivial service methods. |
| `effect/effect-fn-name` | Missing, anonymous, or non-domain-qualified `Effect.fn` names. | Use operation names such as `UserRepo.get`. |
| `effect/schema-record-interface` | A `Schema.Struct` value lacks a same-name interface extending its decoded type. | Pair ordinary record schemas with interfaces. |
| `effect/schema-optional-key` | `Schema.optional(...)` used for an object field without an explicit `undefined` contract. | Prefer `optionalKey` for absent keys. |
| `effect/schema-error-class` | Hand-rolled `_tag` error classes that could use `Schema.TaggedErrorClass`. | Use tagged schema error classes for typed Effect errors. |
| `effect/config-secret-redacted` | Config keys resembling credentials read with `Config.string` rather than `Config.redacted`. | Redact credentials. |
| `effect/config-refined-values` | Path, URL, port, or ID config read as unchecked `Config.string` when a schema exists. | Refine config values with schemas or `mapOrFail`. |
| `effect/retry-bounded-schedule` | `Effect.retry` with an unbounded schedule, unless explicitly waived. | Bound retry policies. |
| `effect/retry-without-jitter` | Exponential/fibonacci retry schedules without `Schedule.jittered`. | Avoid synchronized retry storms. |
| `effect/raw-fetch-outside-adapter` | `fetch` in service/domain/handler code rather than an explicit transport adapter. | Keep raw network effects at adapter boundaries. |
| `effect/http-response-unvalidated` | `response.json()` data crosses an adapter boundary without Schema decoding. | Decode unknown response bodies at boundaries. |
| `effect/http-status-before-decode` | Response-body decoding precedes status classification. | Classify HTTP status before decoding success payloads. |
| `effect/test-use-it-effect` | Plain test callbacks for Effect programs where `it.effect` is available. | Use `it.effect` by default. |
| `effect/test-live-runtime` | `it.live` without an explicit live-runtime justification or allowlist. | Use it only when live behavior is under test. |
| `effect/test-clock-for-time` | Tests exercise schedules, sleeps, retries, or timeouts without `TestClock`. | Use virtual time for time-sensitive tests. |

## Architectural advice checks

These should remain Advice diagnostics, backed by conservative heuristics or project configuration:

- **Thin HTTP handlers** — flag handler-local persistence/provider calls; recommend decode, service call, and typed-error-to-response mapping.
- **No provider/network work in transactions** — flag HTTP/client calls lexically inside known transaction callbacks.
- **Layer authority visibility** — flag `Context.Reference` defaults for credential, persistence, transport, or external-service tags.
- **No blind layer composition** — flag `Layer.mergeAll` and `provideMerge` unless locally justified. This is not a blanket ban; legitimate uses exist.
- **Scoped background work** — require `Effect.forkScoped`, `FiberSet`, or `FiberMap` for stream/listener/worker lifetime.
- **Cache instead of custom cache** — detect the complete Map-plus-TTL pattern rather than every `Map`.
- **Prefer `Stream.paginate`** — detect manual page-token loops that yield or accumulate pages.
- **Queue/PubSub/SubscriptionRef semantics** — flag public queue exposure and recommend exposing `Stream` to consumers.
- **Keyed stream-work helper** — detect ad-hoc `Map<Key, Fiber>` bookkeeping in stream consumers.
- **Typed error boundary mapping** — flag infrastructure errors escaping adapter/service boundaries without domain-error translation.
- **Schema decode at untrusted boundaries** — flag unknown request, response, row, or JSON values consumed without `Schema.decodeUnknownEffect`.
- **Retry only idempotent operations** — require an idempotency marker or allowlist before retrying mutation-shaped operations.
- **Expected worker/item failures remain observable** — flag `Effect.ignore` without nearby logging or a declared product-policy rationale.
- **Effect HTTP client preference** — advise `effect/unstable/http/HttpClient` for server-side Effect adapters while preserving documented raw-fetch exceptions.

## Constraints for future implementation

- Check source symbols and modules rather than raw spellings; aliases, barrels, and shadowing must not affect results.
- Prefer existing Better TypeScript checks and the official Effect language-service diagnostics over duplicate reports.
- Use Advice, not errors, when project intent cannot be established with high confidence.
- Keep recognized exceptions explicit and local: tests, bootstrap/configuration, adapters, composition roots, and documented raw-fetch boundaries.
