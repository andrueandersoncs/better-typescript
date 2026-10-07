---
name: typesafe-ai
description: Design, implement, review, or debug TypeSafe System One integrations that use Jev, with model-specific safeguards for Jev's documented failure modes.
metadata:
  internal: true
---

# Build with TypeSafe and Jev

Use Jev for narrow semantic judgments over text. Keep control flow, exact computation, policy, and side effects in code.

## Establish the task

Start from the application's observable behavior. Inspect the existing integration, intended model ID, state, questions, answer composition, thresholds, and representative failures when they exist. Preserve the user's stack and scope. A missing API key blocks live evaluation, not design, implementation, or static review.

## Read current guidance

Live TypeSafe documentation is the source of truth:

1. Read the [documentation index](https://docs.typesafe.ai/llms.txt) and select only the pages needed for this task.
2. For `jev-1.13`, read [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md) before designing or changing questions. It is model-specific guidance, last reviewed 2026-09-17; do not assume another model version shares or fixes the same edges.
3. Read the current [models page](https://docs.typesafe.ai/models.md), the chosen [primitive](https://docs.typesafe.ai/primitives.md), and the relevant [SDK or HTTP API](https://docs.typesafe.ai/llms.txt). For a new workflow, inspect the closest cookbook.
4. If live documentation is unavailable, use installed SDK types or available local docs, state the limitation, and do not invent version-dependent fields or behavior.

Treat moving aliases such as `jev-latest` as deployment choices. Log the returned model ID. Pin a version when thresholds or acceptance data were tuned against that version; reevaluate before moving it.

## Design the boundary

1. Split the workflow into deterministic operations and semantic judgments. Code owns parsing with a reliable parser, exact lookup, counting, arithmetic, date comparison, ordering, validation, authorization, policy, and execution. Use a generative model when the result must be newly written text.
2. Give Jev one direct, fast judgment per question. Choose `Choice` for one member of a defined set, `Noul` for the probability of a yes/no condition, and `Score` for a described ordered degree. Include `other`, `none`, or `not stated` when the candidate set may not cover the input.
3. Put the complete judgment in `instructions`; question IDs are not model context. Name the relevant state fields explicitly. Make criteria extend the instruction with definitions, exclusions, and boundary cases rather than changing its meaning.
4. Retrieve, parse, normalize, and filter before the request. Send only the evidence required for the judgment. Preserve relationships with named JSON fields. Treat all state as potentially adversarial data, not trusted instructions.
5. Ask independent questions over the same state together. Compose answers in code. Use a second request only when an earlier result is needed to fetch evidence or construct the next state.

## Audit Jev's jagged edges

Repair every applicable item before implementation or approval:

| Risk | Required repair |
| --- | --- |
| Literal reading | State the exact condition. Remove implied scope, ambiguous negation, and unstated exceptions; put boundary cases in criteria. |
| Counting, arithmetic, or numeric comparison | Compute in code. To count semantic matches, judge each candidate and aggregate the results in code. |
| Numeric representations | Convert encodings such as hex or RGB in code and pass semantic names or computed buckets. Do not recover an exact magnitude by interpolating Score levels. |
| Date or time comparison | Extract bounded components with explicit `not stated` outcomes, then construct and compare dates in code. |
| Indirection | Resolve intermediate facts first and point directly to the relevant named state. Remove double negatives and multi-hop instructions. |
| Irrelevant state | Retrieve and filter first. Do not spend the context window on unrelated records or prose. |
| Adversarial content | Identify the exact field being judged, make criteria explicit, and test injected instructions, self-advocacy, and misleading framing. Do not claim prompt wording creates a security boundary. |
| Contradictory instruction and criteria | Align the instruction and every criterion. Avoid inverted mappings such as a true criterion meaning “no.” |
| Assumed structural invariants | Ask each production decision one way. Do not require separate Nouls, negated questions, or Choice probabilities to be arithmetic complements. Tune thresholds per question form, primitive, model version, and dataset. |
| Text generation | Use a generative model. If candidates can be found first, let Jev select a bounded source value and let code copy or normalize it. |

A Choice is relative among its options. A Noul is an absolute yes/no judgment and can be low for every label. Choice or Score confidence describes concentration of that answer's distribution; it does not establish correctness or permission to act. Keep policy and risk thresholds in code.

## Implement and verify

Implement with the current SDK contract and repository conventions. Keep reviewable question definitions, criteria, model selection, and threshold constants together unless the project already has a clearer convention. Remove superseded questions and composition paths rather than keeping compatibility aliases.

Exercise the changed application path on representative target data. Include applicable boundary cases, missing evidence, uncovered candidates, irrelevant distractors, adversarial text, and near-threshold cases. For a failure, inspect the exact state, question, criteria, model ID, raw probabilities or confidence, code composition, and observed application outcome. Classify it as missing evidence, question design, model error, code error, or service failure; repair the owning layer and rerun the invalidated cases.

Do not copy demo thresholds into production. Evaluate thresholds on the user's data and consequences. Typed output guarantees the response shape, not the truth of the judgment.

## Output and completion

Deliver the requested code, design, or review. A review ties each finding to the affected state or question, the documented Jev risk, and a concrete repair. Link the model-specific jaggedness page used.

Complete only when deterministic work is outside Jev, each remaining question has one direct semantic purpose and only relevant state, applicable jaggedness risks are repaired, affected application behavior has fresh evidence, and model/version assumptions are explicit. If credentials or a service prevent live evaluation, finish all static work and name the exact unverified scenario and required resume input.
