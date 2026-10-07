import * as Match from "effect/Match";

type ImportResult = {
  outcome: "accepted" | "skipped" | "rejected";
  rowCount: number;
};

export const importSummary = (result: ImportResult): string =>
  Match.value(result.outcome).pipe(
    Match.when("accepted", () => `${result.rowCount} rows imported`),
    Match.when("skipped", () => "No rows needed importing"),
    Match.when("rejected", () => "The uploaded file was rejected"),
    Match.exhaustive,
  );
