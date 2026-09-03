---
name: next-effect-rule
description:
  Find and implement the first Better TypeScript rule missing from Effect AI documentation. Use when
  asked to survey repos/effect/ai-docs, add the next Effect rule, or check Effect rule overlap.
compatibility:
  Requires repository access, Go 1.26 through mise, Bun, and fresh-context subagent review.
---

# Next Effect Rule

Implement at most one uniquely scoped built-in rule from the next uncovered documented Effect
example; unresolved overlap produces a report instead of a rule.

## Inputs

### A. Effect examples

The required source is `repos/effect/ai-docs/src/`. Snapshot regular files once without following
symlink directories. An example's relative POSIX path ends in `.ts`, has no `fixtures` segment, and,
after an optional UTF-8 BOM and whitespace, starts with one JSDoc block containing a line-level
`@title` tag. Sort paths by UTF-8 byte order; never use locale or filesystem order.

### B. Better TypeScript rule catalog

The required comparison set is the current `rules.BuiltinRules` catalog, each rule implementation, its
message, and its tests and fixtures. Names and messages alone are insufficient evidence of coverage.

### C. Repository constraints

`AGENTS.md`, relevant repository skills, current package and test conventions, and vendored Effect
source under `repos/effect/` are authoritative. Preserve unrelated worktree changes.

## Outputs

### A. Built-in rule

When a unique uncovered situation exists, add exactly one built-in Go rule under
`internal/rules/<snake_case_name>/`. Register it in `internal/rules/catalog.go`, add focused
`_test.go` and `testdata/` coverage, and update the public rule docs. Treat `repos/effect/` as
read-only evidence. The rule is complete when
its observable applicability predicate and advice match the source JSDoc without overlapping another
rule's situation.

### B. Overlap report

When source-grounded situations cannot be made disjoint, create one Markdown report at
`.scratch/effect-overlap-reports/<example-slug>.md`. Derive the slug from the full relative path by
dropping `.ts` and replacing each `/` with `--`. Revise an existing report only when it identifies
the same example; stop on a path collision. The report links and quotes the JSDoc, states the
situation, noncompliant pattern, advice, and competing predicates, gives a minimal witness, records
every attempted source-grounded distinction, and includes the earlier-example ledger. This branch
leaves no candidate rule or test changes and replaces Output A for that run.

### C. Completion report

Report the selected example, the JSDoc's unique situation, prior examples classified as covered or
ineligible, the rule or overlap-report path, changed files, and checks. A no-candidate result reports
the complete surveyed range and makes no files.

## Procedure

### 1. Establish the baseline

Read Input C, inspect the worktree, and identify the current rule registration, fixture,
focused-test, and full-catalog-test conventions. Read relevant files in `skills/` and record whether
public skill documentation needs an update. Stop before editing if the Effect examples or rule
catalog is missing, or if an unrelated worktree change makes an output unsafe. This step is complete
when protected changes and exact integration points are known.

### 2. Survey examples in canonical order

Enumerate the Input A snapshot in its defined order. From each complete leading JSDoc derive one
triad: **situation** `S`, **noncompliant observable pattern** `N`, and **advice** `A`. Code below the
block may identify API symbols and shape but cannot add policy absent from the JSDoc. The enforceable
predicate is `P = S ∧ N`; every conjunct must trace to quoted JSDoc or mechanically represent it.

Normative wording can establish `N` without words such as “avoid” or “do not.” When the JSDoc says
to use, prefer, or default to `X` in `S`, an observable alternative in `S` that omits or replaces `X`
can be `N`. Preserve the source's strength: a preference produces preference advice, not a claim
that the alternative is invalid. A capability-only description does not establish `N`, and a desired
outcome is insufficient when no noncompliant code shape is observable.

A file is ineligible when it lacks any triad part or contains independent triads without one common
predicate. Never choose one arbitrary capability from a multi-topic block.

Compare every eligible `P/A` with the frozen catalog's implementations, messages, tests, and
fixtures. For a large survey, delegate contiguous path ranges with the same contract, then normalize
their triad interpretations before merging their ledgers in canonical order. Reject a range ledger
that treats normative wording as ineligible only because explicit negative wording is absent. Resolve
the earliest disagreement before selecting a candidate; no later candidate wins before every earlier
example is resolved. Coverage means catalog behavior collectively detects every documented `P` case
for this concern and gives equivalent `A`; partial coverage is uncovered. Select the first eligible
uncovered example and keep a source-evidenced ledger for all earlier examples. This step is complete
when the first candidate or an exhaustive no-candidate result is established under one consistent
triad interpretation.

### 3. Prove the candidate has one unique situation

Compare the candidate with every example and every built-in rule. Start with the JSDoc wording, then
inspect related examples and authoritative Effect implementation or documentation under
`repos/effect/` when a boundary is unclear. Convert each relevant difference into an observable
predicate conjunct. The final candidate predicate must identify the unique documented situation;
do not narrow it using names, paths, or invented intent that the source does not support.

Genuine overlap requires a minimal program that satisfies both predicates at the same semantic
decision or target, duplicate or competing advice for that concern, and no source-supported
predicate that assigns disjoint ownership. Shared AST location alone is insufficient, and compatible
rules for independent concerns may co-report. Exact existing coverage means misclassification:
correct the ledger and resume Step 2 after that example.

Have a fresh-context reviewer challenge the proposed boundaries against the JSDoc and full
catalog. If a witness remains between any two rules in the candidate's concern after every
source-supported distinction, write Output B and stop without adding or changing a rule. Otherwise,
record the disjoint predicate boundaries and continue. This step is complete when both analyses
support uniqueness or a genuine-overlap report exists.

### 4. Specify tests before implementation

Add focused tests for the proposed rule using current repository helpers. Include:

- one minimal `P` violation and one compliant use inside `S`;
- one noncompliant-looking use outside `S`;
- one minimal pair per predicate conjunct, changing only that condition where practical;
- Effect import aliases and unrelated lookalikes when symbol identity matters;
- both directions for every nearby competing rule; and
- a pairwise matrix for the candidate and every possibly intersecting rule, asserting exact rule-name
  sets and the candidate's exact target and message.

Record the expected matrix before implementation. Run a behavioral red phase only when a compilable
scaffold makes it useful; a missing import or compile error is not proof. If a witness exposes
unresolvable source-grounded overlap, take Step 3's report branch. This step is complete when the
fixtures and expectations mechanically define detection, boundaries, and non-overlap.

### 5. Implement one rule

Implement the smallest Go rule that satisfies the tests. Resolve Effect APIs through the pinned
public `typescript-go` AST and checker adapters; avoid text-only API detection when aliases or
unrelated lookalikes would create overlap. Preserve one listener registration and one AST traversal
per file. Reuse a helper only when it preserves a single clear ownership boundary. Register the rule
exactly once in the sorted `internal/rules/catalog.go`, update `docs/rules.md` and
`docs/rules/<rule-name>.md`, and update `skills/` only when Step 1 found affected public guidance.
This step is complete when the focused rule and overlap tests pass without weakening another rule.

### 6. Validate the repository

For rule changes, run the focused Go package test and `./scripts/check.sh`. Fix every failure and
rerun affected checks. For an overlap-report-only run, code gates are not required unless the current
repository instructions say otherwise. If validation cannot be repaired, report the failure without
claiming completion; never substitute an overlap report for an implementation failure. This step is
complete when all required checks pass.

### 7. Recheck scope and report

Inspect the final diff. Confirm that exactly one rule was added or exactly one overlap report was
written, every earlier example has a defensible ledger entry, the final tests prove the documented
unique context and nearby-rule separation, `skills/` was checked, unrelated changes remain intact,
and semantic complexity did not increase beyond what the detector requires. Publish Output C. The
workflow is complete only when these checks and the selected output branch agree.

## Callstack Simulation

**Next Effect Rule**(Effect example snapshot, frozen built-in catalog, repository constraints)
│
├─ **Establish The Baseline**(repository constraints, worktree, integration conventions)
│ │
│ ├─ **Inspect Worktree And Conventions**(registration, fixtures, focused tests, full-catalog tests, relevant skills)
│ │
│ ├─ **Check Required Inputs And Output Safety**(Effect examples, rule catalog, unrelated changes)
│ │ │
│ │ ├─ if (an input is missing or an unrelated change makes output unsafe): stop before editing
│ │ │
│ │ └─ else: record protected changes, integration points, and public skill impact
│ │
│ └─ **Freeze Catalog Comparison Set**(implementations, messages, tests, fixtures)
│
├─ **Survey Examples In Canonical Order**(single ordered file snapshot, frozen catalog)
│ │
│ ├─ **Snapshot And Sort Example Paths**(regular qualifying TypeScript files, UTF-8 byte order)
│ │
│ ├─ **Survey Canonical Ranges**(ordered paths, common triad and coverage contract)
│ │ │
│ │ ├─ if (the survey is large):
│ │ │ │
│ │ │ └─ **Delegate Contiguous Range Survey**(each contiguous path range, same contract)
│ │ │   │
│ │ │   ├─ **Derive JSDoc Triad**(normative wording, situation S, observable N, advice A)
│ │ │   │
│ │ │   ├─ **Classify Eligibility**(complete source-grounded triad with one common predicate P = S ∧ N)
│ │ │   │
│ │ │   ├─ **Compare Eligible Predicate And Advice**(every frozen catalog implementation, message, test, fixture)
│ │ │   │
│ │ │   └─ **Record Range Ledger**(source evidence, covered or ineligible reason, uncovered candidates)
│ │ │
│ │ └─ else: apply the same contract to the single canonical range
│ │
│ ├─ **Merge Range Ledgers**(delegated ledgers in canonical order)
│ │
│ └─ **Select First Eligible Uncovered Example**(collective full-P coverage and equivalent advice)
│   │
│   ├─ if (all examples are covered or ineligible): publish the exhaustive no-candidate completion report with no files
│   │
│   └─ else: retain the selected candidate and every earlier source-evidenced ledger entry
│
├─ **Prove The Candidate Has One Unique Situation**(selected candidate, every example, every built-in rule)
│ │
│ ├─ **Derive Observable Predicate Boundaries**(JSDoc wording, related examples, authoritative read-only Effect evidence when unclear)
│ │
│ ├─ **Test Genuine Overlap Conditions**(same semantic decision or target, duplicate or competing advice, no disjoint source predicate, shared AST location insufficient, independent concerns may co-report)
│ │
│ ├─ **Fresh Context Overlap Review**(proposed boundaries, candidate JSDoc, full catalog)
│ │ │
│ │ └─ **Challenge Predicate Ownership**(exact coverage, minimal witnesses, independent concerns, source-supported distinctions)
│ │
│ └─ **Resolve Candidate Analysis**(primary analysis, fresh-context review)
│   │
│   ├─ if (exact existing coverage is found): correct the ledger and resume the survey after that example
│   │
│   ├─ else if (a genuine witness remains):
│   │ │
│   │ ├─ **Remove Candidate Rule And Test Changes**(candidate-only changes, preserved unrelated changes)
│   │ │
│   │ └─ **Write Overlap Report**(collision-safe example path, quoted JSDoc, S, N, A, competing predicates, witness, attempted distinctions, earlier ledger)
│   │
│   └─ else: record the disjoint predicate boundaries and continue to tests
│
├─ **Specify Tests Before Implementation**(unique candidate predicate, advice, nearby rules)
│ │
│ ├─ **Record Focused Fixtures And Expectations**(P violation, compliant use in S, lookalike outside S, conjunct pairs, symbol identity, competing-rule directions)
│ │
│ ├─ **Record Pairwise Rule Matrix**(exact rule-name sets, candidate target, candidate message)
│ │
│ ├─ **Run Optional Behavioral Red Phase**(compilable scaffold usefulness, focused test result)
│ │ │
│ │ ├─ if (a useful scaffold exists): require behavioral failure rather than an import or compile error
│ │ │
│ │ └─ else: continue from mechanically complete fixtures and expectations without claiming red
│ │
│ └─ **Resolve Test Evidence**(fixtures, expectations, overlap witness)
│   │
│   ├─ if (a witness reveals unresolvable source-grounded overlap): remove candidate rule and test changes, then take Step 3's overlap-report branch
│   │
│   └─ else: continue to implementation
│
├─ **Implement One Rule**(mechanically defined detection, boundaries, non-overlap)
│ │
│ ├─ **Implement Smallest Symbol And Type Aware Go Rule**(candidate predicate and advice, read-only Effect evidence)
│ │
│ ├─ **Register And Document Rule**(sorted built-in catalog, catalog assertions, public rule docs)
│ │
│ ├─ **Update Public Skill Guidance**(recorded Step 1 impact)
│ │ │
│ │ └─ if (no public guidance is affected): make no skill update
│ │
│ └─ **Run Focused Rule And Overlap Tests**(implementation result)
│
├─ **Validate The Repository**(selected output branch, validation results)
│ │
│ ├─ if (a rule changed): run the focused Go package test and `./scripts/check.sh`
│ │
│ ├─ else if (only an overlap report changed): require no format or code gates
│ │
│ ├─ **Repair Validation Failures**(focused or full-check failures)
│ │ │
│ │ ├─ if (repair succeeds): rerun every affected check
│ │ │
│ │ └─ else: report failure without completion and never substitute an overlap report
│ │
│ └─ **Record Validation Results**(focused test and full repository check)
│
└─ **Recheck Scope And Report**(final diff, earlier-example ledger, selected output)
  │
  ├─ **Confirm Final Invariants**(one rule or one overlap report, boundary proof, nearby-rule separation, skills checked, unrelated changes intact, bounded semantic complexity)
  │
  └─ **Publish Completion Report**(selected example, unique situation, prior classifications, output path, changed files, checks)
