---
name: focus-content
description: Prune existing content to the three primary questions it should answer by deleting every non-answering section, component, or item.
metadata:
  internal: true
---

# Focus Content

Use this workflow when existing content has accumulated material outside its core purpose. The input is the content plus any stated audience, purpose, preservation constraints, and output format. Infer missing context from the request and source; ask only when different plausible purposes would materially change the top three questions.

## Derive the questions

1. Read the complete content and identify its intended audience, job, and promised outcome. Treat those as stronger evidence than the amount of text devoted to a topic; a long tangent does not become core because it is long.
2. Generate exactly ten distinct questions the content is meant to answer. Phrase them from the audience's perspective and make them specific enough to decide whether a content item contributes. Every candidate must plausibly serve the intended job; never use a tangent, an existing heading, or a meta-question about what is irrelevant merely to reach ten.
3. Rank the ten by centrality to the intended job, value to the audience, and coverage of the promised outcome. Merge overlapping candidates, then select exactly three. Freeze these three before judging individual content items so irrelevant material cannot justify itself by changing the questions.

## Prune against the top three

4. Inventory every substantive unit at the smallest useful level: section, paragraph, list item, table row, instruction, example, code block, caption, callout, or equivalent component. Structural wrappers such as headings, table delimiters, and code fences travel with the substantive units they contain.
5. Map each unit to one or more selected questions only when it directly answers or supplies evidence, instructions, or an example needed to answer that question. Shared vocabulary, background association, transitions, visual decoration, and general interest are not enough.
6. Delete every unmapped unit. Then delete empty containers, orphan headings, dangling transitions, and references whose targets were removed. Preserve the order and exact wording of retained material unless a smaller deletion is required to repair the join; do not add replacement claims or broaden the remaining content.

## Check and repair

Re-read the pruned result from start to finish and repeat the inventory. Every retained substantive unit must map to at least one frozen question. Delete any exception and check again. Confirm that retained tables, lists, links, and fenced blocks remain structurally valid.

If a selected question has no answer in the source, report the gap; do not promote a less important question or invent an answer. If an explicit preservation constraint forbids deleting an unmapped item, complete every permitted deletion and name the exact unresolved item and constraint.

## Output

Return:

1. the ten candidate questions;
2. the selected top three, in rank order;
3. the focused content, or the path edited in place;
4. a concise coverage result stating that every retained item maps to a selected question, plus any unanswered question or constrained exception.

The work is complete when all permitted unmatched content is gone, the remaining structure is valid, and the coverage check passes or identifies only an explicit external constraint.
