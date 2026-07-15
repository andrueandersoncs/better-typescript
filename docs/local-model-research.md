# Local model research for Better TypeScript

Date: 2026-07-13

## Decision

A local model is feasible, but it should not replace deterministic AST and type analysis.

Recommended shape:

1. Deterministic checks produce high-recall candidates and stable evidence from one TypeScript
   program snapshot.
2. A small local model judges only the ambiguous candidates or selects among authored remediations.
3. The model returns a grammar-constrained enum-shaped decision, not locations, rule identity, or
   free-form hints.
4. The renderer produces `Detection` or `Advice` from deterministic data plus that decision.
5. The exact model, quantization, prompt, and result are content-addressed and cached.

Start with an evaluation, not a bundled model. Compare a compact classifier/retriever against
0.5B–1.5B generative models on Better TypeScript's own ambiguous cases. Bundle or download weights
only after one option wins on held-out repositories.

## Why this fits the current pipeline

Current code has a useful seam already:

- `Check` consumes the snapshotted AST stream and emits exact `Detection` evidence.
- The runner materializes all checks into a complete `Signal[]` before `derive` runs.
- `derive` is already the place where multiple signals become file-, directory-, or project-level
  `Advice`.
- `Detection.data` can carry a stable, typed candidate payload captured from the same source
  snapshot. This avoids rereading a file after the watch program has advanced.

The dangerous integration is unconstrained generated prose:

- Detection deduplication includes `message` and `hint`.
- Local report identity includes check name, message, and hint.
- Advice text changes re-emit a block in watch mode.

A generated hint can therefore turn harmless wording variation into output churn or a changed report
identity. Keep visible prose authored and stable. Let the model select a verdict, rationale code,
evidence ids, or remediation id.

The model-backed module should have one small internal interface, conceptually:

```ts
type TasteDecision = {
  readonly outcome: "recommend" | "abstain"
  readonly rationale: RationaleCode
  readonly remediation: RemediationId
  readonly evidence: ReadonlyArray<EvidenceId>
}

judge(cases: ReadonlyArray<TasteCase>): Effect<ReadonlyArray<TasteDecision>, ModelError>
```

Do not add model/runtime concepts to the core check interface until the experiment proves that they
earn that surface. A check can wrap deterministic candidate generation with this judge; aggregate
use cases can call it from `derive`.

## Runtime options

| Runtime                                                                       | Verified strengths                                                                                                                                                                                                                                                                               | Fit                                                                                                                          | Risks                                                                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [`node-llama-cpp`](https://github.com/withcatai/node-llama-cpp)               | In-process Node ESM binding over llama.cpp; prebuilt macOS, Linux, and Windows binaries; Metal, CUDA, and Vulkan; CPU fallback; GGUF; JSON-schema grammar; embedding and reranking. Its downloader can resolve a pinned model into a local directory, and its tests exercise GGUF LoRA adapters. | Best first generative prototype. It satisfies “no separate service” and can constrain the decision at token-generation time. | Native/platform packaging, cold model load, and a large matrix of hardware backends. A missing prebuild can fall back to a local CMake build. |
| [`@huggingface/transformers`](https://github.com/huggingface/transformers.js) | Official Node 18+ ESM support; text-classification and feature-extraction pipelines; local-only model paths; remote loading can be disabled; ONNX artifacts can expose fp32/fp16/q8/q4 variants.                                                                                                 | Best first classifier or embedding/retrieval prototype.                                                                      | Quantized artifacts and supported operators vary by model. The official docs do not describe llama.cpp-style grammar-constrained generation.  |
| Direct `llama.cpp` child process                                              | Local GGUF inference and broad hardware support without a daemon.                                                                                                                                                                                                                                | Useful fallback if native-addon distribution becomes the blocker.                                                            | Process lifecycle and serialization are more machinery than an in-process adapter and do not improve model quality.                           |

Primary runtime sources:

- [`node-llama-cpp` features and platform binaries](https://github.com/withcatai/node-llama-cpp#readme)
- [`node-llama-cpp` JSON-schema grammar](https://node-llama-cpp.withcat.ai/guide/grammar)
- [`node-llama-cpp` local model resolution/downloading](https://node-llama-cpp.withcat.ai/guide/downloading-models)
- [`node-llama-cpp` LoRA adapter test](https://github.com/withcatai/node-llama-cpp/blob/master/test/modelDependent/llama3/lora.test.ts)
- [`llama.cpp` hardware backends and quantization](https://github.com/ggml-org/llama.cpp#description)
- [Transformers.js server-side Node guide](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/tutorials/node.md)
- [Transformers.js quantized dtype guide](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/guides/dtypes.md)

## Generative model shortlist

These are candidates for a bakeoff, not a quality ranking. Public coding benchmarks do not measure
Better TypeScript's taste judgments.

| Model                                                                                              | Verified facts                                                                                            | Published artifact                                                                                                   | Assessment                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Qwen2.5-Coder-0.5B-Instruct-GGUF`](https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF) | 0.49B parameters, code-specific, 32,768-token GGUF context, Apache-2.0.                                   | Official Q4_K_M GGUF is 491,400,064 bytes.                                                                           | Smallest serious baseline. It must earn its place on the actual task; size alone is not evidence that it can make reliable architectural judgments.                                            |
| [`Qwen2.5-Coder-1.5B-Instruct-GGUF`](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF) | 1.54B parameters, code-specific, 32,768-token GGUF context, Apache-2.0.                                   | Official Q4_K_M GGUF is 1,117,320,768 bytes.                                                                         | Recommended generative quality baseline. Still small enough for local CPU/Metal testing, but already a roughly 1.12 GB weight artifact before runtime memory and cache.                        |
| [`Granite-4.0-1B`](https://huggingface.co/ibm-granite/granite-4.0-1b)                              | Apache-2.0; IBM lists text classification, code tasks, FIM, and specialized fine-tuning as intended uses. | [Official GGUF repository](https://huggingface.co/ibm-granite/granite-4.0-1b-GGUF) has a 974,984,960-byte Q4_0 file. | Useful alternative architecture. The official GGUF card warns of precision errors for variants with smaller numerical ranges, so the exact quantization requires task and hardware validation. |

A newer general model is not automatically a better choice than a code-specific older model. The
shipped artifact must be selected by the Better TypeScript evaluation, including its exact
quantization.

## Smaller non-generative alternatives

The ambiguous parts should be separated before choosing a model:

| Need                                                   | Prefer first                                                        | Why                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| “Should this candidate be reported?”                   | A deterministic feature model, compact cross-encoder, or classifier | Binary/enum output; smaller artifact; easier calibration; no generated prose.                                             |
| “Which known remediation fits?”                        | Retrieval over accepted/rejected examples, then an enum selection   | Reuses authored examples and keeps hints stable.                                                                          |
| “Write a project-specific explanation”                 | Generative model after verdict and evidence are fixed               | This is where generation adds capability rather than replacing static analysis.                                           |
| “Does this abstraction match this repository's taste?” | Project policy/examples plus the calling coding agent               | Taste is repository-specific. A universal bundled fine-tune otherwise encodes one maintainer's policy as if it were fact. |

[`microsoft/unixcoder-base`](https://huggingface.co/microsoft/unixcoder-base) is an Apache-2.0 code
representation model trained over code, comments, and AST information, and is a plausible
retrieval/encoder research baseline. Its official model card is PyTorch-oriented; a production Node
path would still require a verified ONNX export and benchmark. Transformers.js itself demonstrates
in-process Node text classification and local-only loading, so a purpose-trained ONNX classifier is
operationally viable even if UniXcoder is not the final artifact.

For several existing checks, a plain model over deterministic features may be enough. For example, a
single-use-callee judgment can use function size, call-site distance, lexical role, closure state,
type complexity, test references, and module position. That model can be kilobytes or megabytes,
deterministic, and directly inspectable. It needs the same labels a fine-tuned LLM would need.

## Distribution

Do not place model weights in the core npm tarball initially.

- The smallest shortlisted Q4 artifact is about 491 MB; the stronger baseline is about 1.12 GB.
- Runtime code, weights, prompts, and fine-tuned adapters have different update and rollback
  cadences.
- A content-addressed user cache permits one download, offline reuse, checksums, and side-by-side
  model versions without turning every CLI update into a weight transfer.
- An explicit `better-typescript model install`-style operation is less surprising than a large
  `postinstall` download.
- Air-gapped users can receive a separate offline bundle containing the same pinned artifact and
  manifest.

This still runs wholly on the user's machine. The download is artifact distribution, not an
inference service.

Pin at least:

- model repository and immutable revision;
- exact file and SHA-256;
- model license and required notices;
- runtime version/backend;
- prompt/schema version;
- adapter hash, if any.

## Determinism and safety contract

Greedy decoding, a fixed seed, and grammar-constrained JSON reduce output variation. They are not a
sufficient product contract across model/runtime/backend upgrades.

Use a persistent result key over:

```text
model hash + adapter hash + runtime/backend + prompt/schema version + canonical candidate input
```

Validate every result against a closed schema. The model should have no tools and no filesystem
access. Treat comments, strings, and identifiers in source code as untrusted prompt content. Return
evidence ids into a deterministic evidence set rather than accepting model-invented paths or facts.

[INFERENCE] Floating-point and kernel differences can still change a token choice near a decision
boundary. The cross-platform repeatability test must use each supported backend, and cached
validated decisions should provide restart stability.

Failure must not look like a clean run. Missing weights, unsupported hardware, invalid output, and
inference timeout should produce an explicit operational result or fail the opted-in model-backed
check; silently emitting no advice creates a false negative.

## Fine-tuning path

Fine-tuning is viable, but it should follow the benchmark:

1. Record ambiguous candidates with accepted/rejected judgments, rationale code, selected
   remediation, and the deterministic evidence available at decision time.
2. Split by repository, not random snippet, to prevent near-duplicate project conventions leaking
   into evaluation.
3. Establish deterministic heuristic, retrieval, classifier, and prompted generative baselines.
4. Fine-tune only if the prompted model has enough base capability and the remaining errors are
   learnable policy errors.
5. Quantize after tuning and rerun the whole evaluation on the artifact that will ship.

[Qwen's official training documentation](https://qwen.readthedocs.io/en/latest/training/llama_factory.html)
supports full fine-tuning, LoRA, Q-LoRA, and DoRA for Qwen2.5. `node-llama-cpp` can load a GGUF LoRA
adapter at context creation, so an adapter can remain separate from the pinned base model. This
reduces update size, not the base-model footprint.

Use supervised fine-tuning for closed structured decisions first. Preference optimization only
becomes justified when there is a reviewed pairwise corpus for alternative advice. Free-form
rationales should not be the training target unless they are also evaluated for factual grounding.

## Evaluation gate

Build this before choosing the dependency:

- ambiguous positives and hard negatives from current fixtures and real repositories;
- at least one “valid exception” family per taste-sensitive check;
- held-out repositories;
- mandatory precision, abstention, and regression metrics per check;
- repeated-run equality for the same pinned input;
- cold load, warm latency, peak resident memory, and install size on macOS arm64 plus every intended
  support platform;
- prompt-injection cases embedded in comments and string literals;
- exact output identity/watch behavior.

Because Better TypeScript presents reported detections as work to fix, optimize accepted-result
precision before recall. An uncertain model should abstain into an explicitly non-clean state rather
than fabricate confidence.

## Recommendation

1. Keep deterministic AST/type checks as the source of locations and evidence.
2. Prototype two private adapters against one labeled corpus:
   - Transformers.js plus a compact classifier/retriever;
   - node-llama-cpp plus Qwen2.5-Coder 0.5B and 1.5B Q4_K_M.
3. Use the model first in aggregate advice or remediation selection, where the existing `derive`
   seam already fits and model failure cannot rewrite local source facts.
4. Keep messages, titles, and hint/remediation templates authored. Let the model return only closed
   decisions and evidence references.
5. Ship the winning model as an explicit, pinned local artifact in a content-addressed cache; offer
   a separate offline bundle.
6. Fine-tune with LoRA only after the baseline evaluation shows a stable gap that labeled Better
   TypeScript examples can close.

The local LLM idea is sound as a narrow adjudicator. It is not the default best solution for every
taste problem, and putting free-running generation directly inside checks would weaken the
determinism, identity, and watch guarantees the current pipeline already has.
