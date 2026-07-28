---
description: Synthesize a measurement protocol and optimization playbook for a measurable property
argument-hint: <measurable property, metric, or @document>
---

Synthesize a comprehensive, coherent measurement protocol and optimization playbook for the
following measurable TypeScript project property into a markdown document in @docs/. The document
must let a maintainer (1) measure the property deterministically and reproducibly and (2) improve
it through falsifiable interventions whose effect the measurement confirms:

$ARGUMENTS

This is a design command. Output your response to a markdown document. Do not modify existing
source, configuration, or documentation unless the maintainer explicitly requests it. Do not read
any existing documentation. Your output needs to be from **first principles**, reading existing
documentation would pollute your context window.

## Objective

- Turn the stated property into a **metric**: a deterministic function from observable project
  artifacts — and, when the property is dynamic, from controlled executions — to a value in defined
  units, together with the protocol required to reproduce that value.
- Turn improvement of the property into an **optimization playbook**: an enumeration of every
  mechanism by which the property degrades, and for each mechanism the smallest intervention that
  improves it, with a predicted, measurable effect.
- A **measurement** is valid only when its inputs, environment controls, procedure, units, and
  aggregation are stated precisely enough that two independent runs over the same inputs produce
  the same value, or values whose difference is bounded by a stated noise floor.
- An **optimization lever** is falsifiable: it states an applicability condition decidable from
  measurement output, a concrete transformation, a predicted effect direction on the metric, and a
  confirmation procedure. It is not an aesthetic preference, a restatement of the goal, or an
  unqualified example.
- Some measurements will require thinking 'outside the box' — compiler-API programs, generated
  harnesses, runtime instrumentation, trace capture, build introspection — and that's okay!
- Don't be scared to consider and suggest extreme or unusual mechanisms; the goal is deterministic
  measurement by any means necessary.
- Do **not** omit a dimension of the property just because measuring it would be hard (or
  impossible with existing tooling!): propose the tooling or instrumentation instead.
- Before the formal glossary, write an informal top-level definition of the requested property that
  gives a technically literate reader an orienting mental model: what varies when the property
  improves or degrades, what the property excludes, in what units it is naturally expressed, and
  how the later measurement and levers collectively operationalize it.
- This explanation guides the document but MUST NOT replace the deterministic metric definition,
  measurement protocol, or falsifiable levers.

## Method

1. **Reason from first principles.** Identify what physically or structurally determines the stated
   property's value. Derive the metric and levers directly from those determinants rather than from
   existing repository practice or documents.

- Before deriving terms, metrics, or levers, inventory every technology explicitly named by the
  request.
- For each technology, inspect its current idioms and enumerate every facility, type-system
  feature, configuration surface, lifecycle, boundary, and composition mechanism that can move the
  property's value in either direction.
- This inventory is an internal coverage obligation, not a preface or an output-section limit:
  derive a measurement dimension for every observable contributor to the property and a lever for
  every observable degradation mechanism, however many entries that requires.

2. **Define, demonstrate, and predicate necessary terms.**

- Before drafting the measurement or levers, inventory every technical term, category,
  classification, action, state, boundary, quantity, and relationship that the planned normative
  statements rely on.
- A term is necessary when omitting its definition would leave a reader unable to determine what a
  measurement includes, what a lever applies to, or whether a confirmation succeeded; this includes
  precisely-qualified verbs and states such as "allocate," "evaluate," "resolve," "retain," or
  "reachable," and every unit or aggregation word such as "cold," "steady-state," "per-module," or
  "amortized."
- Define every necessary term clearly and precisely in `## Definitions`; there is no numerical
  limit.
- Use one `### <Term>` entry per term so it has a stable Markdown anchor.
- Order entries so an entry appears before any prose use of that term in a later entry, measurement
  section, or lever.
- A definition MUST use only already-defined terms or ordinary language, and MUST identify
  observable boundaries rather than rely on identifier names, directory names, or presumed intent.
- A definition MUST state the observable inputs and deterministic membership or valuation criterion
  needed to decide whether a concrete artifact, execution, or relationship satisfies it. When a
  definition narrows another term with a qualifier such as "hot," "public," "production," or
  "cross-boundary," define that qualifier as a separate term or express its criterion directly
  through a declared field, value, or resolution procedure; never leave a qualifier implicit.
- A semantic classification, including a module role, MUST be inferred exclusively from the
  classified module's source AST, compiler-resolved symbols and types, and resolved dependency
  graph.
- It MUST NOT use a path, directory, basename, file extension, package layout, declaration or
  export name, user mapping, or presumed intent.
- A physical-file rule MAY use path or filename criteria, but MUST remain independent of the
  semantic classification.
- When a later measurement or lever references a module role, its implementation MUST apply this
  content-derived predicate. It MUST NOT rederive the role from a physical-file convention.
- When a definition has one or more close synonyms, near-synonyms, or easily-confused neighboring
  concepts — for a metric this especially includes neighboring quantities, such as latency versus
  throughput, size versus count, or wall time versus CPU time — add a `#### Related terms`
  comparison table immediately after its prose definition and before its mechanical predicate.
- Use the columns `Term`, `Relation`, `Deciding distinction`, and
  `Why it is not interchangeable here`.
- Include each materially plausible alternative, identify the observable distinction, and explain
  why the defined term — not the alternative — is required where a later measurement or lever
  relies on it.
- Do not invent distinctions where no plausible related concept exists.
- Immediately after that table, give a complete, independently type-checkable comparison example
  set.
- Use adjacent comments to identify the defined term and every related term, and make the differing
  observable behavior, type, dependency, lifecycle, quantity, or boundary explicit.
- Every definition MUST immediately state a `**Mechanical predicate:**` with its required inputs,
  deterministic procedure, and Boolean membership result — or, for a quantity, its deterministic
  valuation result in stated units — for a concrete artifact, execution, or relationship. This
  predicate is the classifier or evaluator that the measurement protocol and every lever's
  applicability test reuse; it MUST decide the definition without human judgment.
- Immediately follow each `**Mechanical predicate:**` with a `**Predicate implementation:**`
  TypeScript snippet that implements its essential inputs, traversal or resolution, classification
  or valuation, and result. The snippet MUST be complete, coherent, and independently
  type-checkable against its stated imports; do not use pseudocode.
- Every classification used by a definition, measurement, or lever MUST be inferred
  deterministically from the artifact it classifies: source text or AST, compiler-resolved symbols
  or types, the resolved module graph, filename or directory conventions, existing project
  configuration that defines compiler or build inputs, or the recorded output of the document's own
  measurement procedure.
- A classification MUST NOT depend on maintainer-declared intent or a user-maintained mapping.
- MUST NOT invent or require a manifest, registry, allowlist, or other configuration that assigns
  roles, kinds, categories, weights, or permissions to individual source modules, exports,
  dependencies, globals, or other project artifacts. When a proposed category cannot be inferred
  deterministically, reformulate the measurement or lever around observable implementation
  behavior; inability to classify is not grounds to introduce a manual mapping.
- In all prose after an entry's heading — including later definitions, the measurement sections,
  and every lever subsection — render each use of that defined term as an inline Markdown link to
  its definition.
- Do not link definition headings or code examples.
- Every TypeScript example MUST be specific, complete, coherent, and independently type-checkable
  against its stated imports. Declare or import every referenced identifier; make names, types, and
  behavior agree; and do not use a symbol to imply behavior the snippet does not perform.
- Every example MUST use source comments to identify the exact declarations, expressions, values,
  or relationships that exemplify the definition. Put each comment immediately adjacent to what it
  identifies; do not make the reader infer the mapping from surrounding code. When a definition
  enumerates items, each comment MUST name the exact enumerated item it demonstrates.
- Every enumerated item in a definition — including every item in an "or" or "and" list, every
  stated observable input, every membership requirement, and every named category, unit, or
  facility — MUST be demonstrated by its immediately following example set. Use one explicit,
  specific TypeScript example per item, or one example with a separate adjacent comment for every
  item it demonstrates; an example that merely demonstrates an unlabelled subset is insufficient. A
  representative example for one member never demonstrates another member.
- When a definition targets a library or framework, use its current idiomatic API by inspecting its
  installed or vendored source examples before drafting. For Effect specifically, declare tagged
  failures with `Schema.TaggedErrorClass`; do not hand-roll a class with an `_tag` field.
- When a definition is directly represented as machine-readable input or output rather than
  TypeScript source — including a recorded measurement — include a specific, complete, coherent
  example in that format immediately after the definition. Use a valid comment-capable variant of
  the format, with an adjacent comment naming every enumerated item demonstrated, including each
  observable input, unit, and membership requirement.
- Omit an example only when neither TypeScript source nor machine-readable input can demonstrate
  the concept.
- When a definition names a contrary, inverse, exclusion, prohibition, or "not this" case —
  including with "rather than," "not," "does not," or "except" — its immediately following example
  MUST show both cases under explicit `**This:**` and `**Not this:**` labels. A list of excluded
  items is a list of contrary cases: the `**Not this:**` example set MUST demonstrate and
  separately label every listed item.

3. **Specify the measurement protocol.**

- State the metric's identity precisely: its name, its unit, its scale (count, bytes, duration,
  ratio, or ordinal), its direction of goodness (whether larger or smaller is better), and its
  domain (whole project, per module, per export, per execution, or another defined granularity).
- Enumerate the metric's observable inputs exhaustively: which files, configurations, resolved
  graphs, build artifacts, or executions the value is a function of, and which are explicitly
  excluded.
- When the metric requires execution, state every environment control needed for reproducibility —
  pinned tool and runtime versions, fixed inputs and seeds, warmup policy, isolation requirements,
  repetition count, and the aggregation statistic applied across repetitions — and state the
  resulting **noise floor**: the smallest difference between two measured values that the protocol
  treats as a real change rather than variance. A static metric MUST state a noise floor of zero
  and justify why the procedure is exactly deterministic.
- State the deterministic procedure as an ordered sequence from inputs to final value, then
  immediately follow it with a `**Measurement implementation:**` TypeScript snippet that implements
  the procedure's essential control flow: inputs, traversal or execution, valuation, aggregation,
  and the reported value. The snippet MUST be complete, coherent, and independently type-checkable
  against its stated imports; do not use pseudocode.
- Specify a **decomposition**: how the aggregate value is attributed to constituent units (modules,
  functions, dependencies, phases) so that optimization can target the largest contributors. State
  the composition law — how the parts recombine into the whole — and make the decomposition use the
  same definitions and predicates as the aggregate metric.
- Specify baseline and regression tracking: the machine-readable record format for a measurement
  (value, unit, inputs digest, environment controls, timestamp), the comparison procedure between
  two records, and the success criterion that decides improvement, regression, or no-change
  relative to the noise floor. Include a complete example record in a comment-capable format.
- Audit validity: when the metric is a proxy for the requested property rather than the property
  itself, say so explicitly, enumerate every case where the proxy and the property diverge, and
  either add a companion measurement that covers the divergence or state the residual gap plainly.

4. **Synthesize a complete optimization playbook.**

- Apart from the required `## Informal definition`, do not write a standalone "defining properties"
  preface or use an initial inventory as a completeness boundary.
- Enumerate every mechanism by which the property can degrade, across every technology facility
  inventoried in step 1, and derive the smallest independent lever that improves each mechanism.
- Do not use a small, fixed, or aesthetically tidy lever count as a stopping condition. The number
  of levers MUST be determined by the full set of independently observable degradation mechanisms
  across the requested property and every applicable named technology.
- Audit coverage in both directions before writing: every degradation mechanism MUST be addressed
  by at least one lever, and every lever MUST be necessary for at least one degradation mechanism.
- Give each lever a stable `### <Lever>` heading and a one-sentence normative statement of the
  transformation using RFC 2119 language: `MUST` when the untransformed form always degrades the
  metric, `SHOULD` when a real trade-off exists, `MAY` for permitted alternatives.
- Immediately after the normative statement, add an `#### Applicability` subsection stating the
  deterministic condition — decidable from the measurement output, its decomposition, or a defined
  predicate — under which the lever applies. A lever whose applicability requires human judgment is
  not a lever; sharpen it or split it.
- Follow with a `#### Effect on metric` subsection naming the causal mechanism by which the
  transformation moves the metric, the predicted direction, and, when derivable, the magnitude or
  complexity class of the change; do not merely restate the transformation.
- Follow with a `#### Trade-offs` subsection enumerating every other measurable property the
  transformation can worsen and how to detect that worsening; when there is genuinely none, state
  that and why.
- Give each lever a close, complete, coherent, independently type-checkable **before** example and
  **after** example, labeled explicitly, whose only material difference is the transformation the
  lever names.
- Follow with a `#### Confirmation` subsection: the measure-before, transform, measure-after
  procedure and the success criterion — the improvement the after-measurement must show, exceeding
  the noise floor, for the lever application to count as confirmed. Immediately follow that prose
  with a `**Confirmation implementation:**` TypeScript snippet implementing the comparison against
  two measurement records; it MUST be complete, coherent, and independently type-checkable against
  its stated imports.
- Do not include `Failure mode`, `Scope`, or `Exceptions` subsections; `#### Effect on metric` is
  the required location for the degradation mechanism, the normative statement MUST state its
  subject and applicability, and a lever with no permitted alternatives needs no exceptions
  section.
- Do not create catch-all exceptions, compatibility shims, or escape hatches.
- Order the levers by expected impact per unit of change risk, and close the section with a
  deterministic diagnostic procedure that maps a measurement record and its decomposition to the
  ordered list of applicable levers.

5. **Guard against gaming the metric.**

- Enumerate every transformation that improves the metric's value without improving the requested
  property — deleting covered functionality, shifting cost outside the measurement boundary, moving
  work to an unmeasured phase, exploiting the aggregation statistic, or overfitting to the fixed
  measurement inputs.
- For each such transformation, add an invariant that must hold across a measurement pair or a
  companion measurement that detects it, with the same mechanical rigor as the primary metric.
- A confirmation is valid only when the primary success criterion and every applicable invariant
  hold simultaneously; state this in the confirmation procedure.

6. **Keep the protocol and playbook coherent and complete.**

- Ensure every definition, measurement dimension, and lever is necessary for the stated property,
  distinct from every other entry, and preserves necessary domain distinctions.
- Reconcile overlapping levers by deleting or merging them only after confirming that their union
  still covers every degradation mechanism.
- Test collective sufficiency by constructing concrete counterexamples: a degradation of the
  property that the measurement cannot detect, a detected degradation that no lever's applicability
  condition matches, and a metric improvement that games the property without tripping an
  invariant. If any counterexample survives, add or strengthen the smallest measurement dimension,
  lever, or invariant that rejects it.
- Repeat until no such counterexample remains.

7. **Audit terminology, reproducibility, and example coverage before writing the document.**

- Audit the candidate document, not merely the planned definitions and sections, as a reader
  without repository context.
- Add a definition for every technical term, unit, category, classification, action, state,
  boundary, quantity, or relationship that remains undefined; add or correct every required inline
  definition link; and remove no definitions merely to keep the glossary short.
- For each definition, enumerate every item in its prose — including observable inputs, units,
  membership requirements, alternatives, categories, facilities, and exclusions — and verify that
  its immediately following example set has a complete, coherent, independently type-checkable
  example and adjacent label for every item.
- For each definition, verify that its `**Mechanical predicate:**` identifies its concrete input
  and returns a Boolean membership or unit-valued result, and that its
  `**Predicate implementation:**` implements that predicate using the declared observable inputs
  without human judgment.
- Separately prove reproducibility: walk the measurement procedure as two independent runs and
  verify that every input, control, and aggregation step is pinned precisely enough that the two
  values differ by at most the stated noise floor; pin anything that is not.
- Separately prove playbook completeness: enumerate every degradation mechanism again across all
  inventoried facilities, map each to one or more levers, verify every lever's applicability
  condition is decidable from measurement output alone, and construct the gaming counterexamples
  from step 5 against the final invariant set.
- Separately verify that every example declares or imports all referenced symbols and that its
  names, types, and described behavior agree.
- For each library-specific example, verify that its API is idiomatic against the inspected source
  examples.
- Revise until all audits have no omissions; only then write the document.

## Required output

Return exactly these sections:

```text
# <Property> measurement and optimization

## Informal definition

## Definitions

### <Term>

## Measurement

### Metric

### Procedure

### Decomposition

### Baseline and regression tracking

## Optimization

### <Lever>

### Diagnostic procedure

## Invariants against gaming
```

- `## Informal definition` MUST appear directly after the title and before `## Definitions`.
- It MUST define the requested property in ordinary technical language, state what varies when it
  improves or degrades and in what units, and name the primary degradation mechanisms the levers
  will address.
- It MUST NOT introduce undefined formal terminology, normative requirements, mechanical
  predicates, or code examples.
- Each definition MUST be a separate `### <Term>` entry, used as the link target for every
  subsequent prose use of that term, with the required `#### Related terms` table when confusable
  neighbors exist, a `**Mechanical predicate:**`, a `**Predicate implementation:**` TypeScript
  snippet, and a complete labeled example set, exactly as specified in the method.
- `### Metric` MUST state the metric's name, unit, scale, direction of goodness, domain, observable
  inputs, and exclusions.
- `### Procedure` MUST state the environment controls, noise floor, ordered deterministic
  procedure, and the `**Measurement implementation:**` TypeScript snippet.
- `### Decomposition` MUST state the attribution granularity and composition law using the same
  predicates as the aggregate metric.
- `### Baseline and regression tracking` MUST state the record format with a complete example
  record, the comparison procedure, and the improvement/regression/no-change criterion.
- Each `### <Lever>` MUST contain its normative statement; `#### Applicability`;
  `#### Effect on metric`; `#### Trade-offs`; labeled before and after examples; and
  `#### Confirmation` with a `**Confirmation implementation:**` TypeScript snippet.
- `### Diagnostic procedure` MUST deterministically map a measurement record and its decomposition
  to the ordered applicable levers.
- `## Invariants against gaming` MUST enumerate each gaming transformation and the invariant or
  companion measurement that rejects it.
