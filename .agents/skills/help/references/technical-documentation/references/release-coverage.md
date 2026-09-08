# Release coverage audit

Use this audit when comparing a base revision with a candidate change that may alter a reader-visible command, API, configuration option, workflow, output, or diagrammed component. It checks coverage; it does not create a release process or take publishing authority.

## Establish the changed surface

1. Compare the named base and candidate revisions. Read the changed code and its existing documentation rather than inferring impact from file names or commit messages.
2. List each public entity that was added, changed, renamed, or removed. Exclude internal refactors unless they change what a reader can use, observe, configure, or depend on.
3. For every entity, state the reader need it creates, if any:
   - a fact or complete interface contract calls for **reference**;
   - a task with a known goal calls for a **how-to**;
   - a first successful learning path calls for a **tutorial**;
   - a consequential design, tradeoff, or model calls for **explanation**.

These are candidate needs, not four required documents. A changed entity can need one mode, several, or none.

## Find the canonical document before changing anything

Search the existing documentation set for the entity, its prior name, and related task or concept. Extend the document that already owns the reader need when it is current and reachable. Create a document only when no canonical owner can carry the needed material; do not make a parallel hierarchy merely to fill a Diátaxis quadrant.

For each entity and each relevant document, classify the result as:

- **Affected** — the documentation conflicts with the candidate or needs a bounded factual update. Cite the changed behavior and the exact passage, command, schema, or observed output that establishes it; name the smallest corrective action.
- **Unaffected** — the document was checked and remains accurate. Cite the entity, document location, and evidence from the base/candidate comparison.
- **Not verified** — available evidence cannot establish accuracy. State what is missing and the narrowest observation or owner decision that would resolve it; do not label it current by assumption.

An audit is complete when each changed public entity has an evidence-backed classification and every affected reader need has either a canonical update or a precisely stated gap. This is a completion check, not a demand to author all identified material.

## Check diagram drift separately

Inspect only diagrams that depict affected code or flows. For ASCII and Mermaid diagrams, compare every relevant node, edge, direction, label, and interface name with the candidate code and its authoritative descriptions. Flag a stale, missing, renamed, split, moved, or redirected element with the diagram location and conflicting evidence. A diagram-drift finding is a warning for the documentation owner to judge; never regenerate or rewrite a diagram automatically.

## Review release-facing text when it exists

If an affected release note, changelog entry, or equivalent reader-facing summary already has a canonical owner, check only the applicable claims:

- **What changed?** Name the reader-visible change accurately.
- **Why care?** State the practical effect when the change has one.
- **How is it used?** Give a verified command, option, or link when use changes.

Do not invent a release note, change versions, publish, commit, open or edit a pull request, or convert unverified claims into release copy. Omit inapplicable claims rather than forcing a three-part format.

## Walk through the changed reader path

Follow a representative, safe path for each affected task-oriented or learning-oriented document: start where the reader starts, perform the documented steps against the candidate when access permits, and compare the result with the promise. For reference and explanation, compare claims to their named authoritative sources. Record what was observed and any exact failed, missing, or unverified step. A walkthrough that cannot run is evidence of a verification gap, not permission to claim success.

Original synthesis informed by gstack's [document-release workflow](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/document-release/SKILL.md.tmpl) and [release-body procedure](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/document-release/sections/release-body.md.tmpl). See [provenance and MIT notice](../../gstack-sources.md); this reference is separate from the Diátaxis CC BY-SA source archive in [SOURCES.md](SOURCES.md).
