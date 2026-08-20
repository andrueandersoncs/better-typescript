import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

const isTypeScriptNamespace = (node: ts.ModuleDeclaration) => {
  const hasIdentifierName = ts.isIdentifier(node.name)
  const isGlobalAugmentation = (node.flags & ts.NodeFlags.GlobalAugmentation) !== 0
  const checks = Array.make(hasIdentifierName, !isGlobalAugmentation)

  return Array.every(checks, Boolean)
}

const typescriptNamespaceFindings =
  (_context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isModuleDeclaration)(node),
      Option.filter(isTypeScriptNamespace),
      Option.map((declaration) => {
        const subject = ts.isIdentifier(declaration.name)
          ? declaration.name.text
          : declaration.name.getText()

        const targetNode = ts.isIdentifier(declaration.name) ? declaration.name : declaration

        return makeSubjectMatch(subject)(targetNode)
      }),
      Option.toArray
    )

const typescriptNamespacesScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  typescriptNamespaceFindings
)

export const typescriptNamespaces = makeRule("typescript-namespaces")(typescriptNamespacesScanner)(
  fixedRuleMessage(
    "Avoid TypeScript namespaces for Effect module organization.",
    "Export an ES module namespace projection or named values instead."
  )
)
