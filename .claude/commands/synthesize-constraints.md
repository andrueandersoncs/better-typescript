---
description: Synthesize a falsifiable constraint set for a goal
argument-hint: <concept, goal, or @document>
---

Synthesize a comprehensive, coherent set of constraints for the following TypeScript project quality or architectural concept into a markdown document in @docs/. The collective adherence to these constraints must produce the requested quality or concept in the project:

$ARGUMENTS

This is a design command. Output your response to a markdown document. Do not modify existing source, configuration, or documentation unless the
maintainer explicitly requests it. Do not read any existing documentation. Your output needs to be from **first principles**, reading existing documentation would pollute your context window.

## Objective

Turn the stated TypeScript project quality, architectural concept, or goal into constraints that a maintainer can apply consistently.
A **constraint** is a **falsifiable**, **mechanically-verifiable** rule that narrows acceptable designs; it is not a restatement of the
goal, an aesthetic preference, an implementation suggestion, or an unqualified example. Some constraints will require thinking 'outside the box' in order to identify a method of mechanical verification and that's okay! Don't be scared to consider and suggest extreme or unusual methods, the goal is verification by any means necessary. Do **not** omit a constraint just because it would be hard (or impossible!) to verify.


## Method

1. **Reason from first principles.** Identify the properties that make the stated TypeScript project quality or architectural concept true. Derive constraints directly from those properties rather than from existing repository practice or documents.
- Before deriving terms or rules, inventory every technology explicitly named by the request.
- For each technology, inspect its current idioms and enumerate every facility, type-system feature, configuration surface, lifecycle, boundary, and composition mechanism that can affect the requested quality or concept.
- This inventory is an internal coverage obligation, not a preface or an output-section limit: derive a constraint for every applicable observable violation class, however many rules that requires.

2. **Define, demonstrate, and predicate necessary terms.**
- Before drafting constraints, inventory every technical term, category, classification, action, state, boundary, and relationship that the planned normative statements rely on.
- A term is necessary when omitting its definition would leave a reader unable to determine whether a constraint applies; this includes precisely-qualified verbs and states such as “defer,” “execute,” “expose,” “own,” or “escape.”
- Define every necessary term clearly and precisely in `## Definitions`; there is no numerical limit.
- Use one `### <Term>` entry per term so it has a stable Markdown anchor.
- Order entries so an entry appears before any prose use of that term in a later entry or constraint.
- A definition MUST use only already-defined terms or ordinary language, and MUST identify observable boundaries rather than rely on identifier names, directory names, or presumed intent.
- A definition MUST state the observable inputs and deterministic membership criterion needed to decide whether a concrete artifact or relationship satisfies it. When a definition narrows another term with a qualifier such as “permitted,” “public,” “production,” or “cross-boundary,” define that qualifier as a separate term or express its criterion directly through a declared field, value, or resolution procedure; never leave a qualifier such as “permitted import location” implicit.
- Every definition MUST immediately state a `**Mechanical predicate:**` with its required inputs, deterministic procedure, and Boolean membership result for a concrete artifact or relationship. This predicate is the classifier that every later constraint verification uses; it MUST decide the definition without human judgment.
- Immediately follow each `**Mechanical predicate:**` with a `**Predicate implementation:**` TypeScript snippet that implements its essential inputs, traversal or resolution, classification, and Boolean result. The snippet MUST be complete, coherent, and independently type-checkable against its stated imports; do not use pseudocode.
- Every classification used by a definition or constraint MUST be inferred deterministically from the artifact it classifies: source text or AST, compiler-resolved symbols or types, the resolved module graph, filename or directory conventions, or existing project configuration that defines compiler or build inputs. A classification MUST NOT depend on maintainer-declared intent or a user-maintained mapping.
- MUST NOT invent or require a manifest, registry, allowlist, or other configuration that assigns roles, kinds, categories, or permissions to individual source modules, exports, dependencies, globals, or other project artifacts. When a proposed category cannot be inferred deterministically, reformulate the constraint around observable implementation behavior; inability to classify is not grounds to introduce a manual mapping.
- In all prose after an entry’s heading—including later definitions and every constraint subsection—render each use of that defined term as an inline Markdown link to its definition.
- Do not link definition headings or code examples.
- Every TypeScript example MUST be specific, complete, coherent, and independently type-checkable against its stated imports. Declare or import every referenced identifier; make names, types, and behavior agree; and do not use a symbol to imply behavior the snippet does not perform.
- Every example MUST use source comments to identify the exact declarations, expressions, values, or relationships that exemplify the definition. Put each comment immediately adjacent to what it identifies; do not make the reader infer the mapping from surrounding code. When a definition enumerates items, each comment MUST name the exact enumerated item it demonstrates.
- Every enumerated item in a definition—including every item in an “or” or “and” list, every stated observable input, every membership requirement, and every named category or facility—MUST be demonstrated by its immediately following example set. Use one explicit, specific TypeScript example per item, or one example with a separate adjacent comment for every item it demonstrates; an example that merely demonstrates an unlabelled subset is insufficient. A representative example for one member never demonstrates another member: for example, an enumeration of callable declaration forms requires an adjacent labeled example for each form, and an enumeration of APIs requires an adjacent labeled example for each API.
- When a definition targets a library or framework, use its current idiomatic API by inspecting its installed or vendored source examples before drafting. For Effect specifically, declare tagged failures with `Schema.TaggedErrorClass`; do not hand-roll a class with an `_tag` field.
- When a definition is directly represented as machine-readable input rather than TypeScript source, include a specific, complete, coherent example in that input format immediately after the definition. Use a valid comment-capable variant of the format, with an adjacent comment naming every enumerated item demonstrated, including each observable input and membership requirement.
- Omit an example only when neither TypeScript source nor machine-readable input can demonstrate the concept.
- When a definition names a contrary, inverse, exclusion, prohibition, or “not this” case—including with “rather than,” “not,” “does not,” or “except”—its immediately following example MUST show both cases under explicit `**This:**` and `**Not this:**` labels. A list of excluded items is a list of contrary cases: the `**Not this:**` example set MUST demonstrate and separately label every listed item.
- The `**Not this:**` case MUST establish the named contrary in the source relationship itself; for example, a definition that excludes an HTTP protocol or database driver as a direct input MUST include a code example **demonstrating** what **not to do**, clearly labeled, not merely name it in prose.

3. **Synthesize a complete constraint set.**
- Do not write a standalone “defining properties” preface or use an initial property inventory as a completeness boundary. Explore the target quality from every mechanically distinguishable dimension, enumerate all observable ways the quality can fail, and derive the smallest independent constraint that prevents each violation class.
- Treat structural modularity as a separate dimension whenever the requested quality concerns TypeScript code, modules, architecture, boundaries, or composition.
- Derive rules for every applicable physical and public-interface choice: repository-root and directory placement, file basename and suffix, module specifier form, permitted imports and dependency direction, module role inferred from physical location and source behavior, declaration order, permitted top-level contents, and permitted exports.
- State exact deterministic path, filename, AST, graph, or compiler-resolution criteria rather than relying on a module's intended role.
- Do not omit a structural rule merely because it is convention-oriented; make its convention mechanically falsifiable without a manifest, registry, allowlist, or maintainer-maintained role mapping.
- Do not use a small, fixed, or aesthetically tidy constraint count as a stopping condition. The number of constraints MUST be determined by the full set of independently observable violation classes across the requested concept and every applicable named technology.
- For every rule, use RFC 2119 language: use `MUST` when violating the rule prevents the concept from being true, `SHOULD` only for a real trade-off, and `MAY` only for permitted alternatives.
- State the subject, required or prohibited condition, any necessary ordering or ownership fact, and the mechanical verification the constraint requires.
- Before writing, audit coverage in both directions: every observable violation class MUST be prevented by at least one constraint, and every constraint MUST be necessary for at least one violation class.
- For the coverage audit, test each applicable technology independently and then test their interaction.
- A rule set that covers only selected APIs or one layer of a named technology is incomplete when an unaddressed facility can violate the requested quality.

4. **Demonstrate and justify each constraint.**
- Give each constraint a close, complete, coherent, independently type-checkable allowed code example and a close, complete, coherent, independently type-checkable violating code example that clarify or prove its boundary.
- Immediately after each normative statement, add a `#### Rationale` subsection. Explicitly explain why the rule is necessary for the requested quality and how enforcing its exact condition prevents the relevant violation class or produces that quality; do not merely restate the rule.
- Do not include `Failure mode`, `Scope`, or `Exceptions` subsections; the rule itself MUST state its subject and applicability, and a constraint with no permitted alternatives needs no exceptions section.
- Do not create catch-all exceptions, compatibility shims, or escape hatches.

5. **Specify mechanical verification.**
- For every constraint, design a concrete way to verify it.
- State the required inputs, deterministic procedure, success criterion, and failure finding.
- Immediately follow that prose with a `**Verification implementation:**` TypeScript code snippet that implements the verifier's essential control flow: inputs, traversal, classification, test, and finding.
- The snippet MUST be complete, coherent, and independently type-checkable against its stated imports; do not use pseudocode.
- Use static analysis, compilation, tests, executable models, property testing, runtime instrumentation, generated evidence, or another mechanism appropriate to the rule.
- When existing tooling cannot verify a constraint, propose the tooling, instrumentation, or proof obligation needed to do so; do not replace mechanical verification with human review or omit a necessary constraint because verification is difficult.

6. **Keep the constraints coherent and complete.**
- Ensure every constraint is necessary for the stated concept, distinct from every other constraint, and preserves necessary domain distinctions.
- Reconcile overlapping rules by deleting or merging them only after confirming that their union still covers every defining property and violation class.
- Test collective sufficiency by constructing a concrete counterexample for each defining property: if code can violate that property while satisfying every drafted constraint, add or strengthen the smallest constraint that rejects it.
- Repeat until no such counterexample remains.

7. **Audit terminology, completeness, and example coverage before writing the document.**
- Audit the candidate document, not merely the planned definitions and constraints, as a reader without repository context.
- Add a definition for every technical term, category, classification, action, state, boundary, or relationship that remains undefined; add or correct every required inline definition link; and remove no definitions merely to keep the glossary short.
- For each definition, enumerate every item in its prose—including observable inputs, membership requirements, alternatives, categories, facilities, and exclusions—and verify that its immediately following example set has a complete, coherent, independently type-checkable example and adjacent label for every item.
- For each definition, verify that its `**Mechanical predicate:**` identifies its concrete input and returns a Boolean membership result, and that its `**Predicate implementation:**` implements that predicate using the declared observable inputs without human judgment.
- Separately prove the constraint set is complete: enumerate every observable violation class again across all relevant dimensions, map each to one or more rules, and construct a counterexample that would satisfy the candidate rules if coverage were absent.
- Repeat the audit specifically for structural modularity: construct counterexamples involving misplaced files, impermissible filenames or suffixes, invalid module specifiers, reversed dependency direction, disallowed module contents, declaration ordering, and excessive or misplaced exports whenever those choices can affect the requested quality.
- Add the smallest rule that rejects each applicable counterexample.
- Add or strengthen rules until every such counterexample is rejected.
- Separately verify that every example declares or imports all referenced symbols and that its names, types, and described behavior agree.
- For each library-specific example, verify that its API is idiomatic against the inspected source examples.
- Revise until all three audits have no omissions; only then write the document.

## Required output

Return exactly these sections:

```text
# <Concept> constraints

## Definitions

### <Term>

## Constraints

```

Each definition MUST be a separate `### <Term>` entry. Use the entry heading as the link target for every subsequent prose use of that term. Directly after every definition whose concept can be demonstrated in TypeScript source or machine-readable input, include a specific minimal example in the applicable format. In every example, use an adjacent source or data comment to identify the exact artifact that exemplifies the definition; when it illustrates multiple listed parts, annotate each part separately. The `## Definitions` section has no maximum number of entries.
Each definition MUST also include a `**Mechanical predicate:**` and immediately following `**Predicate implementation:**` TypeScript snippet before its example set. The predicate decides the definition's membership for concrete inputs and is reused by every constraint verification that relies on the definition.
Under `## Constraints`, number each rule and include its normative statement, a dedicated `#### Rationale` subsection explaining why the rule is necessary for and how it produces the target quality, required mechanical verification, a `**Verification implementation:**` TypeScript snippet, and minimal allowed and violating code examples beside the normative statement.