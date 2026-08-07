import { Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { serviceMethodFinding } from "./serviceMethodFinding2.js"

import { serviceMethodSubject } from "./serviceMethodSubject.js"

const propertyEvidenceNode = (property: ts.ObjectLiteralElementLike) =>
  pipe(Option.fromNullishOr(property.name), Option.getOrElse(Function.constant(property)))

export const serviceMethodFindingForName =
  (serviceName: string) => (property: ts.ObjectLiteralElementLike) => (name: string) => {
    const subject = serviceMethodSubject(serviceName)(name)
    const evidence = propertyEvidenceNode(property)

    return serviceMethodFinding(subject)(evidence)
  }
