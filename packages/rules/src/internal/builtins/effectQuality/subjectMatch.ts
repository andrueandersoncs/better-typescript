import { Array } from "effect"
import type * as ts from "typescript"
import { makeNodeMatch } from "../../scanner/makeNodeMatch.js"
import type { Match } from "../../scanner/match.js"

export const makeSubjectMatch =
  (subject: string) =>
  (node: ts.Node): Match<string> =>
    makeNodeMatch(node, subject)

export const noSubjectMatches: ReadonlyArray<Match<string>> = Array.empty()
