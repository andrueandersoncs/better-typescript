---
name: software-craft
description: Match software design, implementation, diagnosis, review, verification, release, or single-workflow skill authoring to one specialist.
metadata:
  internal: true
---

# Software Craft

Match the request and available repository, runtime, source, and user-supplied evidence to the workflow that owns its observable result. Domain, technology, scope constraints, and an explicit normal-valid-path constraint are handoff context, not competing owners.

Follow the shared [gather → match → handoff procedure](../skill-routers/references/canonical-design.md).

| Situation pattern | Skill |
| --- | --- |
| A reusable agent skill with one direct workflow must be created, consolidated, or improved. | [`author-agent-skill`](references/author-agent-skill/SKILL.md) |
| A bounded code artifact needs the requested three-stage removal-versus-retention steelman and independent adjudication report. | [`absurd-code-review`](references/absurd-code-review/SKILL.md) |
| Code needs a focused review for symmetry between related concepts, including missing counterpart abstractions or inconsistent API shapes. | [`review-symmetry`](references/review-symmetry/SKILL.md) |
| An Effect v4 outcome needs a human-approved artifact containing executable stories and exact Schemas, Errors, Services, and function signatures before implementation. | [`executable-interactive-plans`](references/executable-interactive-plans/SKILL.md) |
| The requested outcome is agreement on a production Effect Schema domain model through generated examples and behavior-linked properties. | [`effect-schema-brainstorming`](references/effect-schema-brainstorming/SKILL.md) |
| Existing pages, screenshots, video, or interaction references need capturing and translating into an original builder-ready brief. | [`capture-design-reference`](references/capture-design-reference/SKILL.md) |
| The requested result is one integrated software outcome that must be partitioned among at least two genuinely independent work units. | [`coordinate-agents`](references/coordinate-agents/SKILL.md) |
| A browser game or game-system change needs a playable, deterministic, cross-input result. | [`build-web-game`](references/build-web-game/SKILL.md) |
| A Three.js, WebGL, shader, particle, or cinematic-scroll experience needs a purposeful immersive result with a semantic fallback and measured budget. | [`build-immersive-web`](references/build-immersive-web/SKILL.md) |
| The requested outcome is to name, design, implement, optimize, or assess purposeful web or Expo/React Native interface motion. | [`animate-interface`](references/animate-interface/SKILL.md) |
| A production web page, component, design system, interface audit, or visual polish needs a coherent, accessible, responsive interface result rather than a dedicated motion, immersive, game, or reference-capture artifact. | [`design-interface`](references/design-interface/SKILL.md) |
| A trust, authorization, privacy, dependency, secret, or AI-tool boundary needs threat modeling and demonstrated controls. | [`secure-system`](references/secure-system/SKILL.md) |
| The requested result is a selective or durable map of a repository, subsystem, or change surface. | [`map-codebase`](references/map-codebase/SKILL.md) |
| A current external API, standard, dependency, technique, or comparative fact needs primary-source evidence to answer a software decision. | [`research-evidence`](references/research-evidence/SKILL.md) |
| A named design question needs a disposable runnable probe, technical spike, or divergent UI comparison to decide it. | [`prototype-options`](references/prototype-options/SKILL.md) |
| The requester wants to resolve unclear software intent, success conditions, constraints, or a human decision boundary into an accepted outcome. | [`define-work`](references/define-work/SKILL.md) |
| The requested result is a stable domain model, module seam, public API, schema, architecture, or compatibility contract, other than the dedicated Effect Schema or executable Effect-contract artifacts. | [`design-contract`](references/design-contract/SKILL.md) |
| The requested result is a dependency-ordered, evidence-producing implementation plan for an accepted outcome or contract. | [`plan-change`](references/plan-change/SKILL.md) |
| A large, foggy, or issue-driven software program needs a canonical work queue with justified states, blockers, and a claimable ready frontier. | [`manage-work-queue`](references/manage-work-queue/SKILL.md) |
| A reproducible failure, regression, flaky behavior, hang, integration failure, or unexplained slowness needs root-cause diagnosis and a fix. | [`diagnose-problem`](references/diagnose-problem/SKILL.md) |
| A measured performance budget is missed and profiling identifies the owning cost that must improve. | [`optimize-system`](references/optimize-system/SKILL.md) |
| Defined software behavior needs changing or implementing in the repository, including the evidence needed to complete that change. | [`implement-change`](references/implement-change/SKILL.md) |
| A code artifact, branch, pull request, or work in progress needs an independent specification and quality assessment. | [`review-change`](references/review-change/SKILL.md) |
| A software claim needs fresh, claim-specific proof from commands, runtime behavior, or artifact inspection, without a requested code change. | [`verify-change`](references/verify-change/SKILL.md) |
| Completed or candidate software needs integration, conflict resolution, migration, release, deployment, or rollback work to reach its requested delivery state. | [`ship-change`](references/ship-change/SKILL.md) |
| Another person, agent, or future session needs the minimum actionable handoff, questionnaire, explanation repair, learning artifact, or external procedure. | [`transfer-knowledge`](references/transfer-knowledge/SKILL.md) |

## Technical context

- [Effect](references/effect.md), including [Effect DSLs](references/effect-dsl/guide.md)
- [TypeScript](references/write-typescript.md)
- [Swift](references/write-swift.md)
- [Interface design](references/design-interface/SKILL.md), [motion](references/animate-interface/SKILL.md), [immersive web](references/build-immersive-web/SKILL.md), and [web games](references/build-web-game/SKILL.md)
- [Security](references/secure-system/SKILL.md)

See [`references/catalog.md`](references/catalog.md) for component origins and boundaries.