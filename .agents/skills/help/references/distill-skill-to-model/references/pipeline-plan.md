## Recommendation

Build a **behavioral-distillation pipeline that produces one LoRA adapter per skill**.

Do not train a model from scratch or fine-tune directly on `SKILL.md`. The Markdown describes a policy; training data must show that policy successfully operating.

```text
Skill package
  → behavior contract + sealed evals
  → teacher executes skill with real tools
  → verified trajectories
  → remove SKILL.md from student context
  → QLoRA adapter
  → paired evaluation against original skill
```

The result remains a system:

- **Weights:** stable decisions and workflow.
- **Runtime:** tools, scripts, references, assets, parsers, and sandbox.
- **Router:** uses the [shared contextual routing procedure](../../skill-routers/references/canonical-design.md) to select and load the skill's adapter.

Use [software-laws](../../software-laws/SKILL.md) to weigh simplicity, measurement incentives, and evidence for generated behavior.

## Existing evidence

The closest direct research is the June 2026 [Skill-to-LoRA](https://arxiv.org/abs/2606.16769) preprint. It:

- Generated demonstrations with the complete skill.
- Removed the skill text from student inputs.
- Trained one QLoRA adapter per skill.
- Dynamically loaded that adapter during inference.

On its selected 210-task SWE-Skills-Bench subset:

| Configuration | Solved |
|---|---:|
| No skill | 59/210 |
| Full `SKILL.md` | 54/210 |
| Skill-specific LoRA | 65/210 |

It reports a 5.2 percentage-point improvement over full-skill prompting and 6.6% lower per-step token cost.

Important limitation: this was same-model adaptation on a 27B model, with ten tasks per skill and no reported confidence intervals. It supports the adapter pattern, but does not prove that strong-teacher-to-4B distillation will work.

## Pipeline

### 1. Compile the complete skill package and pin its runtime

Use the shared [behavioral comparison method](../../agent-systems/references/evaluate-agents/references/comparison-method.md) to record the exact source package and runtime manifest for generation, evaluation, and deployment. The skill package includes `SKILL.md`, referenced instructions, scripts, assets, tool definitions and implementations, and runtime dependencies.

Extract the behavior contract:

- when the skill applies;
- decisions it changes;
- required actions and tools;
- observable outputs;
- proof of completion.

Keep deterministic scripts, large references, mutable knowledge, and tool implementations external. Only the stable decision policy belongs in weights.

### 2. Build LoRA-specific evals before training

Use the shared comparison method for isolated fixtures, family-level development/acceptance splits, and matched runs. In addition, create these sealed LoRA suites:

**Trigger suite**

- Context-sensitive cases whose gathered evidence supports the skill's behavior contract and should load its adapter.
- Nearby cases that use similar wording but whose context supports another contract or no adapter.
- Measure context-sensitive routing precision and recall, and confirm each selected adapter receives the original request and relevant runtime context.

**Behavior suite**

- Realistic tasks requiring meaningful skill decisions.
- Executable expected states or artifacts.
- A small general-capability retention set.

### 3. Establish the LoRA comparison matrix

Use the shared method's no-skill baseline and matched-run controls for every arm:

| Arm | Configuration | Question answered |
|---|---|---|
| T0 | Capable teacher, no skill | Teacher baseline |
| T1 | Same teacher + complete skill | Original skill behavior |
| S0 | Small base model, no skill | Small-model baseline |
| S1 | Small base + complete skill | Is prompting already sufficient? |
| S2 | Trained adapter, no skill body | Target system |
| C2 | Control adapter trained from labels generated without the skill | Did skill conditioning add value? |

`T1 - T0` is diagnostic, not a gate. Keep development-control results separate from acceptance release evidence. Skill-to-LoRA found `T1 < T0` in aggregate while its adapter improved results; training can remove prompt interference.

### 4. Generate verified trajectories

Use the strongest available teacher with the full skill package inside the pinned runtime.

For each training-only task:

1. Execute the actual workflow.
2. Capture assistant messages, tool calls, tool results, artifacts, and final state.
3. Validate tool-call syntax.
4. Execute tools rather than accepting claimed execution.
5. Check semantic and final-state correctness.
6. Retain only successful trajectories.
7. Deduplicate and reject train/eval near-matches.
8. Human-audit a random sample.

This layered verification is supported by [APIGen](https://arxiv.org/abs/2406.18518) and large-scale [Skill-Use Training](https://arxiv.org/abs/2608.02287).

Do not use hidden or free-form chain-of-thought as correctness evidence.

### 5. Produce skill-free training records

For every assistant decision, create one record containing the complete observable prefix:

```text
system
user
assistant tool call
tool result
assistant tool call
tool result
...
next assistant action ← sole training completion
```

Rules:

- Remove the teacher-only `SKILL.md` payload.
- Retain exact tool definitions.
- Preserve causal ordering: tool call before tool result.
- Train on assistant tokens only.
- Render every record through the pinned model chat template.
- Reject records without exactly one non-empty assistant loss span.

### 6. Train

Start with:

- **Base:** [`Qwen/Qwen3-4B-Instruct-2507`](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507)
- **Method:** QLoRA
- **Runtime:** [MLX-LM](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md)
- **Artifact:** one independent adapter per skill
- **Selection:** behavioral dev score, not training loss

The model is 4B, Apache-2.0, non-thinking, tool-capable, and MLX-supported. Apple reports 3.35GB q4 inference memory on a 64GB M4 Max for a narrow 2,048-prompt/128-generation benchmark ([benchmark](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/BENCHMARKS.md)); that is not a training-memory guarantee.

Train nested verified-data subsets and graph behavior score. Do not assume a universal example count.

If the student reaches states missing from teacher data:

1. Run the student.
2. Capture those states.
3. Ask teacher+skill for corrected continuations.
4. Verify them.
5. Remove the skill payload.
6. Continue ordinary SFT.

This is simpler and more compatible than introducing an on-policy distillation system.

## Scoring

Prefer objective outcomes:

- filesystem or database state;
- parsers and schemas;
- executable tests;
- required structured fields;
- tool execution success.

This matches state-oriented agent evaluation in [τ-bench](https://arxiv.org/abs/2406.12045) and [ToolSandbox](https://arxiv.org/abs/2408.04682).

Use LLM judges only for subjective quality. Blind model identity, swap answer order, and calibrate against human labels because judges exhibit position, verbosity, and self-preference biases ([MT-Bench study](https://arxiv.org/abs/2306.05685)).

Report:

- task success by behavior category;
- trigger precision/recall;
- invalid tool-call rate;
- repeated-run reliability;
- p50/p95 latency;
- input/output tokens;
- peak memory;
- general retention.

Analyze paired task differences with 95% family-clustered confidence intervals. Pairing and clustering avoid false precision ([Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640)).

## Release gates

Apply the shared comparison method's sealed matched acceptance protocol to every release contrast with predeclared margins and 95% family-clustered confidence intervals. Release only when:

1. **Adaptation worked:** lower confidence bound of `S2 - S0` is above zero.
2. **Skill mattered:** lower confidence bound of sealed `S2 - C2` is above zero. Keep development-control results as separate diagnostics, never release evidence.
3. **Weights beat prompting:** `S2` beats `S1`, or is quality-non-inferior while clearing a predeclared token or latency improvement.
4. **Model replaces the original skill:** `S2` is non-inferior to `T1` within a predeclared margin and improves deployment cost.
5. **Quality truly improved, if required:** lower confidence bound of `S2 - T1` is above zero.
6. **No hidden regression:** every core behavior category and retention suite remains within its declared margin.

Do not combine quality, latency, and cost into one weighted score. Report the trade-off directly.

**Bottom line:** the credible first implementation is a Qwen3-4B skill-specific QLoRA adapter trained from verified, skill-conditioned executions, while retaining the skill’s executable dependencies externally. The sealed `T1` versus `S2` comparison determines whether the custom model genuinely improves on the original `SKILL.md` system.
