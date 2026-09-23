# Semantic lint line-evidence cost research

Status: complete

## Question

What are the cost and latency implications of scanning files in 250-line chunks, asking Jev to identify policy evidence ranges, then judging each policy from that evidence?

## Finding

The design is feasible, but it is not a cheaper form of the current single-Noul workflow by default.

A direct `Choice + Noul` retrieval for every rule and every 250-line chunk has roughly the same request count, cost, and latency as the current implementation on a representative large file. It adds useful line-level evidence and lets a final judgment compare distant regions, but it also adds a sequential stage and hundreds of high-cardinality Choice outputs.

A gated cascade is the better shape:

1. cheaply screen every rule-chunk pair with one Noul;
2. run line-range Choice questions only for retained pairs;
3. make one final Noul judgment per rule from bounded selected evidence.

This wins only when screening is sparse enough. Measure the retained fraction on real files before replacing the current path.

## Jev-compatible evidence selection

Jev does not generate arbitrary `{startLine, endLine}` values. It returns typed `Choice`, `Score`, or `Noul` answers defined by the caller ([TypeSafe primitives](https://docs.typesafe.ai/primitives)).

The practical locator is the official line-search pattern:

- prefix source lines with stable IDs;
- predeclare line or span IDs as Choice options;
- use a Choice distribution to rank them;
- pair it with a Noul that says whether evidence exists at all.

Choice supports at most 255 options. TypeSafe's cookbook searches 218 tagged lines and recommends a two-pass search beyond 255 ([line-by-line search](https://docs.typesafe.ai/cookbooks/semantic_find)). A 250-line chunk therefore fits as 250 single-line options. For ranges, 246 overlapping five-line spans also fit.

Choice probabilities are relative and sum to one. They rank candidates; they do not independently prove that every high-ranked range is relevant. The companion Noul supplies the existence probability. A final policy Noul is still required because evidence relevance is not the same judgment as policy violation.

## Cost model

Let:

- `L` = file lines;
- `K = ceil(L / 250)` = chunks;
- `R` = applicable rules;
- `B_e` = rule evidence questions fitting in one request;
- `B_s` = screening Nouls fitting in one request;
- `p` = retained rule-chunk fraction after screening;
- `B_f` = final rule judgments fitting in one request;
- `C` = concurrent HTTP request limit.

### Speculative retrieval for every pair

Each rule-chunk pair gets a Choice locator and Noul existence check:

```text
retrieval calls = K × ceil(R / B_e)
final calls     = ceil(R / B_f)
```

All retrieval calls can run before the final stage. With average request latencies `t_e` and `t_f`:

```text
wall time ≈ ceil(retrieval calls / C) × t_e
          + ceil(final calls / C) × t_f
```

### Gated retrieval

Every pair first gets only a screening Noul. Line Choices run for retained pairs:

```text
screen calls  = K × ceil(R / B_s)
locator calls ≈ K × ceil(p × R / B_e)
final calls   = ceil(R / B_f)
```

This adds a third sequential stage but removes most high-cardinality Choice work when `p` is low.

### Billing

TypeSafe publishes input pricing of `$0.042 / 1M tokens`; output tokens are free ([Jev launch and pricing](https://typesafe.ai/blog/introducing-system-one-models-and-jev)). Exact cost is:

```text
cost = total response.usage.input_tokens × $0.042 / 1,000,000
```

Output distributions are free in billing, but they still consume response bandwidth, JSON parsing, and service time.

TypeSafe reports a general end-to-end range of 70–500 ms per call, measured mainly from West Coast laptops; it is not an SLA or a high-cardinality Choice guarantee ([Jev launch and pricing](https://typesafe.ai/blog/introducing-system-one-models-and-jev)). No numeric public concurrency quota was found. The API documents `429` rate-limit and `529` overload responses, both requiring backoff ([API errors](https://docs.typesafe.ai/api#errors)).

## Representative repository measurement

Measured locally against `repos/effect/packages/effect/src/Array.ts`:

| Input | Value |
| --- | ---: |
| Lines | 5,000 |
| Source bytes | 144,519 |
| Applicable policies | 91 |
| Current byte windows | 6 |
| Current Noul evaluations | 546 |
| Current HTTP partitions | 434 |
| Current encoded request bytes | 13,720,635 |
| Current concurrency | 8 |

The current plan repeats large window state in nearly every request, because a near-32 KB window leaves little room for policy questions.

A 250-line proposal creates:

```text
20 chunks × 91 policies = 1,820 rule-chunk retrieval pairs
```

Measured JSON payload sizes for predeclared Choice options:

| Locator | Bytes per rule-question | Bytes across 1,820 pairs |
| --- | ---: | ---: |
| 250 single-line IDs | 3,001 | 5.46 MB |
| 246 overlapping five-line span IDs | 4,183 | 7.61 MB |

These figures include only the Choice criteria. They exclude tagged chunk text, policy text, prompts, the existence Noul, request framing, and the final judgment stage.

For this file, a 250-line tagged chunk is roughly 9 KB. Under the 32 KB local request limit, an evidence request will likely fit about 4–6 policies. That implies:

```text
20 × ceil(91 / 4..6) = 320–460 retrieval calls
```

The final stage adds more calls. This is the same order as the current 434 calls, not an order-of-magnitude reduction.

At concurrency 8, 320–460 retrieval calls require 40–58 waves. Applying TypeSafe's published 70–500 ms range gives an illustrative 2.8–29 seconds for retrieval, before final judgment, retries, or rate limiting. The current 434-call plan requires 55 waves, or an illustrative 3.85–27.5 seconds under the same assumption.

Encoded bytes are not token counts. If one assumes 3–4 encoded bytes per input token only for rough planning, the current 13.72 MB plan is approximately 3.43–4.57M tokens, or `$0.144–$0.192`. A direct line-evidence plan is likely in the same broad range after adding its final stage. Only live `usage.input_tokens` can provide a defensible amount.

## Gated-cascade illustration

Illustrative assumptions for the same file:

- `B_s = 25` screening rules per request;
- `B_e = 5` evidence Choices per request;
- `p = 10%` retained rule-chunk pairs;
- 10 final requests;
- concurrency 8.

Then:

```text
screen calls  = 20 × ceil(91 / 25) = 80
locator calls = 20 × ceil(9.1 / 5) = 40
final calls   = 10
total calls   = 130
```

That is 17 request waves across three sequential stages: an illustrative 1.19–8.5 seconds before retries. If `p` rises to 50%, locator calls rise to about 200 and most of the advantage disappears.

The retained fraction is therefore the key economic variable.

## Additional constraints

- **250 lines is not a size bound.** Minified or generated code may have a single line larger than 32 KB. Use 250 lines as a target and retain an exact encoded-byte cap.
- **Add overlap.** Otherwise evidence crossing line 250/251 can disappear. Overlap increases repeated input cost.
- **Bound selected evidence.** Final requests must cap evidence by encoded bytes, not only by range count.
- **Batch by chunk.** TypeSafe's official batching experiment found one 13-question call 12.2× cheaper and 10.0× faster than 13 calls because the document was sent once ([parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions)). One-request-per-rule would discard that advantage.
- **Expect large responses.** A Choice returns every option probability. The representative direct design returns 1,820 distributions over about 250 options: roughly 455,000 probability entries.
- **Keep final judgment distinct.** A relevant range may support compliance rather than prove a violation.

## Recommendation

Adopt line evidence only as a quality and explainability feature, not merely as a 32 KB workaround.

Prototype the gated cascade:

1. target 250 lines, but enforce the 32 KB encoded limit;
2. batch screening Nouls by chunk;
3. retain positive and uncertain pairs using a deliberately low threshold;
4. rank predeclared overlapping spans only for retained pairs;
5. merge adjacent spans and keep a byte-bounded top set per policy;
6. ask one final Noul per policy over evidence from all chunks;
7. record calls, input tokens, latency, retained fraction, and accuracy on representative files.

Keep the current one-stage path for small files until the evidence cascade proves better accuracy at an acceptable retained fraction.