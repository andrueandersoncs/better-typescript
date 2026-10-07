export type SearchResult = {
  readonly label: string;
};

export const displaySearchLabel = (
  result: SearchResult | undefined,
  fallbackLabel: string,
): string => {
  const label = result?.label;
  const isMissingLabel = label === undefined || label === "";
  return isMissingLabel ? fallbackLabel : label;
};

export const createSearchResult = (label: string): SearchResult => ({
  label,
});

export const emptySearchResult = (): SearchResult => createSearchResult("");
