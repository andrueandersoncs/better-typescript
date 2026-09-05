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
6. Compare the result with the original. Confirm that substantive claims and voice survived, protected spans stayed unchanged, no unsupported detail appeared, the pattern catalog passes in context, the text sounds natural aloud, and the selected job's output contract is met. Revise until each check passes.

## Pattern catalog

Treat patterns as editing evidence, not an authorship detector. One word, one em dash, polished grammar, or formal vocabulary proves nothing. Act when a pattern adds no meaning, clashes with the writer, or appears in a cluster. Do not alter quotations, titles, proper names, code, or deliberate repetition merely because they match a pattern.

### Empty importance and authority

- **Inflated importance.** Cut claims that an ordinary fact is pivotal, enduring, transformative, a testament, a turning point, or part of an evolving landscape. State what happened and its concrete consequence.
- **Promotional language.** Replace `vibrant`, `breathtaking`, `groundbreaking`, `renowned`, `stunning`, `must-visit`, `nestled`, and similar sales copy with observable detail.
- **Name-dropping.** Keep a publication, expert, or follower count only when it supplies useful context. Say what the source established.
- **Vague attribution.** Name the source behind `experts agree`, `studies show`, `many argue`, or `industry reports suggest`. Ask once for the source when the claim is material. If no source is available, remove the unsupported claim rather than inventing a source or turning the attribution into fact.
- **Shallow analysis.** Remove trailing `-ing` clauses such as `highlighting`, `underscoring`, `reflecting`, `showcasing`, or `fostering` when they only announce significance. Replace them with a supported cause or consequence when one exists.
- **Stock challenges and outlooks.** Replace `despite these challenges` and generic future optimism with specific problems, plans, or facts already in the source.
- **Interpretive commentary.** Cut `the key point is`, `this distinction matters`, `as you can see`, `that matters more than it sounds`, and redundant `in other words`. Make the evidence carry the emphasis.

### Scripted rhetoric

- **Binary contrast and clipped negation.** Replace `not X but Y`, `not just X`, and `the question isn't X` with the actual claim. Turn tailing fragments such as `no guessing` into a complete clause such as `without forcing the user to guess`.
- **Negative listing.** Replace `Not X. Not Y. Z.` with Z.
- **Throat-clearing and fake candor.** Cut `here's the thing`, `let me be clear`, `honestly?`, `real talk`, `quick note`, and `one thing that bit me` when they only delay the point.
- **Faux insight.** Cut `what nobody tells you`, `the part everyone misses`, `the real question`, `at its core`, and other staged revelations.
- **Colon reveals.** Rewrite dramatic `setup: lowercase reveal` constructions as direct sentences. Keep colons for real lists, labels, explanations, and quotations.
- **Rhetorical setups.** Remove `what if I told you`, `think about it`, `plot twist`, and self-answered question hooks when a plain statement works.
- **Fake objections and alternatives.** Delete defenses or rejected options no reader raised. Keep real, sourced objections and viable tradeoffs.
- **Formulaic sayings.** Replace `X is the Y of Z`, `the language of`, `the currency of`, `not a tool but a mirror`, and other manufactured aphorisms with the specific claim.
- **Forced punchlines.** Delete fake-profound kickers, stacked dramatic fragments, and mic-drop endings. End on the last useful fact, judgment, takeaway, or action.

### Empty and abstract language

- **Filler.** Tighten `in order to`, `due to the fact that`, `at this point in time`, `in the event that`, `it is important to note`, `when it comes to`, and similar padding.
- **Qualifier piles.** Keep uncertainty the meaning requires, but collapse `could potentially possibly` and caveats that only repair an earlier overstatement.
- **Weak verb phrases.** Prefer `is`, `has`, `can`, and direct verbs over `serves as`, `stands as`, `boasts`, `features`, `has the ability to`, and nominalizations such as `made a decision`.
- **Abstract metaphor nouns.** Replace vague uses of `substrate`, `wedge`, `vector`, `locus`, `nexus`, `primitive`, `harness`, `surface`, `bedrock`, `scaffolding`, `modality`, `paradigm`, `ratchet`, `endgame`, `north star`, and `flywheel` with the concrete thing or action.
- **Stock AI vocabulary.** Watch for clusters of `additionally`, `crucial`, `delve`, `enduring`, `enhance`, `foster`, `garner`, `interplay`, `intricate`, `landscape`, `pivotal`, `showcase`, `tapestry`, `testament`, `underscore`, `robust`, `streamline`, `empower`, `leverage`, `utilize`, `facilitate`, `transformative`, `elevate`, and `supercharge`. Use the plain word when the ornate one adds nothing.
- **Unsupported feeling.** Replace copy such as `stays close at hand`, `types that follow your schema`, or `SQL you can read` with the mechanism, instruction, or measured result. If the sentence could describe another project unchanged, cut it or make it specific from the source.
- **Adverb props.** Cut an adverb that only props up a weak verb. When a supported measurement already shows magnitude, delete labels such as `significantly` instead of restating the measurement.

### Mechanical structure

- **Forced groups of three.** Use the number of points the subject needs.
- **Synonym cycling.** Repeat the clearest term for the same thing instead of rotating names.
- **Repeated openings.** Merge or reshape consecutive sentences with the same empty opening unless the repetition creates deliberate rhythm.
- **False ranges.** Replace `from X to Y` when X and Y do not form a scale or sequence.
- **Robotic symmetry.** Break identical sentence shapes, equally sized paragraphs, repeated list structures, and strings of punchy fragments when they sound manufactured.
- **Dense sentences.** Split a sentence when the reader must backtrack. Keep one main idea per sentence unless the source's spoken cadence remains clear.
- **Missing actors.** Prefer active voice and name the actor when it clarifies responsibility. Keep passive voice when the actor is unknown or irrelevant.
- **Repeated headings.** Delete the sentence beneath a heading when it merely restates that heading.
- **Historical drafting residue.** In current documentation and comments, describe what exists now. Reserve previous approaches for change logs, release notes, migration guides, and explanations where history matters.

### Formatting and assistant residue

- **Dash habits.** Do not introduce em or en dashes as rhythm crutches. Use periods, commas, or a rewritten sentence unless a supplied writing sample uses dashes as part of its voice. Never flag one dash by itself as AI evidence.
- **Decorative formatting.** Remove ornamental emoji, scattered bold emphasis, title-case headings, tiny sections, and lists with bold labels that merely repeat their text. Keep formatting that helps the reader navigate real structure.
- **Punctuation and hyphenation.** Match the source and target format. Do not automatically convert straight quotes to curly quotes. Keep a compound-modifier hyphen when grammar needs it before a noun, as in `a high-quality report`; drop it after the noun, as in `the report is high quality`, and remove clusters of modifiers the sentence does not need.
- **Chatbot residue.** Remove greetings, praise, agreement, `I hope this helps`, `let me know`, `would you like me to`, and other conversation accidentally left in standalone copy.
- **Knowledge disclaimers and guesses.** Remove training-cutoff language and plausible gap-filling. State only what the available source establishes.
- **Recap endings.** Cut `in conclusion`, `overall`, `ultimately`, and final paragraphs that only repeat the piece.

## Verbatim references

These local snapshots retain the upstream text and licenses verbatim. Use them for exact examples, detailed wording, or future resynthesis. This file is the unified operating guide.

- [Humanizer skill](references/humanizer/SKILL.md) and [license](references/humanizer/LICENSE), verbatim from [`SKILL.md` at `e2e92e7`](https://github.com/blader/humanizer/blob/e2e92e7b4b8229253ed5c8e81dc65463fdeddda5/SKILL.md), committed 2026-08-19 and captured 2026-09-04
- [No AI Slop skill](references/no-ai-slop/SKILL.md), [evaluation](references/no-ai-slop/eval.md), and [license](references/no-ai-slop/LICENSE), verbatim from [`SKILL.md`](https://github.com/petergyang/no-ai-slop/blob/000650b156983f5159695b441477f4e63b25dc85/skills/no-ai-slop/SKILL.md) and [`eval.md`](https://github.com/petergyang/no-ai-slop/blob/000650b156983f5159695b441477f4e63b25dc85/skills/no-ai-slop/eval.md) at `000650b`, committed 2026-09-02 and captured 2026-09-04
- [Unslop skill](references/unslop/SKILL.md) and [license](references/unslop/LICENSE), verbatim from [`SKILL.md` at `93b00b8`](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/unslop/SKILL.md), committed and captured 2026-09-04
