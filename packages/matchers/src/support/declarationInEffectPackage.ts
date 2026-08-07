import * as ts from "typescript"
import { Array } from "effect"

export const effectPackagePathSegments: ReadonlyArray<string> = Array.make(
  "/node_modules/effect/",
  "/node_modules/@effect/"
)

export const declarationInEffectPackage = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()
  const fileName = sourceFile.fileName.replaceAll("\\", "/")

  return Array.some(effectPackagePathSegments, (segment) => fileName.includes(segment))
}

export const symbolDeclaredInEffectPackage = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  return Array.some(declarations, declarationInEffectPackage)
}
