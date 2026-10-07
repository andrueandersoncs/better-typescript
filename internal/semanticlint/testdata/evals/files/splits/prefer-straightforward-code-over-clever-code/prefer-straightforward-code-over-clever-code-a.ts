export type SearchResult = {
  readonly label: string;
};

export const displaySearchLabel = (
  result: SearchResult | undefined,
  fallbackLabel: string,
): string => {
  return result?.label || fallbackLabel;
};

export const createSearchResult = (label: string): SearchResult => ({
  label,
});

export const emptySearchResult = (): SearchResult => createSearchResult("");
