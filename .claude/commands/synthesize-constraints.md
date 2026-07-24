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

2. **Define and demonstrate necessary terms.**
- Before drafting constraints, inventory every technical term, category, classification, action, state, boundary, and relationship that the planned normative statements rely on.
- A term is necessary when omitting its definition would leave a reader unable to determine whether a constraint applies; this includes precisely-qualified verbs and states such as “defer,” “execute,” “expose,” “own,” or “escape.”
- Define every necessary term clearly and precisely in `## Definitions`; there is no numerical limit.
- Use one `### <Term>` entry per term so it has a stable Markdown anchor.
- Order entries so an entry appears before any prose use of that term in a later entry or constraint.
- A definition MUST use only already-defined terms or ordinary language, and MUST identify observable boundaries rather than rely on identifier names, directory names, or presumed intent.
- In all prose after an entry’s heading—including later definitions and every constraint subsection—render each use of that defined term as an inline Markdown link to its definition.
- Do not link definition headings or code examples.
- When a definition’s concept can be demonstrated in TypeScript source, include a specific, complete TypeScript example immediately after that definition; use the example to validate that the concept exists and that the definition describes its observable behavior.
- Every example MUST use source comments to identify the exact declarations, expressions, values, or relationships that exemplify the defined term. Put each comment immediately adjacent to what it identifies; do not make the reader infer the mapping from surrounding code.
- When a definition presents two or more alternatives, examples, choices, categories, or other distinct items—including an informal list joined by “or” or “and”—immediately follow it with one explicit, specific TypeScript example for each item. If one example demonstrates multiple items, use a separate adjacent source comment for each item.
- When a definition is directly represented as machine-readable input rather than TypeScript source, include a specific, complete minimal example in that input format immediately after the definition. Use a valid comment-capable variant of the format when annotations are necessary, and apply the same adjacent-comment rule.
- Omit an example only when neither TypeScript source nor machine-readable input can demonstrate the concept.
- When a definition names a contrary, inverse, excluded, or “not this” case—including with “rather than,” “not,” or “except”—its immediately following example MUST show both cases under explicit `**This:**` and `**Not this:**` labels.
- The `**Not this:**` case MUST establish the named contrary in the source relationship itself; for example, a definition that excludes an HTTP protocol or database driver as a direct input MUST include a code example **demonstrating** what **not to do**, clearly labeled, not merely name it in prose.

3. **Synthesize constraints.** For each defining property of the concept, derive the smallest independent constraint that prevents a concrete failure mode. Write one constraint per rule using RFC 2119 language: use `MUST` when violating the rule prevents the concept from being true, `SHOULD` only for a real trade-off, and `MAY` only for permitted alternatives. State the subject, scope, required or prohibited condition, any necessary ordering or ownership fact, and the mechanical verification the constraint requires.

4. **Demonstrate each constraint.** Give each constraint a close allowed code example and a close violating code example that clarify or prove its boundary. State exceptions only when they preserve a distinct required property; make them local, narrow, and testable. Do not create catch-all exceptions, compatibility shims, or escape hatches.

5. **Specify mechanical verification.** For every constraint, design a concrete way to verify it. State the required inputs, deterministic procedure, success criterion, and failure finding. Use static analysis, compilation, tests, executable models, property testing, runtime instrumentation, generated evidence, or another mechanism appropriate to the rule. When existing tooling cannot verify a constraint, propose the tooling, instrumentation, or proof obligation needed to do so; do not replace mechanical verification with human review or omit a necessary constraint because verification is difficult.

6. **Keep the constraints coherent.** Ensure every constraint is necessary for the stated concept, prevents a named failure mode, is distinct from every other constraint, and preserves necessary domain distinctions. Prefer deletion or merging over a larger ruleset.
7. **Audit terminology before writing the document.** Re-read the planned definitions and constraints as a reader without repository context. Add a definition for every technical term, category, classification, action, state, boundary, or relationship that remains undefined; add or correct every required inline definition link; and remove no definitions merely to keep the glossary short.

## Required output

Return exactly these sections:

```text
# <Concept> constraints

## Definitions

### <Term>

## Constraints

```
Each definition MUST be a separate `### <Term>` entry. Use the entry heading as the link target for every subsequent prose use of that term. Directly after every definition whose concept can be demonstrated in TypeScript source or machine-readable input, include a specific minimal example in the applicable format. In every example, use an adjacent source or data comment to identify the exact artifact that exemplifies the definition; when it illustrates multiple listed parts, annotate each part separately. The `## Definitions` section has no maximum number of entries.
Under `## Constraints`, number each rule and include its rationale, failure mode, scope, exceptions, required mechanical verification, and minimal allowed and violating code examples beside the normative statement.