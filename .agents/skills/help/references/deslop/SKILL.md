---
name: deslop
description: Edit or audit prose for AI-writing patterns while preserving meaning and voice.
metadata:
  internal: true
---

# Deslop

Make prose sound like its writer rather than a generic model. Preserve the point, facts, and useful character. Make the minimum effective edit.

## Choose the job

- **Edit by default** when the user provides prose to improve. Return the full edited text, then a brief **What changed** section.
- **Detect** when the user asks to audit, scan, flag, judge, or identify patterns without changing the text. Name each pattern, quote the relevant text, and state the fix in a few words. Do not rewrite, score the text, or guess who wrote it.
- **Edit a file in place** when the user provides a path. Change prose only. Preserve code, data, frontmatter, quoted source material, and link targets. Write the final prose to the file, then report the result briefly.
- **Return only the finished text** when the user or an invoking workflow explicitly requests ready-to-insert, embedded, or output-only copy. Follow any other explicit output format instead of these defaults.

If no text was provided, ask for it. Infer audience, format, and purpose from the request and source. Ask one question only when the missing answer would materially change the edit.

## Preserve what matters

1. Preserve every substantive factual claim, opinion, degree of certainty, and intended action that contributes to the user's point. Empty praise, importance labels, status-signaling details, unsupported attribution, and redundant recaps may be cut when they add no substance. Never turn unsupported attribution into fact. Do not add names, facts, numbers, dates, quotes, citations, rankings, examples, or opinions. Fiction and explicit creative invention are exempt.
2. Keep distinctive vocabulary, cadence, bluntness, humor, profanity, uncertainty, digressions, asides, self-corrections, and deliberate rough edges when they work.
3. Leave strong sentences alone. Do not polish every paragraph to the same level or force the source into a standard outline.
4. Protect specific details. Never trade a concrete fact for a claim that something is important, effective, innovative, or impressive.
5. Match the source's register. Personal writing may carry opinion and uneven rhythm. Technical, legal, reference, and factual prose should stay neutral and exact.
6. When the user supplies a writing sample, treat its word choice, rhythm, punctuation, and quirks as the style authority.

## Edit in this order

1. Read the whole source. Identify what it must make the reader know, feel, or do and which voice traits must survive.
2. Mark protected claims and spans. Resolve awkward passages at the sentence or paragraph level rather than swapping isolated trigger words.
3. Cut empty setup, unsupported interpretation, repetition, and generic conclusions.
4. Replace abstraction with supported facts, actions, mechanisms, consequences, or judgments. Prefer direct verbs and active voice when the actor matters.
5. Vary sentence and paragraph shapes by ear. Keep clear long sentences and useful fragments; fix only rhythm that feels manufactured or hard to follow.
6. Compare the result with the original. Confirm that substantive claims and voice survived, protected spans stayed unchanged, no unsupported detail appeared, relevant patterns are resolved in context, the text sounds natural aloud, and the selected job's output contract is met. Revise until each check passes.

## Pattern reference

Use the [pattern catalog](references/pattern-catalog.md) for a detailed pattern audit or when an editing decision needs examples.

## Verbatim references

These local snapshots retain the upstream text and licenses verbatim. Use them for exact examples, detailed wording, or future resynthesis. This file is the unified operating guide.

- [Humanizer skill](references/humanizer/SKILL.md) and [license](references/humanizer/LICENSE), verbatim from [`SKILL.md` at `e2e92e7`](https://github.com/blader/humanizer/blob/e2e92e7b4b8229253ed5c8e81dc65463fdeddda5/SKILL.md), committed 2026-08-19 and captured 2026-09-04
- [No AI Slop skill](references/no-ai-slop/SKILL.md), [evaluation](references/no-ai-slop/eval.md), and [license](references/no-ai-slop/LICENSE), verbatim from [`SKILL.md`](https://github.com/petergyang/no-ai-slop/blob/000650b156983f5159695b441477f4e63b25dc85/skills/no-ai-slop/SKILL.md) and [`eval.md`](https://github.com/petergyang/no-ai-slop/blob/000650b156983f5159695b441477f4e63b25dc85/skills/no-ai-slop/eval.md) at `000650b`, committed 2026-09-02 and captured 2026-09-04
- [Unslop skill](references/unslop/SKILL.md) and [license](references/unslop/LICENSE), verbatim from [`SKILL.md` at `93b00b8`](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/unslop/SKILL.md), committed and captured 2026-09-04
