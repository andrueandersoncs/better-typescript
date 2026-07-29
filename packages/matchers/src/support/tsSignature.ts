import { Array, Function, HashSet, Option, pipe, Struct } from "effect"
import * as ts from "typescript"
import { isProjectSourceFile } from "../sources/sources.js"
import {
  functionDeclarationName,
  isCallLikeExpression,
  outermostTransparentWrapper,
  type CallLikeExpression
} from "./tsNode.js"
import { strictEqual } from "../equivalence.js"

export const callArguments = (call: CallLikeExpression): ReadonlyArray<ts.Expression> =>
  call.arguments ?? Array.empty()

const valueForwardingKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.NonNullExpression,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment,
  ts.SyntaxKind.SpreadAssignment,
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.SpreadElement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.PostfixUnaryExpression,
  ts.SyntaxKind.AwaitExpression,
  ts.SyntaxKind.YieldExpression,
  ts.SyntaxKind.TypeOfExpression,
  ts.SyntaxKind.VoidExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.TemplateSpan,
  ts.SyntaxKind.TemplateExpression
)

export const consumingCall = (node: ts.Node): Option.Option<CallLikeExpression> => {
  const isCallLike = isCallLikeExpression(node.parent)

  if (isCallLike) {
    return Option.liftPredicate((call: CallLikeExpression) => {
      const args = callArguments(call)

      return Array.some(args, strictEqual(node))
    })(node.parent)
  }

  const isForwarding = HashSet.has(valueForwardingKinds, node.parent.kind)

  return isForwarding ? consumingCall(node.parent) : Option.none()
}

export const calleeText = (sourceFile: ts.SourceFile) => (target: CallLikeExpression) => {
  const text = target.expression.getText(sourceFile)

  return ts.isNewExpression(target) ? `new ${text}` : text
}

export const resolvedCallSignature = (checker: ts.TypeChecker) => (call: CallLikeExpression) =>
  pipe(checker.getResolvedSignature(call), Option.fromNullishOr)

export const signatureDeclarationIsExternal = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()

  return !isProjectSourceFile(sourceFile)
}

// Missing declarations count as external because their shape is not author-controlled.
export const signatureIsExternal = (signature: ts.Signature) =>
  pipe(
    signature.getDeclaration(),
    Option.fromNullishOr,
    Option.map(signatureDeclarationIsExternal),
    Option.getOrElse(Function.constant(true))
  )

export const signatureDeclarationOption = (
  signature: ts.Signature
): Option.Option<ts.Declaration> => pipe(signature.getDeclaration(), Option.fromNullishOr)

// Missing declarations do not grant escape because exemptions need a proven external boundary.
const hasExternalDeclaration = (signature: ts.Signature) =>
  pipe(signatureDeclarationOption(signature), Option.exists(signatureDeclarationIsExternal))

const argumentForwardingKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ArrayLiteralExpression
)

export const argumentConsumingCall = (node: ts.Node): Option.Option<CallLikeExpression> => {
  if (isCallLikeExpression(node.parent)) {
    const args = callArguments(node.parent)
    const isArgument = Array.some(args, strictEqual(node))

    return isArgument ? Option.some(node.parent) : Option.none()
  }

  const isForwarding = HashSet.has(argumentForwardingKinds, node.parent.kind)

  return isForwarding ? argumentConsumingCall(node.parent) : Option.none()
}

// Exclude the default library because only dependency combinators form external callback bounds.
export const isExternalPackageArgument =
  (checker: ts.TypeChecker) => (program: ts.Program) => (node: ts.Node) =>
    pipe(
      argumentConsumingCall(node),
      Option.flatMap(resolvedCallSignature(checker)),
      Option.exists((signature) => {
        const declarationFile = pipe(
          signatureDeclarationOption(signature),
          Option.map((declaration) => declaration.getSourceFile())
        )

        return Option.exists(declarationFile, (sourceFile) => {
          const isExternal = !isProjectSourceFile(sourceFile)
          const isDefaultLibrary = program.isSourceFileDefaultLibrary(sourceFile)
          const ambientConditions = Array.make(isExternal, !isDefaultLibrary)
          return Array.every(ambientConditions, Boolean)
        })
      })
    )

const isExternalArgumentPosition = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    argumentConsumingCall(node),
    Option.flatMap(resolvedCallSignature(checker)),
    Option.exists(hasExternalDeclaration)
  )

const symbolAtNode = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(checker.getSymbolAtLocation(node), Option.fromNullishOr)

const nameNodeEscapes =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (nameNode: ts.Node): boolean =>
    pipe(
      symbolAtNode(checker)(nameNode),
      Option.exists((symbol) => {
        const candidateMatches = (candidate: ts.Node): boolean => {
          const isEscapingReference = pipe(
            Option.liftPredicate(ts.isIdentifier)(candidate),
            Option.exists((identifier) => {
              const isDeclarationName = strictEqual(nameNode)(identifier)
              const nodeSymbol = symbolAtNode(checker)(identifier)
              const isSameSymbol = strictEqual(symbol)
              const refersToSymbol = Option.exists(nodeSymbol, isSameSymbol)
              const isExternalArgument = isExternalArgumentPosition(checker)(identifier)

              const escapeConditions = Array.make(
                !isDeclarationName,
                refersToSymbol,
                isExternalArgument
              )

              return Array.every(escapeConditions, Boolean)
            })
          )

          const childMatch = ts.forEachChild(candidate, candidateMatches)
          const matched = isEscapingReference ? true : childMatch

          return strictEqual(true)(matched)
        }

        return candidateMatches(sourceFile)
      })
    )

// A construction escapes because an external signature receives it directly or through a variable.
export const constructionEscapesExternally =
  (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const outermost = outermostTransparentWrapper(expression)
    const isDirectExternalArgument = isExternalArgumentPosition(checker)(outermost)
    const sourceFile = expression.getSourceFile()

    const escapesThroughVariable = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(outermost.parent),
      Option.filter((declaration) => {
        const initializerIsOutermost = strictEqual(outermost)(declaration.initializer)

        return initializerIsOutermost
      }),
      Option.map(Struct.get("name")),
      Option.exists(nameNodeEscapes(checker)(sourceFile))
    )

    return isDirectExternalArgument || escapesThroughVariable
  }

// EscapeCarrier is shared escape-carrier syntax because var and param checks need one vocabulary.
export type EscapeCarrier = ts.VariableDeclaration | ts.ParameterDeclaration

const isEscapeCarrierNode = (node: ts.Node): node is EscapeCarrier =>
  ts.isVariableDeclaration(node) || ts.isParameter(node)

const escapeCarrier = (node: ts.Node): Option.Option<EscapeCarrier> => {
  if (ts.isSourceFile(node.parent)) {
    return Option.none()
  }

  const carrier = Option.liftPredicate(isEscapeCarrierNode)(node.parent)

  return pipe(
    carrier,
    Option.orElse(() => escapeCarrier(node.parent))
  )
}

// A written Map or Set type escapes because its carrier crosses an external boundary.
export const typeReferenceEscapesExternally =
  (checker: ts.TypeChecker) => (typeRef: ts.TypeReferenceNode) =>
    pipe(
      escapeCarrier(typeRef),
      Option.exists((carrier) => {
        if (ts.isParameter(carrier)) {
          const sourceFile = carrier.getSourceFile()
          const isDirectExternalArgument = isExternalArgumentPosition(checker)(carrier.parent)

          const variableName = pipe(
            Option.liftPredicate(ts.isVariableDeclaration)(carrier.parent.parent),
            Option.map(Struct.get("name"))
          )

          const functionName = pipe(
            Option.liftPredicate(ts.isFunctionDeclaration)(carrier.parent),
            Option.flatMap(functionDeclarationName)
          )

          const nameNode = pipe(variableName, Option.orElse(Function.constant(functionName)))
          const escapesThroughName = Option.exists(nameNode, nameNodeEscapes(checker)(sourceFile))

          return isDirectExternalArgument || escapesThroughName
        }

        const sourceFile = carrier.getSourceFile()

        return nameNodeEscapes(checker)(sourceFile)(carrier.name)
      })
    )

const effectPackagePathSegments: ReadonlyArray<string> = Array.make(
  "/node_modules/effect/",
  "/node_modules/@effect/"
)

const declarationInEffectPackage = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()
  const fileName = sourceFile.fileName.replaceAll("\\", "/")

  return Array.some(effectPackagePathSegments, (segment) => fileName.includes(segment))
}

export const symbolDeclaredInEffectPackage = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  return Array.some(declarations, declarationInEffectPackage)
}

export const isEffectInterfaceSymbol = (symbol: ts.Symbol) => {
  const isNamedEffect = strictEqual("Effect")(symbol.name)
  const fromEffect = symbolDeclaredInEffectPackage(symbol)
  const checks = Array.make(isNamedEffect, fromEffect)

  return Array.every(checks, Boolean)
}
