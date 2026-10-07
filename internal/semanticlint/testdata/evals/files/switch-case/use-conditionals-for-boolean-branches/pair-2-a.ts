import * as Match from "effect/Match";

type ExportRequest = {
  fileName: string;
  includeHeaders: boolean;
};

export const headerMode = (request: ExportRequest): string =>
  Match.value(request.includeHeaders).pipe(
    Match.when(true, () => "with headers"),
    Match.when(false, () => "without headers"),
    Match.exhaustive,
  );

export const downloadName = (request: ExportRequest): string => {
  return `${request.fileName}.csv`;
};
