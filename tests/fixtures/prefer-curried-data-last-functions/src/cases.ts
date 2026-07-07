export const combineValues = (left: number, right: number): number =>
  left + right

export const collectValues = (...values: number[]): number => values.length

export const multiplyValues = function (left: number, right: number): number {
  return left * right
}

export const clampRange =
  (min: number, max: number) =>
  (value: number): number =>
    Math.min(max, Math.max(min, value))

type RuleOutput = { readonly ok: true }
type RuleContext = { readonly sourceFile: string }
type ClassDeclaration = { readonly kind: "class" }

declare const nodeCheck: <N>(
  handler: (node: N, context: RuleContext) => ReadonlyArray<RuleOutput>
) => void

const ruleStyleMatches = (
  node: ClassDeclaration,
  context: RuleContext
): ReadonlyArray<RuleOutput> => [{ ok: true }]

nodeCheck(ruleStyleMatches)
