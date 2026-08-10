# Policy Catalog

This catalog traces every Better TypeScript policy from active wiring through matching, guidance,
tests, examples, and its proposed rule-skill boundary.

## Coverage ledger

| Fleet | Reported rules | Silent evidence | Derived advice | Total |
| --- | ---: | ---: | ---: | ---: |
| Default | 90 | 1 | 9 | 100 |
| Architecture Explore | 0 | 15 | 13 | 28 |
| Effect Quality | 26 | 1 | 19 | 46 |
| Functional Core Effect | 11 | 1 | 5 | 17 |
| **Total** | **127** | **18** | **46** | **191** |

The 127 reported rules and 46 derived advice outcomes are the 173 independently actionable skill
candidates. The 18 silent policies remain shared evidence producers.

## Directory map

| Directory | Entries | Contents |
| --- | ---: | --- |
| `default/rules/effect-idioms/` | 16 | Effect and Schema idioms |
| `default/rules/comments-and-declarations/` | 6 | Comment and declaration layout |
| `default/rules/abstraction-and-composition/` | 11 | Abstraction and composition simplification |
| `default/rules/concept-control/` | 9 | Concept-model quality variants |
| `default/rules/control-flow/` | 11 | Control-flow restrictions |
| `default/rules/semantic-naming/` | 10 | Semantic naming contracts |
| `default/rules/error-hygiene/` | 7 | Error and unused-value hygiene |
| `default/rules/expressions-and-mutation/` | 11 | Expression complexity and mutation |
| `default/rules/dispatch-and-collections/` | 9 | Dispatch and collection choices |
| `default/evidence/` | 1 | Silent pipeline-shape evidence |
| `default/advice/` | 9 | Default-fleet aggregate advice |
| `architecture-explore/evidence/` | 15 | Silent architecture facts |
| `architecture-explore/advice/` | 13 | Relational architecture advice |
| `effect-quality/rules/` | 26 | Effect-quality findings |
| `effect-quality/evidence/` | 1 | Multiplexed advice evidence |
| `effect-quality/advice/` | 19 | Effect-quality advice kinds |
| `functional-core-effect/rules/` | 11 | Boundary findings |
| `functional-core-effect/evidence/` | 1 | Multiplexed shape evidence |
| `functional-core-effect/advice/` | 5 | Shape and aggregate advice |

See `project-topology.md` for the runtime path, package boundaries, source surfaces, and
self-hosting scope.

## Entry contract

Each policy entry records:

- classification and active wiring;
- implementation sources;
- intent and exact detection boundary;
- exemptions and important non-findings;
- emitted guidance or derived remediation;
- upstream evidence and downstream advice dependencies;
- tests, fixtures, and refactor examples;
- proposed skill boundary, runner phase, scope, and deterministic support; and
- unresolved semantic questions.

An entry describes one actionable rule or advice variant, or one silent evidence producer.
Multiplexed implementation policies receive one entry per rule or advice kind.

## Naming contract

- Top-level directories use the canonical wiring or fleet name.
- The next directory is always the lifecycle: `rules`, `evidence`, or `advice`.
- Large rule fleets may add one thematic category below `rules`; evidence and advice stay flat.
- Non-multiplexed policy files use the exact runtime policy name.
- Multiplexed rule and advice files use the exact payload kind.
- Non-multiplexed advice files use the slugified runtime `Advice.title`.

## Coverage

The catalog reconciles all 101 concrete modules in `packages/guidance/src/policies/` against the
active wirings. Multiplexed policies are split by their matcher kind vocabularies, and
every derived advice variant has its own entry. Matcher helpers and runtime infrastructure are
mapped in `project-topology.md` and referenced by the entries that depend on them.

The audit verifies 191 entries, all eleven required sections, exact default and architecture wiring
parity, exact Effect Quality and Functional Core Effect kind parity, expected derived outcomes, and
the existence of every referenced repository path.
