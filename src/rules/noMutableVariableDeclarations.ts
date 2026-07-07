import { HashMap, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

type MutableVariableDeclarationKind = "let" | "var"

const mutableKeywordKinds: HashMap.HashMap<
  ts.SyntaxKind,
  MutableVariableDeclarationKind
> = HashMap.make(
  [ts.SyntaxKind.LetKeyword, "let"] as const,
  [ts.SyntaxKind.VarKeyword, "var"] as const
)

const tokenMutableKind = (
  firstToken: ts.Node
): Option.Option<MutableVariableDeclarationKind> =>
  HashMap.get(mutableKeywordKinds, firstToken.kind)

const mutableDeclarationDetection =
  (match: MakeDetection) =>
  (declarationList: ts.VariableDeclarationList) =>
  (kind: MutableVariableDeclarationKind): Detection =>
    match({
      node: declarationList,
      message: `Avoid declaring mutable variables with ${kind}.`,
      hint:
        "Declare multiple const values to represent each state instead of mutating a single " +
        "variable, and use immutable values that are not reassigned. When the value must " +
        "genuinely evolve over time (a module-level counter, a cell shared across " +
        "closures), hold it in a Ref inside the Effect runtime instead of a let binding."
    })

// The context stage runs once per file, so both partials below are shared by every VariableDeclarationList the report wiring feeds to matches.
const mutableDeclarationMatches = (context: RuleContext) => {
  const sourceFile = context.sourceFile
  const ruleMatch = mutableDeclarationDetection(detection(context))

  const matches = (
    declarationList: ts.VariableDeclarationList
  ): ReadonlyArray<Detection> => {
    const firstToken = declarationList.getFirstToken(sourceFile)

    return pipe(
      Option.fromNullable(firstToken),
      Option.flatMap(tokenMutableKind),
      Option.map(ruleMatch(declarationList)),
      Option.toArray
    )
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.VariableDeclarationList])(
  ts.isVariableDeclarationList
)(mutableDeclarationMatches)

export const noMutableVariableDeclarations: RuleCheck = check
