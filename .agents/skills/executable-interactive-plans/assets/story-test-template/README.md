# Story-test review template

Copy this directory to the executable-plan destination.

Change:

1. `src/plan-data.ts` — ordered stories, story-test inventory, and proposed-code inventory.
2. `src/story-tests/*` — one editable `@effect/vitest` Arbitrary test per item.
3. `src/domain/*` — exact proposed Schemas, Errors, Services, and Effectful function signatures.
4. `src/styles.css` — optional theme tokens.

Keep `src/review-shell.tsx` and `review-server.ts` as shared review infrastructure unless the target repository owns equivalent code.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4174/`.
