import { Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import {
  declarationSourceFile,
  isProjectSourceFile,
  isSameNode,
  outermostTransparentWrapper
} from "./tsNode.js"

export type CallLikeExpression = ts.CallExpression | ts.NewExpression

export const isCallLikeExpression = (
  node: ts.Node
): node is CallLikeExpression =>
  ts.isCallExpression(node) || ts.isNewExpression(node)

export const callArguments = (
  call: CallLikeExpression
): ReadonlyArray<ts.Expression> => call.arguments ?? []

export const resolvedCallSignature =
  (checker: ts.TypeChecker) =>
  (call: CallLikeExpression): Option.Option<ts.Signature> => {
    const signature = checker.getResolvedSignature(call)

    return Option.fromNullable(signature)
  }

const signatureDeclarationIsExternal = (
  declaration: ts.Declaration
): boolean => {
  const sourceFile = declaration.getSourceFile()

  return !isProjectSourceFile(sourceFile)
}

// Missing declarations (untyped code) count as external: the shape is not author-controlled.
export const signatureIsExternal = (signature: ts.Signature): boolean => {
  const declaration = signature.getDeclaration()

  return pipe(
    Option.fromNullable(declaration),
    Option.map(signatureDeclarationIsExternal),
    Option.getOrElse(Function.constant(true))
  )
}

const signatureDeclarationOption = (
  signature: ts.Signature
): Option.Option<ts.Declaration> => {
  const declaration = signature.getDeclaration()

  return Option.fromNullable(declaration)
}

// Missing declarations do NOT grant an escape: escapes require a proven external boundary.
const hasExternalDeclaration = (signature: ts.Signature): boolean =>
  pipe(
    signatureDeclarationOption(signature),
    Option.exists(signatureDeclarationIsExternal)
  )

const isExternalPackageFile =
  (program: ts.Program) =>
  (sourceFile: ts.SourceFile): boolean => {
    const isExternal = !isProjectSourceFile(sourceFile)
    const isDefaultLibrary = program.isSourceFileDefaultLibrary(sourceFile)

    return [isExternal, !isDefaultLibrary].every(Boolean)
  }

const signatureIsExternalPackage =
  (program: ts.Program) =>
  (signature: ts.Signature): boolean =>
    pipe(
      signatureDeclarationOption(signature),
      Option.map(declarationSourceFile),
      Option.exists(isExternalPackageFile(program))
    )

const argumentForwardingKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ArrayLiteralExpression
)

export const argumentConsumingCall = (
  node: ts.Node
): Option.Option<CallLikeExpression> => {
  const parent = node.parent

  if (isCallLikeExpression(parent)) {
    const isArgument = callArguments(parent).some(isSameNode(node))

    return isArgument ? Option.some(parent) : Option.none()
  }

  const isForwarding = HashSet.has(argumentForwardingKinds, parent.kind)

  return isForwarding ? argumentConsumingCall(parent) : Option.none()
}

// node_modules packages excluding the default library: effect combinators qualify, Array.prototype.map does not.
export const isExternalPackageArgument =
  (checker: ts.TypeChecker) =>
  (program: ts.Program) =>
  (node: ts.Node): boolean =>
    pipe(
      argumentConsumingCall(node),
      Option.flatMap(resolvedCallSignature(checker)),
      Option.exists(signatureIsExternalPackage(program))
    )

const isExternalArgumentPosition =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): boolean =>
    pipe(
      argumentConsumingCall(node),
      Option.flatMap(resolvedCallSignature(checker)),
      Option.exists(hasExternalDeclaration)
    )

// ts.forEachChild stops as soon as the callback returns truthy, which is exactly the some() short-circuit.
const someDescendant =
  (predicate: (node: ts.Node) => boolean) =>
  (node: ts.Node): boolean => {
    const findMatch = (candidate: ts.Node): boolean => {
      const childMatch = predicate(candidate)
        ? true
        : ts.forEachChild(candidate, findMatch)

      return childMatch === true
    }

    return findMatch(node)
  }

const isSameSymbol =
  (symbol: ts.Symbol) =>
  (candidate: ts.Symbol): boolean =>
    candidate === symbol

const symbolAtNode =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> => {
    const symbol = checker.getSymbolAtLocation(node)

    return Option.fromNullable(symbol)
  }

const identifierEscapes =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol) =>
  (declarationName: ts.Node) =>
  (node: ts.Identifier): boolean => {
    const isDeclarationName = node === declarationName
    const nodeSymbol = symbolAtNode(checker)(node)
    const refersToSymbol = Option.exists(nodeSymbol, isSameSymbol(symbol))

    return [
      !isDeclarationName,
      refersToSymbol,
      isExternalArgumentPosition(checker)(node)
    ].every(Boolean)
  }

const isEscapingReference =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol) =>
  (declarationName: ts.Node) =>
  (node: ts.Node): boolean =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(node),
      Option.exists(identifierEscapes(checker)(symbol)(declarationName))
    )

const symbolEscapesFrom =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declarationName: ts.Node) =>
  (symbol: ts.Symbol): boolean =>
    someDescendant(isEscapingReference(checker)(symbol)(declarationName))(
      sourceFile
    )

const nameNodeEscapes =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (nameNode: ts.Node): boolean =>
    pipe(
      symbolAtNode(checker)(nameNode),
      Option.exists(symbolEscapesFrom(checker)(sourceFile)(nameNode))
    )

const initializesDeclaration =
  (expression: ts.Expression) =>
  (declaration: ts.VariableDeclaration): boolean =>
    declaration.initializer === expression

// A construction escapes when it is handed to an external signature, directly or through a variable.
export const constructionEscapesExternally =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean => {
    const outermost = outermostTransparentWrapper(expression)
    const isDirectExternalArgument =
      isExternalArgumentPosition(checker)(outermost)
    const sourceFile = expression.getSourceFile()
    const escapesThroughVariable = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(outermost.parent),
      Option.filter(initializesDeclaration(outermost)),
      Option.map(Struct.get("name")),
      Option.exists(nameNodeEscapes(checker)(sourceFile))
    )

    return isDirectExternalArgument || escapesThroughVariable
  }

type EscapeCarrier = ts.VariableDeclaration | ts.ParameterDeclaration

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

const functionDeclarationName = (
  declaration: ts.FunctionDeclaration
): Option.Option<ts.Node> => Option.fromNullable(declaration.name)

const enclosingFunctionEscapes =
  (checker: ts.TypeChecker) =>
  (parameter: ts.ParameterDeclaration): boolean => {
    const enclosing = parameter.parent
    const sourceFile = parameter.getSourceFile()
    const isDirectExternalArgument =
      isExternalArgumentPosition(checker)(enclosing)
    const variableName = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(enclosing.parent),
      Option.map(Struct.get("name"))
    )
    const functionName = pipe(
      Option.liftPredicate(ts.isFunctionDeclaration)(enclosing),
      Option.flatMap(functionDeclarationName)
    )
    const nameNode = pipe(
      variableName,
      Option.orElse(Function.constant(functionName))
    )
    const escapesThroughName = Option.exists(
      nameNode,
      nameNodeEscapes(checker)(sourceFile)
    )

    return isDirectExternalArgument || escapesThroughName
  }

const carrierEscapes =
  (checker: ts.TypeChecker) =>
  (carrier: EscapeCarrier): boolean => {
    if (ts.isParameter(carrier)) {
      return enclosingFunctionEscapes(checker)(carrier)
    }

    const sourceFile = carrier.getSourceFile()

    return nameNodeEscapes(checker)(sourceFile)(carrier.name)
  }

// A written Map/Set type escapes when its carrier (variable or parameter) crosses an external boundary.
export const typeReferenceEscapesExternally =
  (checker: ts.TypeChecker) =>
  (typeRef: ts.TypeReferenceNode): boolean =>
    pipe(escapeCarrier(typeRef), Option.exists(carrierEscapes(checker)))

const effectPackagePathSegments: ReadonlyArray<string> = [
  "/node_modules/effect/",
  "/node_modules/@effect/"
]

const isSegmentOfPath =
  (fileName: string) =>
  (segment: string): boolean =>
    fileName.includes(segment)

const declarationInEffectPackage = (declaration: ts.Declaration): boolean => {
  const sourceFile = declaration.getSourceFile()
  const fileName = sourceFile.fileName.replaceAll("\\", "/")

  return effectPackagePathSegments.some(isSegmentOfPath(fileName))
}

export const symbolDeclaredInEffectPackage = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? []

  return declarations.some(declarationInEffectPackage)
}
