import { HashSet, Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isInAmbientContext } from "./tsNode.js"
import { callSignatureCheck, hasCallSignature, isVoidType } from "./tsType.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-callbacks"

type CallbackStyleDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.CallSignatureDeclaration
  | ts.FunctionTypeNode

const isCallbackStyleCandidate = (
  node: ts.Node
): node is CallbackStyleDeclaration => {
  const isFunctionOrExpression =
    ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
  const isArrowOrMethod =
    ts.isArrowFunction(node) || ts.isMethodDeclaration(node)
  const isSignature =
    ts.isMethodSignature(node) || ts.isCallSignatureDeclaration(node)
  const isFunctionOrArrow = isFunctionOrExpression || isArrowOrMethod
  const isDirectCallbackKind = isFunctionOrArrow || isSignature

  if (!ts.isFunctionTypeNode(node)) {
    return isDirectCallbackKind
  }

  const typeNode = effectiveCallableTypeNode(node)
  const parent = typeNode.parent
  const isValueDeclaration =
    ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent)

  if (isValueDeclaration) {
    const isTypeAnnotation = parent.type === typeNode
    const initializer = Option.fromNullable(parent.initializer)

    const isNotRuntimeFunction = !Option.exists(
      initializer,
      isRuntimeFunctionLike
    )

    return isTypeAnnotation && isNotRuntimeFunction
  }

  const aliasDeclaration = Option.liftPredicate(ts.isTypeAliasDeclaration)(
    parent
  )
  const hasTypeAliasFunctionType = Option.exists(
    aliasDeclaration,
    isTypeOfAlias(typeNode)
  )
  const propertySignature = Option.liftPredicate(ts.isPropertySignature)(parent)
  const hasPropertySignatureFunctionType = Option.exists(
    propertySignature,
    isTypeOfPropertySignature(typeNode)
  )

  return hasTypeAliasFunctionType || hasPropertySignatureFunctionType
}

const transparentTypeNodeKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedType,
  ts.SyntaxKind.UnionType,
  ts.SyntaxKind.IntersectionType
)

const effectiveCallableTypeNode = (typeNode: ts.TypeNode): ts.TypeNode =>
  HashSet.has(transparentTypeNodeKinds, typeNode.parent.kind)
    ? effectiveCallableTypeNode(typeNode.parent as ts.TypeNode)
    : typeNode

const isRuntimeFunctionLike = (node: ts.Expression): boolean =>
  ts.isFunctionExpression(node) || ts.isArrowFunction(node)

const isTypeOfAlias =
  (typeNode: ts.TypeNode) =>
  (parent: ts.TypeAliasDeclaration): boolean =>
    parent.type === typeNode

const isTypeOfPropertySignature =
  (typeNode: ts.TypeNode) =>
  (parent: ts.PropertySignature): boolean =>
    parent.type === typeNode

const isFunctionArgument =
  (checker: ts.TypeChecker) =>
  (parameter: ts.ParameterDeclaration): boolean => {
    const parameterType = checker.getTypeAtLocation(parameter)
    const parameterHasCallSignature = hasCallSignature(checker)(parameterType)
    const restToken = Option.fromNullable(parameter.dotDotDotToken)

    if (Option.isNone(restToken)) {
      return parameterHasCallSignature
    }

    const indexType = checker.getIndexTypeOfType(
      parameterType,
      ts.IndexKind.Number
    )
    const elementType = Option.fromNullable(indexType)
    const elementHasCallSignature = Option.exists(
      elementType,
      callSignatureCheck(checker)
    )

    return [parameterHasCallSignature, elementHasCallSignature].some(Boolean)
  }

const isCallbackSignature =
  (context: RuleContext) =>
  (declaration: CallbackStyleDeclaration) =>
  (signature: ts.Signature): boolean => {
    const returnType = context.checker.getReturnTypeOfSignature(signature)
    const returnsVoid = isVoidType(returnType)
    const hasFunctionArgument = declaration.parameters.some(
      isFunctionArgument(context.checker)
    )

    return returnsVoid && hasFunctionArgument
  }

const callbackStyleMatches =
  (context: RuleContext) =>
  (declaration: CallbackStyleDeclaration): ReadonlyArray<RuleMatch> => {
    // A declare statement mirrors a third-party API's existing shape; there is no Effect-returning alternative to describe.
    if (isInAmbientContext(declaration)) {
      return []
    }

    const declaredSignature =
      context.checker.getSignatureFromDeclaration(declaration)
    const signature = Option.fromNullable(declaredSignature)
    const isCallback = Option.exists(
      signature,
      isCallbackSignature(context)(declaration)
    )

    return isCallback
      ? [
          createRuleMatch(context)({
            ruleId,
            node: declaration,
            message:
              "Avoid callback-style functions that accept a function argument and return void.",
            hint:
              "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
              "own API as an Effect-returning function from the start. Ambient declarations " +
              "(declare statements) describing a third-party API are permitted."
          })
        ]
      : []
  }

const check = onNode([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType
])(isCallbackStyleCandidate)(callbackStyleMatches)

const badExample = new ExampleSnippet({
  filePath: "src/events.ts",
  code: `interface Message {
  readonly data: string
}

interface MessageSocket {
  addEventListener(event: "message", handler: (msg: Message) => void): MessageSocket
}

declare const socket: MessageSocket

export const onMessage = (handler: (msg: Message) => void): void => {
  socket.addEventListener("message", handler)
}`
})

const goodOneShot = new ExampleSnippet({
  filePath: "src/events.ts",
  code: `import { Effect } from "effect"

interface Message {
  readonly data: string
}

interface MessageSocket {
  addEventListener(event: "message", handler: (msg: Message) => void): MessageSocket
}

declare const socket: MessageSocket

type MessageListener = (msg: Message) => void

type MessageResume = (effect: Effect.Effect<Message>) => void

const resumeWithMessage =
  (resume: MessageResume): MessageListener =>
  (msg) => {
    const succeeded = Effect.succeed(msg)
    resume(succeeded)
  }

// One-shot: resolves on the first event, then the Effect completes.
export const onMessage = Effect.async<Message>((resume) => {
  socket.addEventListener("message", resumeWithMessage(resume))

  return Effect.void
})`
})

const goodStream = new ExampleSnippet({
  filePath: "src/messages.ts",
  code: `import { Effect, Stream, StreamEmit } from "effect"

interface Message {
  readonly data: string
}

interface MessageSocket {
  addEventListener(event: "message", handler: (msg: Message) => void): MessageSocket
}

declare const socket: MessageSocket

type MessageListener = (msg: Message) => void

type MessageEmit = StreamEmit.Emit<never, never, Message, void>

const emitMessage =
  (emit: MessageEmit): MessageListener =>
  (msg) => {
    void emit.single(msg)
  }

// Streaming: emits every event until the scope is closed.
export const messages = Stream.async<Message>((emit) => {
  socket.addEventListener("message", emitMessage(emit))

  return Effect.void
})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodOneShot, goodStream]
})

export const noCallbacks = new Rule({
  id: ruleId,
  description:
    "Disallow callback-style functions returning void in favor of Effect.",
  example,
  check
})
