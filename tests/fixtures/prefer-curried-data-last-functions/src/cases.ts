export const combineValues = (left: number, right: number): number => // ~detect 30
  left + right

export const collectValues = (...values: number[]): number => values.length // ~detect 30

export const multiplyValues = function (left: number, right: number): number { // ~detect 31
  return left * right
}

export const clampRange =
  (min: number, max: number) => // ~detect 3
  (value: number): number =>
    Math.min(max, Math.max(min, value))

type RuleOutput = { readonly ok: true }
type RuleContext = { readonly sourceFile: string }
type ClassDeclaration = { readonly kind: "class" }

declare const nodeCheck: <N>(
  handler: (node: N, context: RuleContext) => ReadonlyArray<RuleOutput>
) => void

const ruleStyleMatches = ( // ~detect 26
  node: ClassDeclaration,
  context: RuleContext
): ReadonlyArray<RuleOutput> => [{ ok: true }]

nodeCheck(ruleStyleMatches)
