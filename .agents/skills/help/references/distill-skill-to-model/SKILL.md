---
name: distill-skill-to-model
description: Train a skill-specific LoRA and compare it against the source Agent Skill with sealed evaluations.
metadata:
  internal: true
---

# Distill Skill to Model

Use the complete pipeline and evidence in [`references/pipeline-plan.md`](references/pipeline-plan.md).

## Inputs

The source skill directory, production runtime, teacher model, target small model, deployment objective, and available training environment.

## Method

1. Resolve and hash the complete skill package and one versioned runtime manifest.
2. Extract the skill's measurable decisions, actions, outputs, and completion evidence.
3. Seal trigger, behavior, and retention evaluations before generating training data.
4. Run the baseline and causal-control matrix from the reference plan.
5. Generate teacher executions with the complete skill in the real runtime; retain only verified trajectories.
6. Remove the teacher-only skill payload and serialize one causal, completion-only training record per assistant decision.
7. QLoRA-train one independent adapter for the skill and select checkpoints by behavioral evaluation.
8. Run the paired release contrasts and report quality, reliability, latency, tokens, memory, and retention separately.

Keep tools, scripts, references, assets, parsers, and mutable knowledge in the runtime. Train stable decision behavior, not the Markdown text or hidden chain-of-thought.

## Output

A versioned base-model-plus-adapter artifact, runtime manifest, provenance record, and paired evaluation report comparing the trained system with the original skill system.

## Done

Every release gate in the reference plan passes on the sealed holdout with its predeclared margin and family-clustered confidence interval, and trigger precision and recall clear their predeclared margins. Otherwise, report the failed contrast and do not replace the skill.
