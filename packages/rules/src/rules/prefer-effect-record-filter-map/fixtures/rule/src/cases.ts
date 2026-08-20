export {}

interface SearchParams {
  readonly query: string
  readonly page: number
  readonly expressionType: "both" | "glob" | "regex"
}

const truthyValueAddsField = (
  params: SearchParams
): Record<string, string | number> => ({
  ...(params.query ? { query: params.query } : {}) // ~detect 3
})

const emptyObjectInTrueBranch = (
  params: SearchParams
): Record<string, string> => ({
  ...(params.expressionType === "both" // ~detect 3
    ? {}
    : { expressionType: params.expressionType })
})

const parenthesizedConditional = (
  params: SearchParams
): Record<string, number> => ({
  ...(params.page ? { page: params.page } : {}) // ~detect 3
})

const multiPropertyBranch = (
  params: SearchParams
): Record<string, string | number> => ({
  ...(params.query ? { query: params.query, page: params.page } : {}) // ~detect 3
})

void truthyValueAddsField
void emptyObjectInTrueBranch
void parenthesizedConditional
void multiPropertyBranch
