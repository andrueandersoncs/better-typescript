---
name: choose-agent-training
description: Choose context, retrieval, code, or parameter training to close a measured agent capability gap.
---

# Choose Agent Training

Route the gap to the medium that can represent it most directly. Change parameters only after context, retrieval, tools, and code have been tested as simpler levers.

## Decision sequence

1. Reproduce the gap on an independent evaluation set and attribute its first cause.
2. Route by representation:
   - Dynamic, cited, permissioned, or deletable facts: RAG.
   - Language-expressible strategy: prompt, examples, or skill.
   - Deterministic process or hard constraint: code.
   - Missing stable domain representation or foundational capability: mid-training.
   - Unstable output format, protocol, style, or demonstrated behavior: SFT.
   - Explicit preferred and rejected behaviors: preference training.
   - Expensive sparse feedback with a stronger teacher: on-policy distillation.
   - Scoreable trajectories with meaningful reward variation and room to explore: RL.
3. Measure parse success, `pass@1`, `pass@k`, partial progress, and reward variance.
4. If `pass@k` is near zero, repair capability, curriculum, or reachable partial signals before RL.
5. If successes exist but outputs cannot be scored reliably, stabilize the protocol before RL.
6. Build data from verified tasks and trajectories. Keep bad trajectories as negative, preference, or boundary evidence.
7. For RL, build a resettable, parallel, realistic environment with a deterministic verifier and isolated evaluation tasks.
8. Begin with outcome reward. Add deterministic path penalties or reachable progress only when they restore useful variation.
9. Run a small experiment, inspect retention and reward hacking, then scale only if the premise holds.

## Training checks

- Keep sampler and trainer revisions, tokenizers, templates, adapters, and log probabilities aligned.
- Mask environment-return tokens from policy gradients in tool trajectories.
- Preserve retention sets for general capability and safety.
- Calibrate simulators with real interactions; simulator bias limits the learned policy.
- Under Goodhart's Law, a stronger optimizer finds reward loopholes faster. Verify the real final state with hidden checks.

Source: *Building AI Agents*, Chapter 8, “Agent Post-Training.”
