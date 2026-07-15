import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { isSameNode, outermostTransparentWrapper } from "./tsNode.js"
import { isCallLikeExpression, type CallLikeExpression } from "./tsNode.js"

export type { CallLikeExpression }
export { isCallLikeExpression }

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
  const parent = node.parent
  const isCallLike = isCallLikeExpression(parent)

  if (isCallLike) {
    return Option.liftPredicate((call: CallLikeExpression) => {
      const args = callArguments(call)

      return Array.some(args, isSameNode(node))
    })(parent)
  }

  const isForwarding = HashSet.has(valueForwardingKinds, node.parent.kind)

  return isForwarding ? consumingCall(node.parent) : Option.none()
}

export const calleeText =
  (sourceFile: ts.SourceFile) =>
  (target: CallLikeExpression): string => {
    const text = target.expression.getText(sourceFile)

    return ts.isNewExpression(target) ? `new ${text}` : text
  }

export const resolvedCallSignature =
  (checker: ts.TypeChecker) =>
  (call: CallLikeExpression): Option.Option<ts.Signature> =>
    pipe(checker.getResolvedSignature(call), Option.fromNullable)

const signatureDeclarationIsExternal = (declaration: ts.Declaration): boolean => {
  const sourceFile = declaration.getSourceFile()

  return !isProjectSourceFile(sourceFile)
}

// Missing declarations count as external because their shape is not author-controlled.
export const signatureIsExternal = (signature: ts.Signature): boolean =>
  pipe(
    signature.getDeclaration(),
    Option.fromNullable,
    Option.map(signatureDeclarationIsExternal),
    Option.getOrElse(Function.constant(true))
  )

const signatureDeclarationOption = (signature: ts.Signature): Option.Option<ts.Declaration> =>
  pipe(signature.getDeclaration(), Option.fromNullable)

// Missing declarations do not grant an escape because exemptions require a proven external boundary.
const hasExternalDeclaration = (signature: ts.Signature): boolean =>
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
  const parent = node.parent

  if (isCallLikeExpression(parent)) {
    const args = callArguments(parent)
    const isArgument = Array.some(args, isSameNode(node))

    return isArgument ? Option.some(parent) : Option.none()
  }

  const isForwarding = HashSet.has(argumentForwardingKinds, parent.kind)

  return isForwarding ? argumentConsumingCall(parent) : Option.none()
}

// Exclude the default library because only dependency combinators form an external callback boundary.
export const isExternalPackageArgument =
  (checker: ts.TypeChecker) =>
  (program: ts.Program) =>
  (node: ts.Node): boolean =>
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

const isExternalArgumentPosition =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): boolean =>
    pipe(
      argumentConsumingCall(node),
      Option.flatMap(resolvedCallSignature(checker)),
      Option.exists(hasExternalDeclaration)
    )

const symbolAtNode =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> =>
    pipe(checker.getSymbolAtLocation(node), Option.fromNullable)

const nameNodeEscapes =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (nameNode: ts.Node): boolean =>
    pipe(
      symbolAtNode(checker)(nameNode),
      Option.exists((symbol) => {
        const findMatch = (candidate: ts.Node): boolean => {
          const isEscapingReference = pipe(
            Option.liftPredicate(ts.isIdentifier)(candidate),
            Option.exists((identifier) => {
              const isDeclarationName = identifier === nameNode
              const nodeSymbol = symbolAtNode(checker)(identifier)

              const refersToSymbol = Option.exists(
                nodeSymbol,
                (candidateSymbol) => candidateSymbol === symbol
              )

              const isExternalArgument = isExternalArgumentPosition(checker)(identifier)

              const escapeConditions = Array.make(
                !isDeclarationName,
                refersToSymbol,
                isExternalArgument
              )

              return Array.every(escapeConditions, Boolean)
            })
          )

          const childMatch = isEscapingReference ? true : ts.forEachChild(candidate, findMatch)

          return childMatch === true
        }

        return findMatch(sourceFile)
      })
    )

// A construction escapes because an external signature receives it directly or through a variable.
export const constructionEscapesExternally =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean => {
    const outermost = outermostTransparentWrapper(expression)
    const isDirectExternalArgument = isExternalArgumentPosition(checker)(outermost)
    const sourceFile = expression.getSourceFile()

    const escapesThroughVariable = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(outermost.parent),
      Option.filter((declaration) => declaration.initializer === outermost),
      Option.map(Struct.get("name")),
      Option.exists(nameNodeEscapes(checker)(sourceFile))
    )

    return isDirectExternalArgument || escapesThroughVariable
  }

/**
 * EscapeCarrier is the syntax contract shared by external-escape carrier
 * detection and matching.
 *
 * @remarks
 *   It remains explicit because variable and parameter declarations need one
 *   compiler-node vocabulary; removing it would duplicate the union and let
 *   their accepted declarations drift.
 * @modelRole shared
 */
export type EscapeCarrier = ts.VariableDeclaration | ts.ParameterDeclaration

const isEscapeCarrierNode = (node: ts.Node): node is EscapeCarrier =>
  ts.isVariableDeclaration(node) || ts.isParameter(node)

const escapeCarrier = (node: ts.Node): Option.Option<EscapeCarrier> => {
  const parent = node.parent

  if (ts.isSourceFile(parent)) {
    return Option.none()
  }

  const carrier = Option.liftPredicate(isEscapeCarrierNode)(parent)

  return pipe(
    carrier,
    Option.orElse(() => escapeCarrier(parent))
  )
}

const functionDeclarationName = (declaration: ts.FunctionDeclaration): Option.Option<ts.Node> =>
  Option.fromNullable(declaration.name)

// A written Map or Set type escapes because its carrier crosses an external boundary.
export const typeReferenceEscapesExternally =
  (checker: ts.TypeChecker) =>
  (typeRef: ts.TypeReferenceNode): boolean =>
    pipe(
      escapeCarrier(typeRef),
      Option.exists((carrier) => {
        if (ts.isParameter(carrier)) {
          const enclosing = carrier.parent
          const sourceFile = carrier.getSourceFile()
          const isDirectExternalArgument = isExternalArgumentPosition(checker)(enclosing)

          const variableName = pipe(
            Option.liftPredicate(ts.isVariableDeclaration)(enclosing.parent),
            Option.map(Struct.get("name"))
          )

          const functionName = pipe(
            Option.liftPredicate(ts.isFunctionDeclaration)(enclosing),
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

const declarationInEffectPackage = (declaration: ts.Declaration): boolean => {
  const sourceFile = declaration.getSourceFile()
  const fileName = sourceFile.fileName.replaceAll("\\", "/")

  return Array.some(effectPackagePathSegments, (segment) => fileName.includes(segment))
}

export const symbolDeclaredInEffectPackage = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  return Array.some(declarations, declarationInEffectPackage)
}
