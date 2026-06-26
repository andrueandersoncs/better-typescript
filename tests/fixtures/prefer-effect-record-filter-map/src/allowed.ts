export {}

interface SearchParams {
  readonly query: string
  readonly page: number
  readonly expressionType: "both" | "glob" | "regex"
}

const unconditionalSpread = (params: SearchParams): Record<string, string> => {
  const existing = { query: params.query }
  return {
    ...existing
  }
}

const optionalObject = (params: SearchParams): Record<string, string> =>
  params.query ? { query: params.query } : {}

const choosesBetweenPopulatedObjects = (params: SearchParams): Record<string, string> => ({
  ...(
    params.expressionType === "both"
      ? { mode: params.expressionType }
      : { expressionType: params.expressionType }
  )
})

const choosesObjectVariable = (params: SearchParams): Record<string, string> => {
  const existing = { query: params.query }
  return {
    ...(params.query ? existing : {})
  }
}

void unconditionalSpread
void optionalObject
void choosesBetweenPopulatedObjects
void choosesObjectVariable
