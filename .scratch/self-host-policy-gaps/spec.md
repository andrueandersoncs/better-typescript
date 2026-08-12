# Close self-host policy gaps

Status: ready-for-agent

## Problem Statement

Better TypeScript reports no code-policy findings for five avoidable shapes in the Codex OAuth
adapter: an escaped raw object literal, a trivial `Effect.fn` wrapper, an untracked `process.env`
read, an imperative linear Effect pipeline, and an immediately run `Effect.sync` value. Existing
checks either have narrower syntax coverage, require an architecture role that this Physical Module
does not have, or emit silent evidence instead of a blocking finding.

## Source Evidence

The following comments and source are the acceptance inputs for this work. They are not incidental
comments and must remain represented by an equivalent policy requirement.

1. `packages/workflows/src/codexProviderAuth.ts:10-16`

   ```ts
   // EXPLAIN: which rule/checks are missing that should disallow this bare object declaration?
   const result = {
     auth: { apiKey: credentials.tokens.access_token },
     source: "Codex OAuth"
   }

   return result
   ```

2. `packages/workflows/src/codexProviderAuth.ts:22-25`

   ```ts
   // EXPLAIN: which rule/checks are missing that should prevent this function wrapping?
   export const decodeCodexAuth = Effect.fn("CodexAuth.decode")(function* (source: string) {
     return yield* decode(source)
   })
   ```

3. `packages/workflows/src/codexProviderAuth.ts:30-31`

   ```ts
   // EXPLAIN: which rule/checks are missing that should prevent direct use of `process.env` (and prefer Effect Config)?
   const codexHome = process.env.CODEX_HOME ?? defaultHome
   ```

4. `packages/workflows/src/codexProviderAuth.ts:38-45`

   ```ts
   // EXPLAIN: which rule/checks are missing that should have, collectively, resulted in the following implementation rather than this existing one?
   // const resolve = pipe(readCodexAuth(), Effect.map(toCodexAuthResult), Effect.runPromise)
   const resolve = () => {
     const auth = readCodexAuth()
     const result = Effect.map(auth, toCodexAuthResult)

     return Effect.runPromise(result)
   }
   ```

5. `packages/workflows/src/codexProviderAuth.ts:47-62`

   ```ts
   // EXPLAIN: which rule/checks are missing that should have prevented this unnecessary Effect.sync()?
   const setCodexProvider = Effect.sync(() => {
     const provider = openaiCodexProvider()

     setProvider({
       ...provider,
       auth: {
         apiKey: {
           name: "Codex OAuth",
           resolve
         }
       }
     })
   })

   Effect.runSync(setCodexProvider)
   ```

`Effect.sync` remains valid when it is deferred and composed into a larger workflow. Only a locally
bound synchronous Effect that is immediately consumed by `Effect.runSync` is in scope.

## Solution

Extend the default policy fleet to detect each shape at its semantic boundary. Preserve legitimate
foreign-library adapters and legitimate lazy Effects. Each policy emits actionable findings through
the existing CLI report seam, is enabled in every self-hosted package, and leaves the self-host
report empty after the workflow adapter follows the preferred forms.

## User Stories

1. As a Better TypeScript user, I want escaped raw result objects reported, so that a local alias
   cannot bypass the schema-construction policy.
2. As a Better TypeScript user, I want foreign-library result adapters exempt when they cannot be
   project-owned Schemas, so that the rule does not require invented domain models.
3. As a Better TypeScript user, I want trivial `Effect.fn` forwarding wrappers reported, so that
   tracing labels do not justify duplicate APIs with no behavioral work.
4. As a Better TypeScript user, I want meaningful named Effect workflows retained, so that genuine
   tracing and orchestration boundaries remain available.
5. As a Better TypeScript user, I want `process.env` reads reported in unclassified source files, so
   that path conventions cannot disable configuration discipline.
6. As a Better TypeScript user, I want runtime configuration read through Effect Config, so that
   configuration is injectable and deterministic in tests.
7. As a Better TypeScript user, I want straight-line Effect transformations reported when they can
   be one data-last pipeline, so that data flow remains explicit without intermediate aliases.
8. As a Better TypeScript user, I want non-linear workflows left alone, so that branching and reused
   intermediate values are not forced into misleading pipelines.
9. As a Better TypeScript user, I want immediately run suspended Effects reported, so that pointless
   laziness does not hide a direct synchronous action.
10. As a Better TypeScript user, I want independently composed or deferred Effects retained, so that
    `Effect.sync` remains available for real suspension.
11. As a maintainer, I want every new policy enabled during self-hosting, so that policy gaps cannot
    persist in project code.
12. As a maintainer, I want fixture-backed CLI findings for each policy, so that future changes
    prove observable behavior rather than matcher internals.

## Implementation Decisions

- Extend schema-construction analysis from direct object returns to non-empty function-local raw
  object declarations, whether or not the binding is returned, including source evidence item 1.
  Direct contextually typed foreign-adapter returns remain exempt.
- Add a trivial-Effect-wrapper policy for named `Effect.fn` generators that only forward their
  parameters into one Effect and yield its result, including source evidence item 2. It must not
  target service operations or workflows that transform, recover, sequence, or otherwise add
  behavior.
- Broaden process-environment detection to unclassified production source, including source evidence
  item 3. Test-source handling remains separate; configuration tests use a Config provider rather
  than global mutation.
- Generalize function-composition detection from one binding and one return to a linear chain of
  single-use values. Source evidence item 4 must prefer its exact standalone `pipe` form when every
  stage is data-last and the terminal runtime handoff is part of that chain.
- Add local-flow detection for a synchronous Effect binding consumed immediately by
  `Effect.runSync`, including source evidence item 5. Report the unnecessary pair, not `Effect.sync`
  in isolation.
- Refactor the Codex OAuth adapter to satisfy the resulting findings, including the exact `resolve`
  pipeline in source evidence item 4. Preserve runtime behavior.
- Keep module-scope-effect evidence separate from this policy. If direct provider registration needs
  an allowed startup boundary, model that exception explicitly rather than preserving a redundant
  Effect wrapper.
- Register all five policies in the default wiring and all self-hosted package configurations.

## Testing Decisions

- Test the CLI report over focused source fixtures. Assert reported policy identity, location, and
  absence of a finding for the corresponding legitimate boundary.
- Reuse the repository's policy fixture and report-test helpers; do not test matcher implementation
  details or source text.
- Add self-host cases only where the production code demonstrates the preferred form. `bun run dev`
  remains the integration gate for default wiring across all packages.
- Verify the benchmark remains below 100ms after every TypeScript change.

## Out of Scope

- Changing unrelated workflow behavior.
- Replacing every existing object literal, `Effect.fn`, `process.env` read, local binding, or
  `Effect.sync` call project-wide without a finding from the new policy.
- Introducing new architecture roles solely to make configuration checking apply.
- Changing third-party library APIs or inventing Schemas for foreign response contracts.

## Further Notes

The accepted test seam is CLI report output over focused fixtures. Source Evidence preserves the
user's exact comments and code as requirements; the comments themselves need not remain after the
implementation has encoded those requirements in policies and tests.
