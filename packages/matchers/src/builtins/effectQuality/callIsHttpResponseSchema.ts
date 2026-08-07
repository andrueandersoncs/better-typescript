import { Array } from "effect"

import * as ts from "typescript"

import { callIsImportedApi } from "./callIsImportedApi.js"

import { memberIsHttpNamespaceApi } from "./memberIsHttpNamespaceApi.js"

const httpResponseSchemaNames = Array.make("schemaBodyJson", "schemaJson", "schemaNoBody")

export const callIsHttpResponseSchema = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsHttpNamespaceApi(httpResponseSchemaNames))(checker)(call.expression)
