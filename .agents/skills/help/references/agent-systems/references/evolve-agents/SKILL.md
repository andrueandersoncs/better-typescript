---
name: evolve-agents
description: Improve agents from verified production trajectories through reviewed, versioned changes.
---

# Evolve Agents

Preserving experience is not learning. Learning requires evaluating outcomes, comparing trajectories, generalizing a candidate change, and proving transfer without regression.

## Closed loop

1. Record immutable trajectories, environment state, versions, user feedback, and verifier results during online work.
2. Verify each run at three levels:
   - Outcome: did the environment reach the goal?
   - Process: were rules, permissions, and required steps followed?
   - Quality: did the result meet an evidence-based rubric?
3. Attribute the first meaningful success or failure cause with evidence and confidence.
4. Compare multiple related trajectories. Treat reflections as candidate hypotheses.
5. Route each candidate to its natural carrier:
   - Knowledge for facts, experience patterns, exceptions, and sources.
   - Prompt or skill for scoped language-expressible judgment and procedure.
   - Program or harness for deterministic repetition, validation, routing, and constraints.
   - Parameters for high-dimensional perception, style, or implicit policy.
6. Propose a local versioned diff with provenance and a rollback path.
7. Validate on the triggering boundary set, unseen transfer tasks, retention tasks, safety checks, and cost.
8. Release gradually. Measure whether the artifact is discovered, activated, followed, and beneficial.
9. Consolidate offline: merge duplicates, resolve conflicts, expire stale claims, prune unused artifacts, and rebuild indexes.
10. For open-ended work with ambiguous or delayed outcomes, keep people responsible for problem definition, evaluation criteria, anomalous evidence, and stop decisions.

## Trusted boundary

- Keep evidence separate from instructions.
- Keep candidates outside production until approved.
- Let an independent reviewer compare candidates with raw evidence.
- Keep validators, release thresholds, audit logs, and stable backups outside the agent's modification authority.
- Retain negative results and rejected paths with the same provenance as successes.

Begin with local artifact changes. Gall's Law favors growing an effective system from a small working loop. Goodhart's Law requires measuring transfer, retention, and safety alongside the target gain.

Source: *Building AI Agents*, Chapter 9, “Continual Evolution of Agents.”
