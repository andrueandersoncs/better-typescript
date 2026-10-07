export type SearchRequest = {
  readonly query: string;
};

export const hasSearchQuery = (request: SearchRequest): boolean => {
  return request.query.length > 0;
};

export const createSearchRequest = (query: string): SearchRequest => ({
  query,
});

export const emptySearchRequest = (): SearchRequest => createSearchRequest("");
