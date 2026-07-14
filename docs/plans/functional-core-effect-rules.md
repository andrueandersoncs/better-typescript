# Plan: functional-core-effect-rules

## Status

Implementation complete and verified on branch `functional-core-effect-rules` in
the isolated worktree `.claude/worktrees/functional-core-effect-rules`.

The original checkout was on `main`, ahead of `origin/main` by two commits, with
one untracked `.claude/worktrees/` directory. That checkout must remain untouched.

## Policy decision

Effect values are not the imperative shell. `Effect<A, E, R>` and `Layer` are
pure descriptions. The irreversible boundary is where concrete capabilities are
accessed, implementations are provided, resources are acquired, or an Effect
runtime executes a program.

Enforce three architectural zones plus explicit seam and support roles:

1. **Domain** — pure decisions over immutable data. No Effect programs, service
   lookup, mutable runtime state, promises, or concrete capabilities.
2. **Application** — declarative Effect programs. May require domain-owned ports
   and approved Effect runtime capabilities, but must leave `R` requirements open
   and must not choose live implementations.
3. **Adapter** — concrete implementations at seams. May call external systems,
   but every foreign effect must be suspended and every resource lifetime scoped.
4. **Port** — `Context.Tag` declarations and narrow service interfaces owned by
   the application/domain side of a seam. No live implementation.
5. **Composition root** — chooses Layers, closes requirements, and runs the
   program. It contains wiring, not business policy.
6. **Test** — may provide and run programs while substituting adapters.

The dependency direction is:

```text
domain
  ↑
port
  ↑
application
  ↑
adapter
  ↑
composition root
```

Tests may depend on every role. An adapter may import application code because an
inbound adapter can invoke a use case; application code may never import an
adapter. Unclassified files are ignored by the conventional policy so adoption is
additive. Projects requiring complete enforcement must supply an explicit role
classifier that classifies every relevant first-party file.

## Interface design

Expose one deep module rather than eleven unrelated configuration surfaces:

- `FunctionalCoreEffectPolicy` — file-role classifier plus registries for
  additional capability modules and resource factories.
- `defaultFunctionalCoreEffectPolicy` — conservative conventional directory and
  entrypoint names.
- `roleByPrefixes` — deterministic longest-prefix classifier for projects that
  want complete, explicit coverage.
- `makeFunctionalCoreEffectWiring(policy)` — returns the complete reported check,
  silent architectural evidence, and derived advice.
- `functionalCoreEffectWiring` — ready-made wiring using the conventional policy.

Internally, the reported check carries a distinct data `kind` for each invariant.
This keeps one policy identity and one program index while preserving exact local
messages, evidence, and regression assertions. Silent file-shape evidence feeds
higher-level advice without turning heuristics into local errors.

The functional-core wiring remains a separate opt-in preset. It must not be folded
into `defaultWiring`: architecture roles are project-specific, and a guessed role
must never produce a hard report. This repository will explicitly compose the new
preset into its self-host wiring so the integration path stays exercised.

## Reported boundary invariants

### 1. Architecture dependency direction

**Detection:** a classified first-party import or re-export resolves to a role not
allowed by the importing/exporting file's role.

Allowed imports:

| Importer    | First-party roles allowed          |
| ----------- | ---------------------------------- |
| domain      | domain                             |
| port        | domain, port                       |
| application | domain, port, application          |
| adapter     | domain, port, application, adapter |
| root        | every role                         |
| test        | every role                         |

Resolve aliases and TypeScript path mappings through the Program rather than
comparing raw import strings. Report on the module specifier.

### 2. Pure domain core

**Detection:** a domain file imports, re-exports, or declares an
execution/program capability: `Effect`, `Layer`, `Context`, `Stream`, `Sink`,
`Channel`, `Ref`, `Queue`, `PubSub`, `SubscriptionRef`, `FiberRef`, `Runtime`,
`ManagedRuntime`, `Scope`, an explicit `Promise` type, or an inferred Promise
through an `async` function.

Pure Effect data modules remain allowed, including `Option`, `Either`, `Schema`,
immutable collections, `Data`, `Match`, `Predicate`, and `Function`.

Direct I/O is owned by the direct-capability invariant; first-party direction is
owned by the dependency-direction invariant; mutation remains owned by the
existing `no-mutation` family. Avoid duplicate reports.

### 3. Direct capabilities stay in adapters

**Detection:** domain, port, or application code accesses an ambient or imported
concrete capability.

Default ambient capabilities:

- `fetch`
- `console.*`
- `Date.now` and zero-argument `new Date`
- `Math.random`
- `crypto.randomUUID`
- timers
- `process.env`
- `localStorage` and `sessionStorage`

Default imported capability modules:

- Node I/O/network/process builtins
- `@effect/platform` client modules such as FileSystem and HttpClient
- policy-supplied external SDK module prefixes

Resolve symbols so shadowed local identifiers are not reported. Wrapping a direct
capability in `Effect.sync` does not legalize its placement outside an adapter.

### 4. Runtime execution stays at entrypoints

**Detection:** `Effect.run*` (including `runCallback`), `Runtime.run*`, platform
`runMain`, or static/instance `ManagedRuntime` construction and execution outside
root or test files.

Service implementations must return Effect values rather than tunnel through a
stored runtime or Promise.

### 5. Provisioning stays at composition roots

**Detection:** `Effect.provide*`, `Layer.provide*`, `ManagedRuntime.make`, or an
`Effect.Service` `.Default` implementation selected outside root or test files.

`Layer.effect`, `Layer.scoped`, and `Layer.succeed` remain legal in adapters
because they define adapters; selecting and composing them belongs to the root.

### 6. Ports and live implementations stay separate

**Detection in port files:**

- a class extends `Effect.Service` and therefore owns a default implementation;
- `Layer.effect`, `Layer.scoped`, or `Layer.succeed` constructs a live adapter;
- a service declaration embeds concrete `dependencies`.

`Context.Tag` is the preferred port declaration. `Effect.Service` is not banned
globally: it remains appropriate where co-locating a default implementation is an
intentional module decision.

### 7. Service contracts do not leak infrastructure

**Detection:** an exported port declaration exposes `Promise`, runtime handles,
SDK/client/connection types, mutable Effect state (`Ref`, `Queue`, `PubSub`,
etc.), or a type from a configured capability module.

Service methods may return `Effect` or `Stream`. Their public error and value
channels should use domain-owned types. Implementation dependencies belong in the
constructing Layer rather than every method's `R` channel; the official Effect
`leakingRequirements` diagnostic remains the authority for that type-level
mistake.

### 8. No service locator or context bag

**Detection:** non-root, non-test code uses `Effect.context*`, `Context.get`,
`Context.unsafeGet`, passes `Context.Context` as a parameter/result, or stores a
Runtime/ManagedRuntime as a service field.

Require individual tags through the Effect requirements channel.

### 9. Adapter foreign effects are suspended

**Detection:** an adapter/root executes a known direct capability outside the lazy
callback of `Effect.async`, `Effect.promise`, `Effect.suspend`, `Effect.sync`,
`Effect.try`, or `Effect.tryPromise`.

Explicitly catch eager forms such as:

- module-initialization I/O;
- `Effect.succeed(fetch(...))`;
- `Layer.succeed(Tag, createClient())`;
- calling a Promise-returning SDK method directly inside `Effect.gen`.

### 10. Resource acquisition is scoped

**Detection:** a resource-like constructor/factory (`*Client`, `*Connection`,
`*Pool`, `connect`, `createClient`, plus configured names) is not inside a lazy
suspension callback nested within a scoped lifecycle: `Layer.scoped`,
`Layer.scopedContext`, `Layer.scopedDiscard`, `Effect.acquireRelease`,
`Effect.acquireReleaseInterruptible`, or `Effect.acquireUseRelease`. Merely
passing an already-created resource to a scoped constructor remains eager and is
reported.

Do not infer that every class is a resource. Require an imported collaborator and
a resource name from the policy registry/suffix set.

### 11. Runtime state stays behind service Layers

**Detection:**

- `Ref.unsafeMake`, `FiberRef.unsafeMake`, or equivalent eager state outside a
  lazy suspension callback nested within the scoped lifecycles listed above;
- state constructors in domain/port code;
- a public port contract exposes mutable Effect state;
- mutable runtime state is created during module initialization.
- eagerly constructed state passed into a scoped constructor.

Local `Ref.make` inside an application Effect is allowed: the invariant targets
shared/escaping state, not every local state machine. Existing `no-mutation` and
`imperative-state-manager` remain the primary evidence for first-party mutation.

## Advisory architecture evidence

Heuristics remain silent detections and become advice only after a meaningful
threshold.

### Overgrown Effect orchestrator

Evidence: an `Effect.gen`/`Effect.fn` body acquires at least two distinct services
and contains either at least two domain branch points or at least three directly
owned calls to non-Effect transformation helpers. Calls nested beneath `yield*`,
inside nested callbacks, or made through Effect control/runtime modules do not
count as transformations.

Remediation: read through ports, call a pure decision function over plain data,
then execute the returned decisions through ports. Exclude control flow dedicated
to retries, concurrency, resource safety, and typed error recovery where it can be
recognized.

### Business logic in an adapter

Evidence: an adapter contains a cluster of domain branching/matching and
calculation rather than translation and foreign-effect handling. A single branch
is not evidence.

### Thick composition root

Evidence: a root contains multiple function bodies or policy branches beyond
Layer construction, provisioning, entry-program selection, and runtime execution.
Callbacks and branches nested inside recognized `Layer`, `Effect`, `Runtime`,
`ManagedRuntime`, and platform `runMain` composition calls are excluded. A named
helper is also excluded when its entire body directly returns one recognized
composition call; extracting composition into a name must not create evidence.

### Pure service candidate

Evidence: a `Context.Tag`/`Effect.Service` surface contains only deterministic
plain-value functions, has no Effect/Stream return, no state, and no setup.
`Effect.Service` makers using `succeed`/`sync`, or `effect` wrapping
`Effect.succeed`/`Effect.sync`, are inspected. Services with non-empty or dynamic
`dependencies`, and scoped/effectful makers whose setup cannot be proven absent,
are excluded.

Remediation: prefer an ordinary pure function or explicit function parameter.
This remains advisory because an injected policy/strategy can be a legitimate
seam.

### Imperative core aggregate

Emit file-level advice when a domain/application file accumulates multiple
distinct boundary kinds. The evidence must name the contributing local invariants;
never infer the aggregate from a raw line-count threshold alone.

## Effect diagnostic overlap

Do not duplicate Effect syntax/type correctness already provided by the official
language service:

- `floatingEffect`
- `missingEffectContext` / `missingLayerContext`
- `leakingRequirements`
- `multipleEffectProvide`
- `runEffectInsideEffect`
- `scopeInLayerEffect`
- `unsafeEffectTypeAssertion`
- ambient global capability diagnostics

The new module owns project-specific placement, module direction, port ownership,
and cross-signal architectural advice.

## Correctness constraints

- Resolve TypeScript symbols and modules; never decide from a local spelling
  alone.
- Treat aliases, namespace imports, named imports, barrel imports, and Effect
  subpath imports equivalently.
- Ignore locally shadowed ambient names.
- Tests and declared composition roots are explicit exceptions.
- Do not classify `Effect`, `Layer`, or `Effect.gen` as imperative by syntax.
- Do not claim mathematical purity: JavaScript getters, proxies, and unknown
  third-party functions are not statically provable.
- Support policy registries for project-specific SDKs instead of pretending a
  finite global list is comprehensive.
- Deduplicate ownership so one construct does not produce several equivalent
  local reports.

## Implementation shape

1. Add `packages/checks/src/checks/functionalCoreEffect/`:
   - policy/data model;
   - shared symbol/module/call recognition;
   - program role index;
   - reported boundary subscriptions;
   - silent architecture evidence;
   - derived advice.
2. Add `packages/checks/src/preset/functionalCoreEffectWiring.ts` with default and
   policy-driven constructors.
3. Add package exports and compose the preset in this repository's
   `better-typescript.config.ts`.
4. Add one comprehensive fixture project containing bad and allowed examples for
   every invariant and every advisory threshold.
5. Add a refactor example tree for the reported check.
6. Add exact regression tests for detection paths, kinds, messages, role
   classification, allowed neighbors, advice evidence, and custom policies.
7. Update user-facing README material after the implementation works.

## Verification bar

After the implementation behaves correctly on the focused fixture:

1. Focused functional-core Effect test.
2. Full project test and typecheck because this adds a public preset and package
   exports.
3. Formatter check.
4. `timeout 10 npm run dev` from the isolated worktree.
5. `npm run bench`; measured report must remain below 100ms.
6. Leave every change uncommitted on branch `functional-core-effect-rules`.
