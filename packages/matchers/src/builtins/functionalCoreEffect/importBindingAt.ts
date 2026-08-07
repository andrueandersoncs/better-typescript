import { Array, Function, Option, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { isProjectFile } from "../../support/isProjectFile.js"
import { ImportedMember } from "./importedMember.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"
import { bindingFromDeclaration } from "./bindingFromDeclaration.js"
import { declarationHasBinding } from "./declarationHasBinding.js"
import { moduleDeclarationAncestor } from "./moduleDeclarationAncestor.js"

const maximumBarrelDepth = 8

const someOf = (symbol: ts.Symbol) => {
  const declarations = declarationsOfSymbol(symbol)

  return Array.some(
    declarations,
    flow((candidate: ts.Declaration) => candidate.getSourceFile(), isProjectFile)
  )
}

const pipeOf2 = (symbol: ts.Symbol) =>
  pipe(declarationsOfSymbol(symbol), Array.findFirst(declarationHasBinding))

const resolvedBarrelBinding = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  binding: ImportedMember,
  depth: number
): ImportedMember => {
  const depthExhausted = strictEqual(0)(depth)
  const pathExhausted = strictEqual(0)(binding.path.length)
  const exhausted = depthExhausted || pathExhausted

  if (exhausted) {
    return binding
  }

  const pipeOf = (moduleDeclaration: ts.ImportDeclaration | ts.ExportDeclaration) =>
    pipe(
      Option.fromNullishOr(moduleDeclaration.moduleSpecifier),
      Option.flatMap(
        flow(
          (moduleSpecifier) => checker.getSymbolAtLocation(moduleSpecifier),
          Option.fromNullishOr
        )
      )
    )

  const moduleSymbol = pipe(moduleDeclarationAncestor(declaration), Option.flatMap(pipeOf))
  const firstPartyModule = pipe(moduleSymbol, Option.exists(someOf))
  const missingModule = Option.isNone(moduleSymbol)
  const externalModule = !firstPartyModule
  const keepBinding = externalModule || missingModule

  if (keepBinding) {
    return binding
  }

  const pathHead = Array.head(binding.path)
  const importedName = pipe(pathHead, Option.getOrElse(Function.constant("")))
  const symbolNamed = flow(Struct.get<ts.Symbol, "name">("name"), strictEqual(importedName))

  const next = pipe(
    checker.getExportsOfModule(moduleSymbol.value),
    Array.findFirst(symbolNamed),
    Option.flatMap(pipeOf2),
    Option.flatMap((candidate) => {
      const makeOf = (candidateBinding: ImportedMember) => Tuple.make(candidate, candidateBinding)
      return pipe(bindingFromDeclaration(candidate), Option.map(makeOf))
    })
  )

  if (Option.isNone(next)) {
    return binding
  }

  const [nextDeclaration, nextBinding] = next.value
  const remainingPath = Array.drop(binding.path, 1)
  const path = Array.appendAll(nextBinding.path, remainingPath)

  const completeNextBinding = new ImportedMember({
    moduleSpecifier: nextBinding.moduleSpecifier,
    path
  })

  return resolvedBarrelBinding(checker, nextDeclaration, completeNextBinding, depth - 1)
}

const importBindingAt = (
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  members: ReadonlyArray<string>
) => {
  const pipeOf3 = (declaration: ts.Declaration) =>
    pipe(
      bindingFromDeclaration(declaration),
      Option.map((binding) => {
        const path = Array.appendAll(binding.path, members)

        const completeBinding = new ImportedMember({
          moduleSpecifier: binding.moduleSpecifier,
          path
        })

        return resolvedBarrelBinding(checker, declaration, completeBinding, maximumBarrelDepth)
      })
    )

  return pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.flatMap(Array.findFirst(declarationHasBinding)),
    Option.flatMap(pipeOf3)
  )
}

export const importedMemberFromPath = (
  checker: ts.TypeChecker,
  path: readonly [ts.Identifier, ReadonlyArray<string>]
) => {
  const root = Tuple.get(path, 0)
  const members = Tuple.get(path, 1)

  return importBindingAt(checker, root, members)
}
