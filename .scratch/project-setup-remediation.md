# Project setup remediation

Status: Done
Record owner: project owner agent
Last updated: 2026-08-24

Current checkpoint: implementation, local validation, fresh-cache distribution validation, and independent acceptance review are complete.

## Outcome

Make Better TypeScript a clean local Go project whose CLI can be distributed through normal Go tooling. Keep only compiler patches, shims, copied code, and workspace structure that evidence shows are required.

## Scope

- Local project only.
- No CI, branch protection, release automation, Dependabot, CodeQL, or hosted security service.
- The CLI must be distributable. A consumer must not need this repository's local workspace, a mutated submodule, or unpublished commits.
- Add a root MIT license. Keep upstream licenses and notices.
- Apply the other setup-review fixes that remain useful for a local distributable CLI.
- Preserve the current branch, unrelated commits, and unrelated working-tree changes.

## Governing context

- Request: the 2026-08-24 project-setup review follow-up.
- Repository rules: `AGENTS.md`.
- Task rules: `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `.agents/skills/manage-project/references/ai-agent-processes.md`.
- Audit baseline: the prior project-setup review. It found a sound `cmd/`, `internal/`, rule-package, and `testdata/` layout. The main risks were the patched compiler, local shim modules, copied code, untidy module data, thin infrastructure tests, and incomplete setup docs.
- Validation commands for Go changes are the pinned commands in `AGENTS.md`.

This file is a project record, not a production change. Task statuses use the project lifecycle: `Not started`, `Ready`, `In progress`, `Blocked`, `In review`, and `Done`.

## Completion criteria

- [x] A root `LICENSE` grants the MIT license and existing third-party notices remain correct.
- [x] Each compiler patch, shim module, generated shim, and copied collection has a recorded keep/remove decision backed by a build or test.
- [x] The retained compiler dependency is available from a reachable source. No unpublished local fork commit is presented as reproducible.
- [x] A clean consumer can install or build the CLI through normal Go module tooling without `go.work`, a mutated submodule, or `scripts/initialize.sh` patching tracked files.
- [x] `go.mod`, `go.sum`, `go.work`, and every retained nested module are tidy and consistent. Tidy changes are made only after the compiler layout is settled and their diff is reviewed.
- [x] One compiler update workflow updates all retained versions, patches, generated files, copies, module metadata, and validation checks.
- [x] Unused copied capabilities in `internal/linter` and `internal/utils` are removed. Remaining package seams stay coherent and rule-specific helpers stay with their rule.
- [x] Focused tests cover setup and CLI contracts: missing and invalid `tsconfig.json`, stable sort and exact deduplication, UTF-16 positions, slash-normalized relative paths, exact six-field NDJSON, and exit codes.
- [x] Local docs state prerequisites, toolchain policy, distribution/install steps, compiler update steps, and any retained unusual structure.
- [x] A local check runs formatting verification, vet, tests, build, module checks, compiler provenance and NOTICE drift, and `govulncheck` without adding CI.
- [x] `repos/effect` has recorded provenance, license, pinned source revision, purpose, and update method, or is narrowed to the files the project needs.
- [x] A fresh-clone distribution check and all commands required by `AGENTS.md` pass. An independent reviewer accepts the outcome.

## Task graph

Tasks 01, 03, 06, 07, and 09 are independent. Task 01 is the compiler critical path.

`01 -> 02 -> 04 -> 05 -> 08 -> 10`

`03, 06, 07, 09 -> 10`

## Tasks

### 01. Prove the minimum compiler integration

- **Status:** Done
- **Owner:** Project owner agent
- **Active contributors:** `compiler-foundation-investigator`, `shim-consolidation-prototyper`, `dependency-fix-verifier`
- **Dependencies:** None
- **Result:** [`docs/compiler-foundation.md`](../docs/compiler-foundation.md#removal-evidence) records the itemized decisions and the prototype and fresh-module checks behind them.
- **Done when:** Each decision names the dependent code and a focused build or test. The table selects the smallest design compatible with a distributable CLI.
- **Next action:** None.

### 02. Replace the local compiler mutation with a reachable dependency

- **Status:** Done
- **Owner:** Project owner agent
- **Dependencies:** Task 01 decision; a publicly reachable compiler revision if a fork is retained
- **Result:** The CLI uses the minimum proven compiler structure and no unpublished or locally mutated compiler state.
- **Done when:** Normal module resolution can fetch every dependency; retained patches live at a reachable pinned revision or are no longer needed; redundant shims, copies, submodule entries, workspace entries, and bootstrap mutation are removed.
- **Next action:** None.

### 03. Add the MIT license

- **Status:** Done
- **Owner:** `license-provenance-implementer`
- **Dependencies:** None
- **Evidence:** Root `LICENSE`; retained `LICENSES/`; updated `THIRD-PARTY-NOTICES.md`; `git diff --check` passed
- **Result:** Better TypeScript has a root MIT license without replacing upstream license material.
- **Done when:** Root `LICENSE`, `LICENSES/`, and `THIRD-PARTY-NOTICES.md` clearly separate project and third-party grants.
- **Next action:** None.

### 04. Reconcile Go modules

- **Status:** Done
- **Owner:** Project owner agent
- **Dependencies:** Task 02
- **Result:** The single root module matches actual imports and the distribution design.
- **Done when:** `GOWORK=off go mod tidy -diff` is clean; no workspace, nested compiler module, or local replace remains; removed dependencies and stale sums are gone.
- **Next action:** None.

### 05. Create the compiler update workflow

- **Status:** Done
- **Owner:** Project owner agent
- **Dependencies:** Tasks 02 and 04
- **Result:** One local workflow updates the compiler and all derived state without manual version drift.
- **Done when:** The workflow updates the compiler version, tag commit, Microsoft base, retained NOTICE, module sums, and provenance records; runs the full local gate; and fails on drift.
- **Next action:** None.

### 06. Prune copied internal capabilities

- **Status:** Done
- **Owner:** Project owner agent
- **Active contributor:** `internal-pruning-auditor`
- **Dependencies:** None
- **Result:** `internal/linter` and `internal/utils` contain only product-used behavior, with clear package ownership.
- **Done when:** No-caller features are deleted; program loading and compiler-host behavior remain coherent; shared AST/type rule helpers use one narrow home; the two live concurrent maps use the narrow typed `sync.Map` wrapper in `internal/utils/host.go`; changed behavior has narrow tests.
- **Next action:** None.

### 07. Add focused infrastructure and CLI tests

- **Status:** Done
- **Owner:** `contract-test-implementer`
- **Dependencies:** Task 02 migration (complete)
- **Result:** Direct tests protect the documented CLI and analysis contracts, not only representative rules.
- **Done when:** Tests cover every contract named in the completion criteria and pass through the real analysis or CLI boundary where practical.
- **Next action:** None.

### 08. Add the local check and setup documentation

- **Status:** Done
- **Owner:** Project owner agent
- **Dependencies:** Tasks 02, 04, 05, and 07
- **Result:** One documented local command verifies the supported project and distribution setup.
- **Done when:** The command checks formatting without changing files, module tidiness, compiler provenance and NOTICE drift, vet, tests, build, and `govulncheck`; README setup and install instructions match it; Go 1.26 patch-version policy is explicit.
- **Next action:** None.

### 09. Resolve the Effect snapshot setup

- **Status:** Done
- **Owner:** Project owner agent
- **Active contributor:** `license-provenance-implementer`
- **Dependencies:** None
- **Evidence:** `docs/effect-snapshot.md` records the pinned source, read-only rule-research purpose, keep-whole decision, update method, and license. `THIRD-PARTY-NOTICES.md` records the version and revision.
- **Result:** `repos/effect` is either a justified pinned reference snapshot or a smaller retained source set.
- **Done when:** Its upstream revision, provenance, license, purpose, and update method are documented; unnecessary files are removed only when evidence shows they are not used as rule reference material.
- **Next action:** None.

### 10. Validate and review the complete remediation

- **Status:** Done
- **Owner:** Project owner agent
- **Dependencies:** Tasks 02 through 09
- **Review:** `project-acceptance-verifier` returned `PASSED`.
- **Result:** A fresh consumer and an independent reviewer confirm the local distributable CLI setup.
- **Done when:** A clean-clone or clean module-cache test proves the install/build path; all `AGENTS.md` Go commands and the local check pass; each completion criterion has inspectable evidence; an independent reviewer records `Passed`.
- **Next action:** None.

## Completion evidence

- Public compiler module: `github.com/andrueandersoncs/typescript-go v0.1.0`, commit `d124aa8a04310d6c057451daaf8490f4ceec92f2`.
- Better TypeScript has no workspace, submodule, local replace, patch, or shim module.
- `GOWORK=off go mod tidy -diff` is clean.
- `./scripts/check.sh` passes compiler provenance and retained NOTICE drift checks, formatting, tidy, vet, tests, build, and `govulncheck`.
- An isolated module-zip build with fresh Go caches passed.
- Root MIT license, security policy, compiler docs, Effect provenance, and updated skills are present.
- Working changes remain uncommitted.
- `project-acceptance-verifier` returned `PASSED` after a fresh-cache proxy build and the full local gate.

## Current next actions

None. The independent acceptance review passed. The work remains uncommitted.
