# Clef provider for semantic lint

Status: deferred. Semantic lint stays Jev-only with local credentials (decided 2026-10-14). Facts checked 2026-10-14.

## Findings

- Clef (`@cf/cloudflare/clef`, 27B) and Clef-flash (`@cf/cloudflare/clef-flash`, 9B) run on Workers AI. AI Gateway routes them. [model page](https://developers.cloudflare.com/ai/models/%40cf/cloudflare/clef/), [changelog](https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/), [AI Gateway Workers AI](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/).
- Clef uses the System One API, like Jev: `state` + `questions` (`noul`) in, and `answers[id].noul` + `usage` out. The request takes `model: "clef" | "clef-flash"`.
- Live probe through herd's gateway (`$AI_GATEWAY_URL/workers-ai/@cf/cloudflare/clef` with `cf-aig-authorization`): `401`, Cloudflare error `10000`. The gateway passed the request, but Workers AI wants a Cloudflare API token with **Workers AI Read**. Herd has no such token.
- Limits that differ from Jev:
  - At most **64 questions** per request. Today 70 of 141 selection requests for `packages/auth` carry 65–80 questions.
  - 65,536-token context. Clef **truncates** long text state silently instead of failing. Our 64,000-byte request cap stays well below that limit.
  - Errors use the Cloudflare envelope (`{result, success, errors}`). Successful responses probably use it too; step 1 confirms this.
- Price: $0.24 per million input tokens, no output charge.
- Cloudflare reports median latency of 209 ms (Clef) and 39 ms (Clef-flash), against 524 ms for Jev.
- Our prompts were tuned on Jev, so Clef quality on them is unknown until we run evals.

## Steps

1. **Credential (human).** Create a Cloudflare API token with Account → Workers AI → Read in herd's account. Store it in Infisical as `CLOUDFLARE_API_TOKEN`. Repeat the probe and record the success response shape.
2. **Client.** Add a Cloudflare evaluator beside `typeSafeClient` behind the existing `evaluator` interface (`internal/semanticlint/typesafe.go`).
   - The model name picks the backend: `clef` and `clef-flash` go to Cloudflare, everything else goes to TypeSafe. There is no `--provider` flag.
   - URL: `CLOUDFLARE_AI_GATEWAY_URL` + `/workers-ai/@cf/cloudflare/<model>`.
   - Headers: `Authorization: Bearer $CLOUDFLARE_API_TOKEN`, plus `cf-aig-authorization` when `CLOUDFLARE_AI_GATEWAY_TOKEN` is set.
   - Unwrap `result`, then reuse `validateResponse`. Reuse the retry and backoff code as it is.
   - Settings come from the environment or `.env`, as for TypeSafe.
3. **Batching.** Make the question cap depend on the model: 64 for Clef, unchanged for Jev. Apply it where selection and evidence batches are packed (`batch.go`). `--dry-run` must report the split partitions.
4. **Evals.** Run the existing live eval splits (`ext-dev`, `ext-test`) on `jev-latest`, `clef`, and `clef-flash`. Compare recall, precision, latency, and tokens.
   - Check whether the 0.55 and 0.70 thresholds still fit Clef. If not, make them depend on the model, based on eval data only.
   - Keep `jev-latest` as the default unless Clef wins on `ext-test`.
5. **Docs.** Update `docs/semantic-lint.md` (model choice, Cloudflare settings, 64-question cap, the fact that requests go to Cloudflare) and `skills/better-typescript/SKILL.md`.
6. **Herd.** Add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_GATEWAY_URL`, and `CLOUDFLARE_AI_GATEWAY_TOKEN` to the `semantic-lint` fnox profile, mapped from the existing `AI_GATEWAY_URL` and `AI_GATEWAY_TOKEN`. Run `bun run semantic-lint -- --model clef`.

## Tests

- The model name selects the backend and the URL. Missing Cloudflare settings fail before any request.
- The Cloudflare envelope unwraps correctly. `success: false` and `errors` surface as exit `2`.
- No Clef request carries more than 64 questions. Jev batches stay unchanged.

## Open questions

- With unified billing set for Workers AI, can the gateway token replace the Cloudflare API token? The docs say the Workers AI permission is always required. The step 1 probe settles this.
- Clef-flash may need different thresholds than Clef.
