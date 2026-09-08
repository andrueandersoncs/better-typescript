---
name: marketing
description: Select a workflow for customer research, pricing decisions, marketing-page copy, technical SEO audits, or lifecycle email sequences.
metadata:
  internal: true
---

# Marketing

Use the shared [gather → match → handoff procedure](../skill-routers/references/canonical-design.md). Select by the requested outcome, not the page type or marketing vocabulary. Pass the original request, relevant product and customer evidence, constraints, and unresolved questions to one owner.

Use the table to choose before loading a workflow. When the supplied evidence distinguishes the outcome, load only that leaf; do not load another merely because it shares a page name. Gather missing context from the project evidence, not by executing neighboring workflows.

| Situation pattern | Skill |
| --- | --- |
| Customer motivations, problems, buying triggers, or language need investigating through existing evidence, public sources, interviews, or surveys. | [customer-research](references/customer-research/SKILL.md) |
| What to charge, what unit to charge for, or what belongs in each package needs deciding or testing. | [pricing](references/pricing/SKILL.md) |
| A marketing page's message, argument, proof, or call to action needs writing or revising for its audience and intended action. | [copywriting](references/copywriting/SKILL.md) |
| Organic-search visibility needs diagnosing through crawling, indexing, rendering, content, or internal-link evidence. | [seo-audit](references/seo-audit/SKILL.md) |
| A welcome, activation, nurture, retention, or win-back email sequence needs copy and event-based delivery rules. | [emails](references/emails/SKILL.md) |
| Established product facts, positioning, customer evidence, or proposed product behavior need recording or maintaining rather than new research or pricing decisions. | [product-management](../product-management/SKILL.md) |
| Existing prose needs clarity, voice preservation, or removal of AI-writing patterns without changing the marketing argument. | [deslop](../deslop/SKILL.md) |
| An accepted marketing specification needs software implementation or a technical defect needs investigation. | [software-craft](../software-craft/SKILL.md) |

A pricing page can require pricing decisions, copy, or an SEO audit. When prices and packaging are already approved, they are inputs to the copywriter, not an unresolved pricing task: load `copywriting` alone for the argument or CTA. Load `pricing` only when commercial terms need deciding or testing. A request for an email sequence belongs to `emails` even when the user calls it copywriting. Do not convert a vague page critique into a claim about conversion or search performance without evidence.

Each marketing workflow reads the [shared context guide](references/context.md); it is supporting guidance, not another specialist or mandatory context-creation task. For broader work outside these patterns, state the uncovered scope rather than assembling an unrequested campaign or pretending an unavailable channel skill exists.

## Sources

The five marketing workflows selectively adapt [Corey Haines's Marketing Skills](https://github.com/coreyhaines31/marketingskills/tree/5b2c0007766c6a1cf1d53fd8fc73e979e0821022), pinned to `5b2c0007766c6a1cf1d53fd8fc73e979e0821022`, captured 2026-09-05. Each workflow identifies its source files. The [MIT notice](LICENSE) covers retained upstream material. These are edited adaptations, not verbatim snapshots; upstream tools, benchmark claims, and evaluation rubrics are not bundled.
