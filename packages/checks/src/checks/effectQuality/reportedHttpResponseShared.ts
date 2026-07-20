import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { foldAst } from "@better-typescript/core/engine/sources"
import { importedMemberAt, type ImportedMember } from "../functionalCoreEffect/support.js"
import { unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"
import { roleForSourceFile, type EffectQualityIndex } from "./index.js"
import { isAdapterRole } from "./architectureRoles.js"
import { memberLastName } from "./importedMembers.js"

export const schemaDecodeNames = Array.make(
  "decodeUnknown",
  "decodeUnknownEffect",
  "decodeUnknownSync",
  "decodeUnknownOption",
  "decodeUnknownEither",
  "decodeUnknownResult",
  "decodeUnknownExit",
  "decodeUnknownPromise",
  "decode",
  "decodeEffect",
  "decodeSync",
  "decodeOption",
  "decodeEither",
  "decodeResult",
  "decodeExit",
  "decodePromise"
)

const httpResponseSchemaNames = Array.make("schemaBodyJson", "schemaJson", "schemaNoBody")

const httpNamespaceNames = Array.make(
  "HttpClient",
  "HttpClientResponse",
  "HttpClientRequest",
  "FetchHttpClient"
)

export const sourceHasAdapterRole = (index: EffectQualityIndex) => (sourceFile: ts.SourceFile) =>
  pipe(roleForSourceFile(index, sourceFile), Option.exists(isAdapterRole))

const moduleIsEffectHttp = (moduleSpecifier: string) => {
  const exactUnstable = moduleSpecifier === "effect/unstable/http"
  const nestedUnstable = moduleSpecifier.startsWith("effect/unstable/http/")
  const platformExact = moduleSpecifier === "@effect/platform"
  const platformNested = moduleSpecifier.startsWith("@effect/platform/")
  const effectHttpNested = moduleSpecifier.startsWith("effect/Http")

  const flags = Array.make(
    exactUnstable,
    nestedUnstable,
    platformExact,
    platformNested,
    effectHttpNested
  )

  return Array.some(flags, Boolean)
}

const moduleIsEffectSchema = (moduleSpecifier: string) => {
  const fromBarrel = moduleSpecifier === "effect"
  const fromSchema = moduleSpecifier === "effect/Schema"
  const fromSchemaNested = moduleSpecifier.startsWith("effect/Schema/")
  const flags = Array.make(fromBarrel, fromSchema, fromSchemaNested)

  return Array.some(flags, Boolean)
}

const segmentIsHttpNamespace = (segment: string) => Array.contains(httpNamespaceNames, segment)

const pathMatchesHttpNamespaceApi = (path: ReadonlyArray<string>) => {
  const hasNamespace = Array.some(path, segmentIsHttpNamespace)
  const singleMemberPath = path.length === 1
  const pathFlags = Array.make(hasNamespace, singleMemberPath)

  return Array.some(pathFlags, Boolean)
}

const barrelPathMatchesHttpNamespace = (path: ReadonlyArray<string>) => {
  const path0 = Array.get(path, 0)
  const path1 = Array.get(path, 1)
  const path2 = Array.get(path, 2)
  const barrelNamespace = pipe(path0, Option.exists(segmentIsHttpNamespace))
  const unstableNamespace = pipe(path2, Option.exists(segmentIsHttpNamespace))
  const hasUnstable = pipe(path0, Option.contains("unstable"))
  const hasHttp = pipe(path1, Option.contains("http"))
  const unstablePathFlags = Array.make(hasUnstable, hasHttp, unstableNamespace)
  const unstablePath = Array.every(unstablePathFlags, Boolean)
  const barrelFlags = Array.make(barrelNamespace, unstablePath)

  return Array.some(barrelFlags, Boolean)
}

export const memberIsHttpNamespaceApi =
  (names: ReadonlyArray<string>) => (member: ImportedMember) => {
    const last = memberLastName(member)
    const nameMatches = Array.contains(names, last)
    const fromHttpModule = moduleIsEffectHttp(member.moduleSpecifier)
    const fromEffectBarrel = member.moduleSpecifier === "effect"
    const moduleOkFlags = Array.make(fromHttpModule, fromEffectBarrel)
    const moduleOk = Array.some(moduleOkFlags, Boolean)
    const nonEffectBarrel = member.moduleSpecifier !== "effect"
    const nonEffectHttpFlags = Array.make(fromHttpModule, nonEffectBarrel)
    const nonEffectHttpModule = Array.every(nonEffectHttpFlags, Boolean)

    const pathMatches = nonEffectHttpModule
      ? pathMatchesHttpNamespaceApi(member.path)
      : barrelPathMatchesHttpNamespace(member.path)

    const flags = Array.make(nameMatches, moduleOk, pathMatches)

    return Array.every(flags, Boolean)
  }

const memberIsSchemaDecodeApi = (member: ImportedMember) => {
  const schemaModule = moduleIsEffectSchema(member.moduleSpecifier)
  const last = memberLastName(member)
  const nameMatches = Array.contains(schemaDecodeNames, last)
  const fromEffectBarrel = member.moduleSpecifier === "effect"
  const schemaPathHead = Array.get(member.path, 0)
  const barrelSchemaPath = pipe(schemaPathHead, Option.contains("Schema"))
  const pathOk = fromEffectBarrel ? barrelSchemaPath : true
  const flags = Array.make(schemaModule, nameMatches, pathOk)

  return Array.every(flags, Boolean)
}

export const callIsImportedApi =
  (predicate: (member: ImportedMember) => boolean) =>
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)
    const callee = unwrapCallee(unwrapped)
    const member = importedMemberAt(checker, callee)

    return Option.exists(member, predicate)
  }

export const callIsSchemaDecode = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsSchemaDecodeApi)(checker)(call.expression)

export const callIsHttpResponseSchema = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsHttpNamespaceApi(httpResponseSchemaNames))(checker)(call.expression)

const bodyContainsAny =
  (predicate: (node: ts.Node) => boolean) => (found: boolean, current: ts.Node) =>
    found || predicate(current)

export const functionBodyContains =
  (predicate: (node: ts.Node) => boolean) => (body: ts.ConciseBody) => {
    const step = bodyContainsAny(predicate)
    const scan = Function.flip(foldAst(step))(false)

    return scan(body)
  }
