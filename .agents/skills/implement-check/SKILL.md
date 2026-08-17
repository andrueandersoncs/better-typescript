---
name: implement-check
description:
  Implements what users call a Better TypeScript check using the current Matcher, Guidance, and
  Policy model. Use when adding a built-in or consumer-owned policy, matcher, local finding, or
  aggregate advice.
---

# Implement a Better TypeScript Policy

`$ARGUMENTS` is the user's request.

Implement the request completely and verify the repository you change.

## Use the current model

“Check” is common request vocabulary, not the current authoring concept:

- A `Matcher<Fact>` recognizes source patterns and emits factual `Match<Fact>` values. It owns no
  user-facing prose.
- `Guidance<Fact>` maps a match to local `FindingSource` values.
- A `Policy` binds stable identity, matcher, guidance, visibility, and refactor examples.
- `Wiring` contains `policies` and a `derive` function. `derive` may turn completed `Signal` values
  into aggregate `Advice`.

Use `Matcher`, `Match`, `Guidance`, `Policy`/`WorkspacePolicy`, and `FindingSource` in
implementation prose. Serialized `_tag: "rule"` and `_tag: "advice"` values are output compatibility
vocabulary only.

Before editing, read `CONTEXT.md`, relevant accepted ADRs—especially ADR-0024—and the nearest
current implementation. Current source wins if this skill and the repository disagree.

## Choose the path and shape

- **Built-in:** change this monorepo's `matchers`, `guidance`, fixtures, examples, preset, and
  self-host wiring as needed.
- **Consumer-owned:** change only the consumer project and compose public package APIs in its
  `better-typescript.config.ts`.

Also decide:

- program-stage node/file matcher or post-collection directory/workspace matcher;
- reported local findings or silent evidence used by `derive`; and
- new matcher or new guidance over an existing reusable matcher.

Choose the narrowest shape that expresses the requirement.

## Built-in path

1. **Choose identity.** Pick one stable kebab-case Policy name and camelCase export name. Search
   matchers, guidance, examples, fixtures, tests, presets, derivations, and self-host wiring for
   collisions.

2. **Study neighboring code.** Read the closest matcher, its catalog, owning guidance/preset module,
   fixture, test, and examples. Reuse an existing Matcher when it already recognizes the needed
   fact.

3. **Implement recognition in `packages/matchers`.**
   - Put built-in recognition under `packages/matchers/src/builtins/`.
   - Emit typed factual `Match<Fact>` values with the correct target; do not emit messages, hints,
     Detections, or Advice.
   - Use the narrowest existing constructor, such as `nodeMatcher`, `fileMatcher`,
     `makeDirectoryMatcher`, or `WorkspaceMatcher`.
   - Keep TypeScript traversal, type-checker access, indexes, and compiler requirements in the
     matcher layer. Preserve fused traversal and bounded-workspace behavior.
   - Export it through the owning matcher catalog when that fleet consumes catalogs.

4. **Implement guidance and the Policy in `packages/guidance`.**
   - For simple fixed prose, use `factGuidance`; otherwise write a typed `Guidance<Fact>` and create
     findings with `makeFindings`.
   - Use `makeBuiltinPolicy` or `makeBuiltinWorkspacePolicy` for reported behavior.
   - Use the silent variant only for evidence that should not render a local block.
   - Put the Policy beside its owning fleet. Default policies are currently assembled in
     `packages/guidance/src/preset/defaultWiring.ts`; architecture fleets use their own preset
     modules.
   - Export one ready-to-wire Policy. Do not rebind its name, matcher, visibility, or examples in a
     preset.

5. **Add refactor examples.** Add at least one numbered pair under
   `packages/guidance/examples/<policy-name>/<pair>/{bad,good}/`. Each side is a source tree and may
   contain multiple files or a `tsconfig.json`. Bad must detect; good must be clean.

6. **Add characterization coverage.** Create `tests/fixtures/<policy-name>/tsconfig.json` and source
   files. Mark each expected location with `// ~detect`, `// ~detect 3`, or
   `// ~detect 3,17`. Unmarked lines must stay clean. Use
   `assertPolicyFixtureExpectations` only when a marker would alter the matched input or cannot
   express the contract.

7. **Test through the exported Policy.** For a program Policy, add
   `tests/<camelCaseName>.test.ts` and normally call `assertPolicyFixture(policy)`. For a workspace
   Policy, follow the nearest workspace-policy runner and assertion pattern. Add focused matcher or
   guidance tests when facts, context, grouping, prose selection, or data payloads need a stronger
   contract.

8. **Enroll the Policy directly.** Add it to the intended policy catalog/wiring in stable report
   order. A default policy belongs in `defaultPolicyCatalog`. Inspect the self-host configuration
   explicitly: default filtering may omit silent policies or derivation. Wire every new Policy and
   Advice path across all package sources rather than assuming preset membership is enough. Use
   `signalOf(signals)(policyName)` only in `derive`; policies and matchers never consume Signals.

9. **Keep architecture closed.** Do not add registries, generated barrels, plugin discovery,
   severities, suppressions, per-Policy options, compatibility aliases, alternate config shapes,
   test-only production exports, or Policy-to-Policy Signal access outside `derive`.

## Consumer-owned path

1. Work only in the consumer project. Never edit dependencies or import package `src/` or
   `internal/` paths.
2. Build or reuse a public Matcher from `@better-typescript/matchers/*` subpaths. Create a Policy
   with `makePolicy`, `makeSilentPolicy`, `makeWorkspacePolicy`, or `makeSilentWorkspacePolicy` from
   `@better-typescript/core/engine/policy/*`.
3. Keep recognition factual. Create local findings with `makeFindings`; put Signal fan-in and
   aggregate Advice only in `derive`.
4. Put Policies in `makeWiring({ policies, derive })`. Extend a fleet with
   `makeMergedWiring([defaultWiring, localWiring])`; do not rename imported Policies.
5. Export `defineConfig([{ files, wiring }])`, not a bare Wiring. Globs are workspace-relative.
   Duplicate Policy names across the complete config are errors.
6. Use inert inline refactor examples when the Policy is reported. Follow the runnable current
   example at `examples/extend-preset/better-typescript.config.ts` rather than inventing a second
   config shape.
7. Add focused consumer tests and run the consumer's configured Better TypeScript command.

## Verification

For TypeScript changes in this repository, finish with all of these passing:

1. `bun run format`
2. the targeted Policy test
3. `bun test tests/refactorExamples.test.ts`
4. `bun run typecheck`
5. `bun run test`
6. `bun run bench` with the measured report below 100 ms
7. `bun run dev` with no Detections or Advice

Fix every failure and Advice block, then rerun affected checks. Report the Policy name, matcher
shape, wiring changed, tests run, benchmark measurement, and empty self-host result.
