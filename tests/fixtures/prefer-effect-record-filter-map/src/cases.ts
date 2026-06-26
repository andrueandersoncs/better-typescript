export {}

interface SearchParams {
  readonly query: string
  readonly page: number
  readonly expressionType: "both" | "glob" | "regex"
}

const truthyValueAddsField = (params: SearchParams): Record<string, string | number> => ({
  ...(params.query ? { query: params.query } : {})
})

const emptyObjectInTrueBranch = (params: SearchParams): Record<string, string> => ({
  ...(params.expressionType === "both" ? {} : { expressionType: params.expressionType })
})

const parenthesizedConditional = (params: SearchParams): Record<string, number> => ({
  ...((params.page ? { page: params.page } : {}))
})

const multiPropertyBranch = (params: SearchParams): Record<string, string | number> => ({
  ...(
    params.query
      ? { query: params.query, page: params.page }
      : {}
  )
})

void truthyValueAddsField
void emptyObjectInTrueBranch
void parenthesizedConditional
void multiPropertyBranch
