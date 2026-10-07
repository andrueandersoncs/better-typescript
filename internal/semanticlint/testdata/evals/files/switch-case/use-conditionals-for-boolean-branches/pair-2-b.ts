type ExportRequest = {
  fileName: string;
  includeHeaders: boolean;
};

export const headerMode = (request: ExportRequest): string => {
  if (request.includeHeaders) {
    return "with headers";
  }

  return "without headers";
}

export const downloadName = (request: ExportRequest): string => {
  return `${request.fileName}.csv`;
};
