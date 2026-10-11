// A `/review`-style workflow: parallel multi-dimension review of a changeset, filtered by adversarial refutation.
import { Effect, Schema, pipe } from "effect";
import { agent, gen, parallel, retry, step, verify, workflow } from "@open-workflows/core";
import type { Workflow } from "@open-workflows/core";
import { keepConfirmed } from "./verification.js";

/** One review finding. Shared shape across every dimension so they merge cleanly. */
const reviewDimension = Schema.Literal("correctness", "security", "performance");
const reviewSeverity = Schema.Literal("low", "med", "high");

export const ReviewFinding = Schema.Struct({
  file: Schema.String,
  line: Schema.Number,
  dimension: reviewDimension,
  issue: Schema.String,
  severity: reviewSeverity,
});
export type ReviewFinding = Schema.Schema.Type<typeof ReviewFinding>;

const ReviewFindingArray = Schema.Array(ReviewFinding);
const ReviewChangesPayload = Schema.Struct({ ref: Schema.String });
type ReviewChangesPayload = Schema.Schema.Type<typeof ReviewChangesPayload>;

/** The review dimensions, each its own independent lens over the same diff. */
const DIMENSIONS = [
  { key: "correctness", focus: "logic errors, off-by-one, unhandled cases, broken invariants" },
  { key: "security", focus: "injection, auth gaps, unsafe deserialization, leaked secrets" },
  { key: "performance", focus: "N+1 queries, needless allocation, blocking I/O on hot paths" },
] as const;
type Dimension = (typeof DIMENSIONS)[number];

const reviewRetry = retry({ times: 2, schedule: "exponential" });

/** Pretend to enumerate the changed files in a diff. */
const changedFiles = Effect.fn("changedFiles")(function* (ref: string) {
  const files = [`${ref}:src/api/handler.ts`, `${ref}:src/db/query.ts`];
  return files;
});

const reviewDimensionFor =
  (fileList: string) =>
  (dimension: Dimension): Workflow<ReadonlyArray<ReviewFinding>> => {
    const prompt =
      `You are reviewing a code change for ${dimension.key} issues ` +
      `(focus: ${dimension.focus}). Files: ${fileList}. ` +
      `Return findings as a JSON array conforming to the schema.`;
    const review = agent("review", {
      prompt,
      schema: ReviewFindingArray,
    });
    return pipe(review, reviewRetry);
  };

const reviewChangesBody = ({ ref }: ReviewChangesPayload): Workflow<ReadonlyArray<ReviewFinding>> =>
  gen(function* () {
    const collectDiff = changedFiles(ref);
    const files = yield* step<string[]>("collect-diff", collectDiff);
    const fileList = files.join(", ");

    const reviewForFileList = reviewDimensionFor(fileList);
    const reviewWorkflows = DIMENSIONS.map(reviewForFileList);
    const perDimension = yield* parallel(reviewWorkflows);

    const merged = perDimension.flat();
    return yield* verify(merged, {
      refuters: 2,
      keepIf: keepConfirmed,
    });
  });

/**
 * review-changes: gather the diff, run every review dimension as a parallel barrier, merge
 * the findings, then keep those that survive refutation. Because `parallel` is reified, the
 * graph draws one arm per dimension and the live overlay lights each as it completes
 * (DESIGN.md §6); the `verify` node shows confirmed/refuted verdicts at run time.
 */
export const reviewChanges = workflow(
  "review-changes",
  {
    payload: ReviewChangesPayload,
    success: ReviewFindingArray,
  },
  reviewChangesBody
);
