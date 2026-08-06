# Policy Catalog

This catalog traces every Better TypeScript policy from active wiring through matching, guidance,
tests, examples, and its proposed rule-skill boundary.

## Coverage ledger

| Fleet | Reported rules | Silent evidence | Derived advice | Total |
| --- | ---: | ---: | ---: | ---: |
| Default | 82 | 1 | 8 | 91 |
| Architecture Explore | 0 | 14 | 11 | 25 |
| Effect quality | 26 | 1 | 19 | 46 |
| Functional core | 11 | 1 | 5 | 17 |
| **Total** | **119** | **17** | **43** | **179** |

The 119 reported rules and 43 derived advice outcomes are the 162 independently actionable skill
candidates. The 17 silent policies remain shared evidence producers.

## Directory map

| Directory | Entries | Contents |
| --- | ---: | --- |
| `default/effect-idioms/` | 16 | Effect and Schema idioms |
| `default/comments-declarations/` | 6 | Comment and declaration layout |
| `default/concepts-composition/` | 12 | Concept control and composition |
| `default/control-flow/` | 11 | Control-flow restrictions |
| `default/semantic-naming/` | 10 | Semantic naming contracts |
| `default/error-hygiene/` | 7 | Error and unused-value hygiene |
| `default/expressions-mutation/` | 11 | Expression complexity and mutation |
| `default/dispatch-collections/` | 10 | Dispatch, collections, and function shape |
| `default/derived/` | 8 | Default-fleet aggregate advice |
| `architecture/evidence/` | 14 | Silent architecture facts |
| `architecture/advice/` | 11 | Relational architecture advice |
| `effect-quality/rules/` | 26 | Effect-quality findings |
| `effect-quality/evidence/` | 1 | Multiplexed advice evidence |
| `effect-quality/advice/` | 19 | Effect-quality advice kinds |
| `functional-core/rules/` | 11 | Boundary findings |
| `functional-core/evidence/` | 1 | Multiplexed shape evidence |
| `functional-core/advice/` | 5 | Shape and aggregate advice |

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

An entry describes one independently actionable policy. Multiplexed implementation policies receive
one entry per rule or advice kind. Silent evidence policies receive separate entries when they are
not themselves actionable.

## Coverage

The catalog reconciles all 101 concrete modules in `packages/guidance/src/policies/` against the
active wirings. Multiplexed specialized policies are split by their matcher kind vocabularies, and
every derived advice variant has its own entry. Matcher helpers and runtime infrastructure are
mapped in `project-topology.md` and linked from the entries that depend on them.

The audit verifies 179 entries, all eleven required sections, exact default and architecture wiring
parity, exact Effect-quality and functional-core kind parity, expected derived outcomes, and the
existence of every referenced repository path.
