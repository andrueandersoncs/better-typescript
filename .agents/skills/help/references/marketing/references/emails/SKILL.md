---
name: emails
description: Design and draft lifecycle email sequences with explicit entry, timing, state, exits, and safe delivery assumptions. Use for onboarding, activation, nurture, retention, renewal, and win-back flows; not for sending or configuring automation.
metadata:
  internal: true
---

# Lifecycle Emails

Read the [shared marketing context](../context.md) before work. Reuse supplied and project artifacts; do not create a separate marketing record. Preserve verified product truth and research provenance. A proposed sequence is not a configured automation or a message that has been sent.

## Define the state transition

Before drafting, establish the sequence's one objective and the state contract:

- **Entry:** event, audience segment, eligibility rules, and what the recipient already knows or has done.
- **Suppression:** audiences that must not enter, including unsubscribed recipients for marketing messages, ineligible users, and people already in a conflicting sequence. Classify the message's marketing or transactional purpose from its actual content and local policy; do not make compliance guarantees.
- **Progress:** each message's purpose, timing relative to the entry event or prior message, and the product state that makes it relevant.
- **Exit:** the observed action or state that achieves the objective, plus cancellation, ineligibility, or preference changes that should stop delivery.
- **Re-entry:** whether the sequence can restart, which later event permits it, and how duplicate or stale messages are prevented. State an assumption if this is unknown.

Ask only for facts that change eligibility, the recipient's next action, a claim, or a CTA destination. Propose timing when the user asks you to design it, and label assumptions rather than presenting a proposed cadence as existing automation. Do not invent incentives, deadlines, outcomes, customer stories, product behavior, or legal certainty.

## Design the sequence

Give every message one job that advances the same objective. Choose timing from the product event and recipient context rather than copying a universal cadence. Use actual product behavior, completed setup, purchases, clicks, or other relevant events to decide relevance where available. Do not use email opens alone as evidence of activation or engagement: they can be unreliable. A click may indicate interest in the linked path, not completion of the outcome.

Write only claims supported by the product facts and event data. For onboarding, help the recipient perform a known next product action. For renewals, billing, and other transactional notices, state known terms and destinations precisely; do not add promotional pressure merely because a message reaches a customer. For marketing messages, respect known consent and preference state. Stop messages once the objective has been achieved.

## Deliver

Return a **Sequence state contract** first: entry event and eligible segment, objective, suppression, exit conditions, re-entry rule or assumption, and the events needed to evaluate delivery. Then provide each message with:

- timing relative to a stated event;
- purpose and send condition;
- subject, preview text, finished body, and one primary CTA;
- a valid, known destination for that CTA; and
- the behavioral exit or next state it expects.

If a destination or material fact is unknown, draft around known facts and list the missing item outside the finished messages. Do not put fake links, fabricated customer proof, or placeholder claims in a deliverable unless the user expressly requests a template.

This workflow produces sequence design and email copy. It does not configure an automation, modify customer data, send messages, change billing, or buy tools. For a prose-only edit of supplied email text, use [deslop](../../../deslop/SKILL.md). For product-state definitions or eligibility requirements that need durable ownership, use [product-management](../../../product-management/SKILL.md); for uncertain rollout assumptions or measurement plans, use [predictive-planning](../../../predictive-planning/SKILL.md). Hand implementation to the appropriate software work.

## Sources

Adapted, not verbatim, from the upstream [emails workflow](https://github.com/coreyhaines31/marketingskills/blob/5b2c0007766c6a1cf1d53fd8fc73e979e0821022/skills/emails/SKILL.md) and [email types reference](https://github.com/coreyhaines31/marketingskills/blob/5b2c0007766c6a1cf1d53fd8fc73e979e0821022/skills/emails/references/email-types.md), accessed from pinned commit `5b2c0007766c6a1cf1d53fd8fc73e979e0821022`. See the [MIT license](../../LICENSE).
