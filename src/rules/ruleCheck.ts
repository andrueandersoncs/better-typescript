import { Array, Function } from "effect"
import type * as ts from "typescript"
import {
  checkFromSubscriptions,
  fileSubscription,
  nodeSubscription
} from "../detectors/rule.js"
import type {
  NodeHandler,
  ProgramContext,
  RuleCheck,
  RuleContext,
  Detection,
  Subscription
} from "../detectors/rule.js"

const refinedHandler =
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<Detection>
  ): NodeHandler =>
  (context) => {
    const elements = handler(context)
    const refined = (node: ts.Node): ReadonlyArray<Detection> =>
      refine(node) ? elements(node) : []

    return refined
  }

export const nodeSubscriptions =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<Detection>
  ): ReadonlyArray<Subscription> => [
    nodeSubscription(kinds)(refinedHandler(refine)(handler))
  ]

export const fileSubscriptions = (
  handler: (context: RuleContext) => ReadonlyArray<Detection>
): ReadonlyArray<Subscription> => [fileSubscription(handler)]

export const nodeCheck =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<Detection>
  ): RuleCheck => {
    const subscriptions = nodeSubscriptions(kinds)(refine)(handler)

    return checkFromSubscriptions(Function.constant(subscriptions))
  }

export const fileCheck = (
  handler: (context: RuleContext) => ReadonlyArray<Detection>
): RuleCheck => {
  const subscriptions = fileSubscriptions(handler)

  return checkFromSubscriptions(Function.constant(subscriptions))
}

export const combineAll = (
  subscriptionGroups: ReadonlyArray<ReadonlyArray<Subscription>>
): RuleCheck => {
  const subscriptions = Array.flatten(subscriptionGroups)

  return checkFromSubscriptions(Function.constant(subscriptions))
}

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): RuleCheck => {
    const plan = (context: ProgramContext): ReadonlyArray<Subscription> => {
      const index = build(context)

      return subscriptions(index)
    }

    return checkFromSubscriptions(plan)
  }
