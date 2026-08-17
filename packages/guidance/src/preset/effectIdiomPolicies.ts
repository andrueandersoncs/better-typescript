import { Array, Function, pipe, Match as EffectMatch, Option } from "effect"
import * as path from "node:path"
import type { Guidance } from "@better-typescript/core/engine/policy/guidance"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { effectCollectionsMatcherCatalog } from "@better-typescript/matchers/builtins/effectCollectionsMatcherCatalog"
import { effectFunctionsAndSchemasMatcherCatalog } from "@better-typescript/matchers/builtins/effectFunctionsAndSchemasMatcherCatalog"
import { safetyMatcherCatalog } from "@better-typescript/matchers/builtins/safetyMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"

const makePreferEquivalenceStrictEqual = () => {
  const message = "Avoid raw strict equality (===)."

  const hint =
    "Import Equivalence from effect and replace this comparison with " +
    "Equivalence.strictEqual<YourType>()(left, right)."

  const preferEquivalenceStrictEqual = makeBuiltinPolicy({
    name: "prefer-equivalence-strict-equal",
    matcher: effectCollectionsMatcherCatalog.preferEquivalenceStrictEqualMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferEquivalenceStrictEqual
}

export const preferEquivalenceStrictEqual = makePreferEquivalenceStrictEqual()

export const equivalencePolicies: ReadonlyArray<Policy> = Array.make(preferEquivalenceStrictEqual)

const makePreferEffectFn = () => {
  const ordinaryHint = (functionName: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
    "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
    "traced span."

  const selfBoundHint = (functionName: string, selfBinding: string, thisType: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(${selfBinding}, ` +
    `function*(this: ${thisType}, ...) { ... }): Effect.fn subsumes the Effect.gen wrapper ` +
    "and runs every call inside a traced span."

  const defaultThisType = "..."
  const defaultThisTypeFallback = Function.constant(defaultThisType)

  const makePreferEffectFnFindings = (
    match: Match<
      typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectFnMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const { functionName } = match.fact
    const selfBinding = Option.fromNullishOr(match.fact.selfBindingText)

    const thisType = pipe(
      Option.fromNullishOr(match.fact.thisTypeText),
      Option.getOrElse(defaultThisTypeFallback)
    )

    const ordinaryHintForName = () => ordinaryHint(functionName)

    const selfBoundHintForBinding = (selfBindingText: string) =>
      selfBoundHint(functionName, selfBindingText, thisType)

    const hint = pipe(
      selfBinding,
      Option.match({
        onNone: ordinaryHintForName,
        onSome: selfBoundHintForBinding
      })
    )

    return makeFindings(
      match.target,
      `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
      hint,
      match.fact
    )
  }

  const preferEffectFn = makeBuiltinPolicy({
    name: "prefer-effect-fn",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectFnMatcher,
    guidance: Function.constant(makePreferEffectFnFindings),
    reported: true,
    stage: "program"
  })

  return preferEffectFn
}

export const preferEffectFn = makePreferEffectFn()

const makeNoTrivialEffectFn = () => {
  const noTrivialEffectFn = makeBuiltinPolicy({
    name: "no-trivial-effect-fn",
    matcher: effectFunctionsAndSchemasMatcherCatalog.noTrivialEffectFnMatcher,
    guidance: factGuidance(
      "Avoid named Effect.fn wrappers that only forward their parameters.",
      "Export the forwarded Effect operation directly. Keep Effect.fn only when the named workflow transforms, recovers, sequences, or otherwise adds behavior."
    ),
    reported: true,
    stage: "program"
  })

  return noTrivialEffectFn
}

export const noTrivialEffectFn = makeNoTrivialEffectFn()

const makeNoImmediateEffectSync = () => {
  const noImmediateEffectSync = makeBuiltinPolicy({
    name: "no-immediate-effect-sync",
    matcher: effectFunctionsAndSchemasMatcherCatalog.noImmediateEffectSyncMatcher,
    guidance: factGuidance(
      "Avoid immediately running a locally bound Effect.sync.",
      "Run the synchronous action directly at this startup boundary, or retain the Effect only when it is deferred or composed into a larger workflow."
    ),
    reported: true,
    stage: "program"
  })

  return noImmediateEffectSync
}

export const noImmediateEffectSync = makeNoImmediateEffectSync()

const makePreferEffectFunctionConstant = () => {
  const message = "Avoid a handwritten constant thunk."

  const preferEffectFunctionConstantGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectFunctionConstantMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectFunctionConstantMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { expressionText } = match.fact

      return makeFindings(
        match.target,
        message,
        `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
          "Function.constant captures that value once and returns a zero-argument function.",
        match.fact
      )
    }

  const preferEffectFunctionConstant = makeBuiltinPolicy({
    name: "prefer-effect-function-constant",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectFunctionConstantMatcher,
    guidance: preferEffectFunctionConstantGuidance,
    reported: true,
    stage: "program"
  })

  return preferEffectFunctionConstant
}

export const preferEffectFunctionConstant = makePreferEffectFunctionConstant()

const makePreferEffectPropertyAccessors = () => {
  const preferEffectPropertyAccessorsGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectPropertyAccessorsMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectPropertyAccessorsMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { name, accessedText, moduleName, propertyKey } = match.fact
      const suggestion = `${moduleName}.get(${propertyKey})`

      return makeFindings(
        match.target,
        `Avoid defining ${name} only to read ${accessedText}.`,
        `Replace this property-access-only function with ${suggestion} from Effect. ` +
          "Use Struct.get for non-record data types, and Record.get or Record.has for records.",
        match.fact
      )
    }

  const preferEffectPropertyAccessors = makeBuiltinPolicy({
    name: "prefer-effect-property-accessors",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectPropertyAccessorsMatcher,
    guidance: preferEffectPropertyAccessorsGuidance,
    reported: true,
    stage: "program"
  })

  return preferEffectPropertyAccessors
}

export const preferEffectPropertyAccessors = makePreferEffectPropertyAccessors()

const makePreferEffectfulPolicy = () => {
  const preferEffectfulFunctionGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectfulFunctionMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectfulFunctionMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { functionName } = match.fact

      return makeFindings(
        match.target,
        `Avoid synchronously unwrapping an Effect in ${functionName}.`,
        `Return the Effect from ${functionName} and compose callers with yield* or ` +
          "Effect.flatMap. Reserve Effect.runSync for the application runtime boundary.",
        match.fact
      )
    }

  const preferEffectfulFunction = makeBuiltinPolicy({
    name: "prefer-effectful-function",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectfulFunctionMatcher,
    guidance: preferEffectfulFunctionGuidance,
    reported: true,
    stage: "program"
  })

  return preferEffectfulFunction
}

export const preferEffectfulFunction = makePreferEffectfulPolicy()

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectFunctionPolicies: ReadonlyArray<Policy> = Array.make(
  noTrivialEffectFn,
  noImmediateEffectSync,
  preferEffectFn,
  preferEffectfulFunction,
  preferEffectFunctionConstant,
  preferEffectPropertyAccessors
)

const makePreferSchemaTaggedStruct = () => {
  const message = "Prefer Schema.TaggedStruct when every field has a portable wire representation."

  const hint =
    "This Data.TaggedClass contains only wire-safe structural fields. When it crosses a reusable " +
    "boundary, define it with Schema.TaggedStruct and a same-named decoded interface. Compose " +
    "multiple boundary variants with Schema.TaggedUnion. Keep Data.TaggedClass for process-bound " +
    "values such as streams, effects, functions, compiler objects, and live handles, and use " +
    "Data.TaggedEnum for internal workflow decisions or state. Use Schema.TaggedErrorClass only " +
    "for typed errors."

  const preferSchemaTaggedStruct = makeBuiltinPolicy({
    name: "prefer-schema-tagged-struct",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferSchemaTaggedStructMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferSchemaTaggedStruct
}

export const preferSchemaTaggedStruct = makePreferSchemaTaggedStruct()

export const schemaModelingPolicies: ReadonlyArray<Policy> = Array.make(preferSchemaTaggedStruct)

const makePreferEffectSchemaConstructor = () => {
  const taggedMessage = (tag: string) =>
    `Avoid declaring or returning a raw "${tag}" object literal.`

  const untaggedMessage = "Avoid declaring or returning a raw object literal."

  const taggedHint = (tag: string) =>
    `Reuse the existing Effect Schema for the "${tag}" protocol variant and construct it ` +
    "through schema.make. If no such model exists, first decide whether this tagged value is an " +
    "independent protocol concept or this function is only a procedural seam. Model a reusable " +
    "boundary-crossing variant with Schema.TaggedStruct and a same-named decoded interface; use " +
    "Schema.TaggedUnion for boundary-crossing unions. Use Data.TaggedEnum for internal workflow " +
    "decisions or state, and Schema.TaggedErrorClass only for typed errors."

  const untaggedHint =
    "Reuse an existing Effect Schema whose semantics match this result and construct it through " +
    "schema.make. If none exists, reconsider whether this function is a real abstraction or a " +
    "procedural seam that should be collapsed into its owner. For data with independent meaning, " +
    "define a Schema.Struct with a same-named decoded interface."

  const untaggedMessageFallback = Function.constant(untaggedMessage)
  const untaggedHintFallback = Function.constant(untaggedHint)

  const makePreferEffectSchemaConstructorFindings = (
    match: Match<
      typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaConstructorMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const tag = Option.fromNullishOr(match.fact.tag)

    const message = pipe(
      tag,
      Option.match({
        onNone: untaggedMessageFallback,
        onSome: taggedMessage
      })
    )

    const hint = pipe(
      tag,
      Option.match({
        onNone: untaggedHintFallback,
        onSome: taggedHint
      })
    )

    return makeFindings(match.target, message, hint, match.fact)
  }

  const preferEffectSchemaConstructor = makeBuiltinPolicy({
    name: "prefer-effect-schema-constructor",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaConstructorMatcher,
    guidance: Function.constant(makePreferEffectSchemaConstructorFindings),
    reported: true,
    stage: "program"
  })

  return preferEffectSchemaConstructor
}

export const preferEffectSchemaConstructor = makePreferEffectSchemaConstructor()

const makePreferEffectSchemaGuard = () => {
  const preferEffectSchemaGuardGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaGuardMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaGuardMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { propertyName, objectText } = match.fact

      return makeFindings(
        match.target,
        `Avoid using ${propertyName} in ${objectText} as a type guard.`,
        `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`,
        match.fact
      )
    }

  const preferEffectSchemaGuard = makeBuiltinPolicy({
    name: "prefer-effect-schema-guard",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaGuardMatcher,
    guidance: preferEffectSchemaGuardGuidance,
    reported: true,
    stage: "program"
  })

  return preferEffectSchemaGuard
}

export const preferEffectSchemaGuard = makePreferEffectSchemaGuard()

const makePreferEffectSchemaIs = () => {
  const preferEffectSchemaIsGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaIsMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaIsMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { valueText, operatorText, tagText, isNegated } = match.fact
      const schemaIsCheck = `Schema.is($schema)(${valueText})`
      const suggestion = isNegated ? `!${schemaIsCheck}` : schemaIsCheck

      return makeFindings(
        match.target,
        `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
        `Replace the tag check with ${suggestion}, using the Effect Schema class for "${tagText}".`,
        match.fact
      )
    }

  const preferEffectSchemaIs = makeBuiltinPolicy({
    name: "prefer-effect-schema-is",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaIsMatcher,
    guidance: preferEffectSchemaIsGuidance,
    reported: true,
    stage: "program"
  })

  return preferEffectSchemaIs
}

export const preferEffectSchemaIs = makePreferEffectSchemaIs()

const makePreferEffectSchemaRecord = () => {
  const toRelativeFileName = (projectRoot: string) => (fileName: string) => {
    const relative = path.relative(projectRoot, fileName)

    return relative || fileName
  }

  const tupleTypeHint =
    "Replace a constructed tuple alias with a named Effect schema record, for example " +
    "export const Example = Schema.Struct({ myString: Schema.String, myNumber: " +
    "Schema.Number }); export interface Example extends Schema.Schema.Type<typeof Example> {}. " +
    "Keep a tuple only when its positions are inherently meaningful; process-bound runtime values " +
    "remain boundary types or explicit runtime data."

  const preferEffectSchemaRecordGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    (context: ProgramContext) =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const makeTupleFindings = (
        fact: Extract<
          typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
            infer Fact
          >
            ? Fact
            : never,
          { readonly kind: "tuple" }
        >
      ) =>
        makeFindings(
          match.target,
          `Avoid declaring ${fact.typeName} as a tuple type alias.`,
          tupleTypeHint,
          match.fact
        )

      const makeObjectFindings = (
        fact: Extract<
          typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
            infer Fact
          >
            ? Fact
            : never,
          { readonly kind: "object" }
        >
      ) => {
        const toExampleFile = toRelativeFileName(context.projectRoot)
        const exampleFile = toExampleFile(fact.constructionFileName)

        return makeFindings(
          match.target,
          `Avoid declaring ${fact.typeName} as ${fact.kindLabel} when this project constructs ` +
            "its values.",
          `Object literals of this shape are built in ${exampleFile}, so ${fact.typeName} is a ` +
            "data definition rather than a boundary type. Define it as an Effect schema " +
            "record — export const " +
            `${fact.typeName} = Schema.Struct({ ... }); export interface ${fact.typeName} extends ` +
            `Schema.Schema.Type<typeof ${fact.typeName}> {}. Construct trusted values with ` +
            `${fact.typeName}.make({ ... }) and decode unknown input at the boundary. Use ` +
            "Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values " +
            "as boundary types or explicit runtime data.",
          match.fact
        )
      }

      return pipe(
        EffectMatch.value(match.fact),
        EffectMatch.when({ kind: "tuple" }, makeTupleFindings),
        EffectMatch.when({ kind: "object" }, makeObjectFindings),
        EffectMatch.exhaustive
      )
    }

  const preferEffectSchemaRecord = makeBuiltinPolicy({
    name: "prefer-effect-schema-record",
    matcher: effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher,
    guidance: preferEffectSchemaRecordGuidance,
    reported: true,
    stage: "program"
  })

  return preferEffectSchemaRecord
}

export const preferEffectSchemaRecord = makePreferEffectSchemaRecord()

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectSchemaPolicies: ReadonlyArray<Policy> = Array.make(
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaConstructor,
  preferEffectSchemaRecord
)

const makeNoUnsafeEffectApis = () => {
  const message = "Avoid unsafe Effect APIs."

  const hint =
    "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics " +
    "explicitly. If no safe counterpart preserves the required behavior, redesign the boundary " +
    "instead of using an API whose name contains unsafe."

  const noUnsafeEffectApis = makeBuiltinPolicy({
    name: "no-unsafe-effect-apis",
    matcher: safetyMatcherCatalog.noUnsafeEffectApisMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noUnsafeEffectApis
}

export const noUnsafeEffectApis = makeNoUnsafeEffectApis()

export const unsafeEffectPolicies: ReadonlyArray<Policy> = Array.make(noUnsafeEffectApis)

const makePreferEffectArray = () => {
  const hint =
    "Prefer Effect's Array module — define the array as a const and call " +
    "Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), " +
    "or the matching Array.* helper — instead of invoking Array.prototype methods " +
    "directly on array values."

  const preferEffectArrayGuidance: Guidance<
    typeof effectCollectionsMatcherCatalog.preferEffectArrayMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectCollectionsMatcherCatalog.preferEffectArrayMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) =>
      makeFindings(match.target, `Avoid Array.prototype.${match.fact.method}().`, hint, match.fact)

  const preferEffectArray = makeBuiltinPolicy({
    name: "prefer-effect-array",
    matcher: effectCollectionsMatcherCatalog.preferEffectArrayMatcher,
    guidance: preferEffectArrayGuidance,
    reported: true,
    stage: "program"
  })

  return preferEffectArray
}

export const preferEffectArray = makePreferEffectArray()

const makePreferEffectArrayAppendAll = () => {
  const message = "Avoid conditional array spreads."

  const hint =
    "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional " +
    "expression that chooses between an array and an empty array literal."

  const preferEffectArrayAppendAll = makeBuiltinPolicy({
    name: "prefer-effect-array-append-all",
    matcher: effectCollectionsMatcherCatalog.preferEffectArrayAppendAllMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferEffectArrayAppendAll
}

export const preferEffectArrayAppendAll = makePreferEffectArrayAppendAll()

const makePreferEffectArrayCountBy = () => {
  const message = "Avoid filtering an array only to count matching elements."

  const hint =
    "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from " +
    "Effect. Remove a surrounding helper when that is its only behavior."

  const preferEffectArrayCountBy = makeBuiltinPolicy({
    name: "prefer-effect-array-count-by",
    matcher: effectCollectionsMatcherCatalog.preferEffectArrayCountByMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferEffectArrayCountBy
}

export const preferEffectArrayCountBy = makePreferEffectArrayCountBy()

const makePreferEffectIndexAccess = () => {
  const hint =
    "Use Array.get(collection, index) to represent a potentially absent array element, " +
    "or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, " +
    "use Tuple.get(tuple, index) to preserve its positional type."

  const message = "Avoid direct array and tuple index access."

  const preferEffectIndexAccess = makeBuiltinPolicy({
    name: "prefer-effect-index-access",
    matcher: effectCollectionsMatcherCatalog.preferEffectIndexAccessMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferEffectIndexAccess
}

export const preferEffectIndexAccess = makePreferEffectIndexAccess()

const makePreferEffectRecordFilterMap = () => {
  const message = "Avoid conditional object spreads."

  const hint =
    "Build a record of candidate properties and use Record.filterMap from Effect with " +
    "Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries."

  const preferEffectRecordFilterMap = makeBuiltinPolicy({
    name: "prefer-effect-record-filter-map",
    matcher: effectCollectionsMatcherCatalog.preferEffectRecordFilterMapMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferEffectRecordFilterMap
}

export const preferEffectRecordFilterMap = makePreferEffectRecordFilterMap()

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectCollectionPolicies: ReadonlyArray<Policy> = Array.make(
  preferEffectRecordFilterMap,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferEffectArrayCountBy,
  preferEffectIndexAccess
)

// Member order is pinned because concatenated categories define the public report block order.
export const effectIdiomPolicies: ReadonlyArray<Policy> = pipe(
  effectSchemaPolicies,
  Array.appendAll(effectFunctionPolicies),
  Array.appendAll(effectCollectionPolicies),
  Array.appendAll(schemaModelingPolicies),
  Array.appendAll(unsafeEffectPolicies),
  Array.appendAll(equivalencePolicies)
)
