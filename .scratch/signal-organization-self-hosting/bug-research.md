# Bug research: self-host misses `signal` organization defects

Status: resolved

## Symptom

`packages/core/src/engine/signal/` is reported clean even though:

- `data.ts` is too generic to identify its `Signal` content.
- `detectionEquals.ts` contains three subject-specific entity families:
  - `Detection`: `detectionEquals`, `detectionsEquivalence`
  - `Signal`: `signalEquals`, `signalArrayEquivalence`
  - `WiringSignals`: `wiringSignalsEquals`, `wiringSignalsArrayEquivalence`

No source code was changed during this research.

## Reproduction

Full self-host:

```text
$ bun run dev
Analyzing /Users/andrueanderson/Workspace/better-typescript.
No signals in /Users/andrueanderson/Workspace/better-typescript.
```

Tight partition assertion, executed with `bun -e "$SCRIPT"` where `SCRIPT` was:

```js
import assert from "node:assert/strict"
import { fixtureSnapshotAt } from "./tests/semanticModulesFixtureSnapshotAt.ts"
import { architectureExploreNeutralHardBondRuleCatalog } from "./packages/guidance/src/architectureExplore/architectureExploreNeutralHardBondRuleCatalog.ts"

const snapshot = await fixtureSnapshotAt(
  "packages/core/tsconfig.json",
  false,
  () => true,
  architectureExploreNeutralHardBondRuleCatalog
)
const wanted = new Set(["detectionEquals", "signalEquals", "wiringSignalsEquals"])
const names = new Map(
  snapshot.entities.map((entity) => [JSON.stringify(entity.key), entity.displayName])
)
const groups = snapshot.modules
  .map((module) =>
    module.members
      .map((member) => names.get(JSON.stringify(member)))
      .filter((name) => name !== undefined && wanted.has(name))
  )
  .filter((group) => group.length > 0)

assert.deepEqual(groups, [["detectionEquals"], ["signalEquals"], ["wiringSignalsEquals"]])
```

Observed:

```text
actual:   [["detectionEquals", "signalEquals", "wiringSignalsEquals"]]
expected: [["detectionEquals"], ["signalEquals"], ["wiringSignalsEquals"]]
AssertionError (code: ERR_ASSERTION)
```

The assertion is deterministic and completes in about 1.4 seconds.

## Configuration ruled out

The placement policy is enabled:

- `better-typescript.config.ts:8-10` applies Architecture Explore Wiring to
  `selfHostArchitectureFiles`.
- `selfHostFiles.ts:4-10` includes every `packages/*/src/**` file.
- `architectureExploreWiring.ts:5-8` builds the active wiring from all catalog inputs.
- `architectureExploreCatalogInputs.ts:6-9` includes neutral, OOP, and FP catalogs.

This is not an omitted self-host scope or disabled-policy bug.

## Actual inferred partition

The active snapshot produces four Semantic Modules for the folder:

```text
[Signal]
[detectionEquals, detectionsEquivalence, signalEquals, signalArrayEquivalence,
 wiringSignalsEquals, wiringSignalsArrayEquivalence]
[signalOf]
[WiringSignals]
```

`detectionEquals.ts` therefore represents one Semantic Module, not three.

Its five accepted bonds are all `exclusive-consumer-ownership`:

```text
detectionEquals                  — detectionsEquivalence
detectionsEquivalence            — signalEquals
signalEquals                     — signalArrayEquivalence
signalArrayEquivalence           — wiringSignalsEquals
wiringSignalsEquals              — wiringSignalsArrayEquivalence
```

Controlled experiment:

```json
{ "neutral": 1, "withoutNeutralRules": 6 }
```

The values are the Semantic Module counts represented in `detectionEquals.ts`. Removing the neutral
catalog changes the count from one to six. The accepted-bond evidence identifies
`exclusive-consumer-ownership`, not cycle inference, as the cause.

## Root cause

### 1. Exclusive ownership merges across domain subjects

`exclusiveConsumerOwnershipHardBondRule.ts:163-169` bonds a target component whenever it has one
incoming consumer component and no unowned consumer. The accepted ownership chain then closes
transitively.

This exactly follows the current decision in
`.scratch/semantic-module-inference/issues/18-define-initial-hard-bond-catalog.md:31-39`: a private
dependency chain is one Semantic Module.

For this case, that law is too strong. Array-equivalence derivation forms one private implementation
chain, but the chain crosses three independently meaningful data subjects. Exclusive use proves
implementation privacy; it does not prove that `Detection`, `Signal`, and `WiringSignals` behavior
are one conceptual definition.

The resulting false-positive Hard Bonds cause a false-negative placement result.
`semanticModuleEngine.ts:1313-1321` emits mixed-Physical-Module evidence only when a file represents
at least two inferred Semantic Modules.

### 2. The model has no subject-ownership relation

Type references from the equality functions to `Detection`, `Signal`, and `WiringSignals` are
dependency evidence. No current Hard Bond identifies the data type an operation semantically belongs
to. Consequently, inference cannot preserve the three basic/derived entity families before applying
transitive ownership closure.

### 3. Filename and directory semantics are intentionally absent

The current system cannot report `data.ts` as too generic:

- `CONTEXT.md:30-36` says Semantic Reference Graph names and paths do not affect membership.
- `.scratch/semantic-module-inference/spec.md:279-285` puts filename and destination choice, plus
  name/path heuristics, out of scope.
- `.scratch/semantic-module-inference/issues/09-define-paradigm-hard-bonds.md:23-27` forbids textual
  names and paths as rule predicates.
- ADR-0020 (`adrs/0020-files-are-module-boundaries.md:34-40`) says no check may treat a directory as
  an interface or force directory placement.

The requested `signal/` directory constraint conflicts with accepted ADR-0020. The absence of this
finding is current design behavior, not a matcher implementation defect.

## Regression gap

Current tests affirm the behavior that hides this defect:

- `tests/semanticModules.test.ts:285-326` expects an exclusive private chain to become one Semantic
  Module.
- `tests/semanticModules.test.ts:657-689` expects that bond to disappear only when a second consumer
  appears.
- `.scratch/semantic-module-inference/spec.md:262-264` requires membership to remain equivalent
  across display renames and declaration relocation.

There is no fixture where a private derivation chain crosses multiple data subjects and must remain
partitioned.

## Required design decisions before a fix

1. Decide whether directories constrain semantic ownership. If yes, supersede ADR-0020 and the
   current name/path exclusions explicitly; a matcher patch alone would violate accepted
   architecture.
2. Define a TypeChecker-resolved law for a behavior's semantic subject, including derived helpers
   such as array equivalences. The law must distinguish subject ownership from ordinary dependency.
3. Re-specify `exclusive-consumer-ownership` so implementation privacy cannot erase independently
   proven subject boundaries. Its current status as an unconditional Hard Bond is the immediate
   cause of the mixed-file false negative.
4. Add this exact three-family equality chain as a regression fixture, then require the self-hosted
   Architecture Explore report to flag the resulting organization defects.

## Conclusion

Self-hosting is running the intended policy. It stays clean because the policy model both omits
filename/directory constraints and positively classifies all six equality entities as one Semantic
Module. The bug is in the architecture rules and their specification, not self-host wiring.

## Resolution

Status: fixed.

1. `semantic-subject-ownership` joined the neutral catalog. An operation whose parameter list is
   entirely one first-party data declaration and whose result is a boolean verdict belongs to that
   subject; a value helper whose initializer calls exactly one subject-owned operation inherits the
   same subject. The verdict requirement is what separates subject ownership from ordinary
   dependency: evidence constructors and pair-order helpers that merely take two keys stay put.
2. `exclusive-consumer-ownership` evidence is version 2 and now carries both resolved subject sets.
   The bond is withheld when consumer and target both have subjects and share none, so
   implementation privacy can no longer erase a proven boundary.
3. `tests/fixtures/semantic-modules-subjects/` reproduces the three-family equality chain; the
   fixture asserts six accepted subject bonds and the absence of cross-subject ownership.
4. The signal folder was remediated by relocating complete Semantic Modules: `detectionEquals` and
   `detectionsEquivalence` moved to `packages/core/src/engine/location/detectionData.ts`,
   `signalEquals` and `signalArrayEquivalence` to `packages/core/src/engine/signal/data.ts`,
   `wiringSignalsEquals` and `wiringSignalsArrayEquivalence` to
   `packages/core/src/engine/signal/wiringSignals.ts`. `signal/detectionEquals.ts` and its package
   export entry are gone.
5. Self-hosting runs the placement Policy again through `selfHostPlacementWiring.ts` and reports no
   findings; the warmed benchmark stays under the 100ms gate.
