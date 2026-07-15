import * as path from "node:path"
import { Array, Function, flow, pipe } from "effect"
import * as ts from "typescript"
import type { ProgramContext } from "../sources/data.js"
import { Detection, Location } from "../location/data.js"
import {
  Check,
  CheckContext,
  DetectionSource,
  FileHandler,
  FileSubscription,
  NodeHandler,
  NodeSubscription,
  type Subscription
} from "./data.js"

export const nodeSubscription =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  (handler: NodeHandler): Subscription =>
    new NodeSubscription({ kind: "OnNode", kinds, handler })

export const fileSubscription = (handler: FileHandler): Subscription =>
  new FileSubscription({ kind: "OnFile", handler })

export const isNodeSubscription = (subscription: Subscription): subscription is NodeSubscription =>
  subscription.kind === "OnNode"

export const isFileSubscription = (subscription: Subscription): subscription is FileSubscription =>
  subscription.kind === "OnFile"

export const checkFromSubscriptions = (
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
): Check => new Check({ plan })

export const locateNode =
  (context: CheckContext) =>
  (node: ts.Node): Location => {
    const sourceFile = context.sourceFile
    const start = node.getStart(sourceFile)
    const position = sourceFile.getLineAndCharacterOfPosition(start)
    const relative = path.relative(context.projectRoot, sourceFile.fileName)
    const fileName = relative || sourceFile.fileName

    return new Location({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })
  }

export type MakeDetection = (source: DetectionSource) => Detection

export const detection =
  (context: CheckContext) =>
  (source: DetectionSource): Detection => {
    const location = locateNode(context)(source.node)

    return new Detection({
      location,
      message: source.message,
      hint: source.hint,
      data: source.data
    })
  }

export const nodeSubscriptions =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
  ): ReadonlyArray<Subscription> => {
    const wrapped: NodeHandler = (context) => {
      const elements = handler(context)

      const refined = (node: ts.Node): ReadonlyArray<Detection> =>
        refine(node) ? elements(node) : Array.empty()

      return refined
    }

    const subscribe = nodeSubscription(kinds)

    return pipe(wrapped, subscribe, Array.of)
  }

export const fileSubscriptions = (
  handler: (context: CheckContext) => ReadonlyArray<Detection>
): ReadonlyArray<Subscription> => pipe(handler, fileSubscription, Array.of)

export const nodeCheck =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
    flow(nodeSubscriptions(kinds)(refine), Function.constant, checkFromSubscriptions)

export const fileCheck = flow(fileSubscriptions, Function.constant, checkFromSubscriptions)

export const combineAll: (subscriptionGroups: ReadonlyArray<ReadonlyArray<Subscription>>) => Check =
  flow(Array.flatten, Function.constant, checkFromSubscriptions)
