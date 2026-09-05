---
name: grok-bot
description: Create and manage Grok Bots, skills, routines, autonomy policies, rosters, templates, and handoffs.
metadata:
  internal: true
---

# Grok Bot

Use Grok Bots as growing collaborators: set a clear outcome, grant authority that matches the risk, and make completion observable.

Do not use this skill for ordinary engineering execution, generic task partitioning or project records, repository skill authoring, or one-off prompt help; use the relevant specialist workflow instead.

## Operating method

1. **Define a focused job and boundary.** Give each bot one primary end-to-end outcome. Put lasting responsibilities and approval boundaries in its description; state the task's sources, expected result, allowed actions, approval point, and next handoff in the message. Connect only the systems it needs and start with read-only work or drafts. Require approval before sending, publishing, purchasing, deleting, changing permissions or production, or accepting legal terms. Enter passwords, passkeys, two-factor codes, CAPTCHAs, and payment confirmations yourself through computer takeover or a supported secure secret request; never put them in chat. All of a user's bots share files, browser sessions, app logins, and command-line credentials on one computer, so separate roles are not security boundaries. Approval to launch a nested agent covers only that launch; constrain the nested agent's tools and credentials separately.
2. **Keep the roster small and ownership clear.** Reuse a bot whose role, access, memory, and cadence fit. Add a specialist only when distinct durable ownership or useful parallelism requires one. Keep one owner at each stage; use a group chat when several bots need one shared outcome and visible handoffs.
3. **Close and improve the feedback loop.** Give bots the real system and current source of truth, then make completion observable. Require reviewable evidence from the resulting user flow or output; do not let memory stand in for changing facts. For iterative work, name a verifier and stop on success, an explicit blocker, a declared limit, or a round with no new failed-check evidence. When work fails, patch the narrow role, routine, or skill responsible, and preserve a prevention rule only when the lesson generalizes.
4. **Teach successful work once.** Run one real task with a safe scope and correct it until the result is reviewable. When the method will recur or should be reused, save it as a Grok Bot skill with its trigger, required access, workflow, validation, output, and approval boundary. For repeatable computer use, demonstrate the workflow once, review the generated skill, and verify it on a second safe input before scheduling it.
   When explicitly extracting a proven workflow into a reusable repository skill, use [author-agent-skill](../software-craft/references/author-agent-skill/SKILL.md) only if no existing skill owns that behavior. Keep bot access and autonomy decisions here.
5. **Automate proven routines.** When work has a stable trigger and observable result, define its owner, schedule and time zone or narrow event trigger, current input source, needed state or deduplication, exact output, handoffs, approval boundary, missing- or stale-data behavior, and silence or escalation condition. At each run, reload the current goal, guardrails, and source of truth instead of relying on memory. Make retries idempotent where possible. Test the routine safely, re-test it when a tool or source changes, and retire it when it stops being useful.
6. **Coach conversationally.** Treat a gap as a learning assignment: ask the bot to research the area, examine successful local examples, and return with an informed approach. Keep the conversation direct rather than adding ritual or oversized prompts.
7. **Package stable workflows.** Once a narrow bot job works reliably, share it as a template containing only the identity, description, skills, and routines the job needs. Name the required connections and remove API keys, internal URLs, customer data, and anything else private. Treat it as a recipe: the shared copy does not include your computer, logins, conversation history, or learned memory, so recipients connect their own accounts and data.

When creating a bot, start with [xAI's Bot Marketplace](https://x.ai/bot/marketplace), the primary source of truth for current bot templates. Search or browse the closest category, open the closest listing, and inspect its description and shared configuration. If a listing is close, import it as the starting point, then adapt its full configuration to the user's intended job and the operating method above. Create a bot from scratch only when no marketplace template provides a close job shape.

Use xAI's current documentation for [Bots](https://docs.x.ai/grok-bot/bots), [skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations), and [approval boundaries](https://docs.x.ai/grok-bot/approvals-security-and-privacy). Consult the [official Grok Bot guides](https://x.ai/bot/guides) for secondary domain examples.
