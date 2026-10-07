type ImportResult = {
  outcome: "accepted" | "skipped" | "rejected";
  rowCount: number;
};

export const importSummary = (result: ImportResult): string => {
  if (result.outcome === "accepted") {
    return `${result.rowCount} rows imported`;
  } else if (result.outcome === "skipped") {
    return "No rows needed importing";
  } else {
    return "The uploaded file was rejected";
  }
};
