# External holdout snapshot

Copied 2026-10-10. The first 4 tracked `.ts`/`.tsx` files per project, 800 B–24 KB, in SHA-256 order of `project/path`. Vendored, generated, and dist code excluded. `external-a.txt` holds picks 1–2, `external-b.txt` picks 3–4.

| Project | HEAD |
| --- | --- |
| effect-domains | 222b430 |
| token-double-click | 8542c458 |
| prime-agent | 920016c2 |
| OpenBot | c3dd280 |
| taskr | 9602902 |
| lion | 425c226 |
| sandbox-sdk-effect | 5bca716 |
| open-workflows | 81b0280 |
| mapmaker | 5a2113a |
| effect-redux | 6edc7a2 |
| claude-skill-effect-ts | c7c818d |
| HerdProto | 1ff2114 |
| wintermute-web | f3488b4 |
| task-based-pi | 6fd59aa |
| herd | da4fb6353d |

`external-c.txt` holds picks 5–6 (added after the ext-b check, for the E7 ablation).

`external-d.txt` holds picks 7–10 (2026-10-11), labeled into `ext-test`.

`external-oss.txt` (2026-10-11): first 6 eligible files per MIT-licensed GitHub repo, for the stratified recall study.

| Repo | Commit | License |
| --- | --- | --- |
| colinhacks/zod | 284243fb0d6532665afdc9239188773bb624f73c | MIT |
| honojs/hono | 552ea024250093a48071b3ded9710de4c6e05f14 | MIT |
| trpc/trpc | 796700d8653b3832409fff997e6f5789519b9ea7 | MIT |
| TanStack/query | dee1679bf42cad475a5c5810524475b2ffd6903d | MIT |
| excalidraw/excalidraw | e65eca999e071503efb893d3379a29fb96ff37c4 | MIT |
| immerjs/immer | 8848a5b16938e5681a890d73de7bda24b5080498 | MIT |
| statelyai/xstate | da4c74efa441dd3a4c1d9835c42c3d1f87cdcaba | MIT |
| sindresorhus/ky | 3541888878c4d303a8bc2ad61815f4e048f55a5d | MIT |
