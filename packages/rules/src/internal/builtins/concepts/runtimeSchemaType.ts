import { Array } from "effect"
import * as ts from "typescript"

export const runtimeSchemaType =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) => {
    const type = checker.getTypeAtLocation(declaration.name)
    const text = checker.typeToString(type, declaration.name, ts.TypeFormatFlags.NoTruncation)
    const includesSchemaType = text.includes("Schema<")
    const startsWithSchemaNamespace = text.startsWith("Schema.")
    const schemaChecks = Array.make(includesSchemaType, startsWithSchemaNamespace)

    return Array.some(schemaChecks, Boolean)
  }
