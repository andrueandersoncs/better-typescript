export type SearchRequest = {
  readonly query: string;
};

export const hasSearchQuery = (request: SearchRequest): boolean => {
  const query = request.query;
  return query.length > 0;
};

export const createSearchRequest = (query: string): SearchRequest => ({
  query,
});

export const emptySearchRequest = (): SearchRequest => createSearchRequest("");
