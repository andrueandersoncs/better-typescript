import { preferEffectArrayAppendAllScanner } from "../builtins/preferEffectArrayAppendAll.js"
import { preferEffectArrayCountByScanner } from "../builtins/preferEffectArrayCountBy.js"
import { preferEffectArrayScanner } from "../builtins/preferEffectArray.js"
import { preferEffectIndexAccessScanner } from "../builtins/preferEffectIndexAccess.js"
import { preferEffectRecordFilterMapScanner } from "../builtins/preferEffectRecordFilterMap.js"
import { preferEquivalenceStrictEqualScanner } from "../builtins/preferEquivalenceStrictEqual.js"
import { noUnsafeEffectApisScanner } from "../builtins/noUnsafeEffectApis.js"
import { noImmediateEffectSyncScanner } from "../builtins/noImmediateEffectSync.js"
import { noTrivialEffectFnScanner } from "../builtins/noTrivialEffectFn.js"
import { preferEffectFnScanner } from "../builtins/preferEffectFn.js"
import { preferEffectFunctionConstantScanner } from "../builtins/preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessorsScanner } from "../builtins/preferEffectPropertyAccessors.js"
import { preferEffectSchemaConstructorScanner } from "../builtins/preferEffectSchemaConstructor.js"
import { preferEffectSchemaGuardScanner } from "../builtins/preferEffectSchemaGuard.js"
import { preferEffectSchemaIsScanner } from "../builtins/preferEffectSchemaIs.js"
import { preferEffectSchemaRecordScanner } from "../builtins/preferEffectSchemaRecord.js"
import { preferEffectfulFunctionScanner } from "../builtins/preferEffectfulFunction.js"
import { preferSchemaTaggedStructScanner } from "../builtins/preferSchemaTaggedStruct.js"
import { Array, Function, pipe, Match as EffectMatch, Option } from "effect"
import * as path from "node:path"
import type { RuleMessage } from "../rule/ruleMessage.js"
import { makeRuleMessage } from "../rule/makeRuleMessage.js"
import type { Rule } from "@better-typescript/core/linter"
import type { Match } from "../scanner/match.js"
import type { Scanner } from "../scanner/scannerData.js"
import type { ProgramContext } from "../sources/data.js"
import { makeRule } from "../rule/makeRule.js"
import { fixedRuleMessage } from "../rule/fixedRuleMessage.js"

const makePreferEquivalenceStrictEqual = () => {
  const message = "Avoid raw strict equality (===)."

  const hint =
    "Import Equivalence from effect and replace this comparison with " +
    "Equivalence.strictEqual<YourType>()(left, right)."

  const preferEquivalenceStrictEqual = makeRule("prefer-equivalence-strict-equal")(
    preferEquivalenceStrictEqualScanner
  )(fixedRuleMessage(message, hint))

  return preferEquivalenceStrictEqual
}

export const preferEquivalenceStrictEqual = makePreferEquivalenceStrictEqual()

export const equivalenceRules: ReadonlyArray<Rule> = Array.make(preferEquivalenceStrictEqual)

const makePreferEffectFn = () => {
  const ordinaryHint = (functionName: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
    "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
    "traced span."

  const selfBoundHint = (functionName: string) => (thisType: string) => (selfBinding: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(${selfBinding}, ` +
    `function*(this: ${thisType}, ...) { ... }): Effect.fn subsumes the Effect.gen wrapper ` +
    "and runs every call inside a traced span."

  const defaultThisType = "..."
  const defaultThisTypeFallback = Function.constant(defaultThisType)

  const makePreferEffectFnFindings = (
    match: Match<typeof preferEffectFnScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const { functionName } = match.fact
    const selfBinding = Option.fromNullishOr(match.fact.selfBindingText)

    const thisType = pipe(
      Option.fromNullishOr(match.fact.thisTypeText),
      Option.getOrElse(defaultThisTypeFallback)
    )

    const ordinaryHintForName = () => ordinaryHint(functionName)
    const selfBoundHintForBinding = selfBoundHint(functionName)(thisType)

    const hint = pipe(
      selfBinding,
      Option.match({
        onNone: ordinaryHintForName,
        onSome: selfBoundHintForBinding
      })
    )

    return makeRuleMessage(
      `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
      hint
    )
  }

  const preferEffectFn = makeRule("prefer-effect-fn")(preferEffectFnScanner)(
    Function.constant(makePreferEffectFnFindings)
  )

  return preferEffectFn
}

export const preferEffectFn = makePreferEffectFn()

const makeNoTrivialEffectFn = () => {
  const noTrivialEffectFn = makeRule("no-trivial-effect-fn")(noTrivialEffectFnScanner)(
    fixedRuleMessage(
      "Avoid named Effect.fn wrappers that only forward their parameters.",
      "Export the forwarded Effect operation directly. Keep Effect.fn only when the named workflow transforms, recovers, sequences, or otherwise adds behavior."
    )
  )

  return noTrivialEffectFn
}

export const noTrivialEffectFn = makeNoTrivialEffectFn()

const makeNoImmediateEffectSync = () => {
  const noImmediateEffectSync = makeRule("no-immediate-effect-sync")(noImmediateEffectSyncScanner)(
    fixedRuleMessage(
      "Avoid immediately running a locally bound Effect.sync.",
      "Run the synchronous action directly at this startup boundary, or retain the Effect only when it is deferred or composed into a larger workflow."
    )
  )

  return noImmediateEffectSync
}

export const noImmediateEffectSync = makeNoImmediateEffectSync()

const makePreferEffectFunctionConstant = () => {
  const message = "Avoid a handwritten constant thunk."

  const makePreferEffectFunctionConstantRuleMessage: RuleMessage<
    typeof preferEffectFunctionConstantScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof preferEffectFunctionConstantScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { expressionText } = match.fact

      return makeRuleMessage(
        message,
        `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
          "Function.constant captures that value once and returns a zero-argument function."
      )
    }

  const preferEffectFunctionConstant = makeRule("prefer-effect-function-constant")(
    preferEffectFunctionConstantScanner
  )(makePreferEffectFunctionConstantRuleMessage)

  return preferEffectFunctionConstant
}

export const preferEffectFunctionConstant = makePreferEffectFunctionConstant()

const makePreferEffectPropertyAccessors = () => {
  const makePreferEffectPropertyAccessorsRuleMessage: RuleMessage<
    typeof preferEffectPropertyAccessorsScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof preferEffectPropertyAccessorsScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { name, accessedText, moduleName, propertyKey } = match.fact
      const suggestion = `${moduleName}.get(${propertyKey})`

      return makeRuleMessage(
        `Avoid defining ${name} only to read ${accessedText}.`,
        `Replace this property-access-only function with ${suggestion} from Effect. ` +
          "Use Struct.get for non-record data types, and Record.get or Record.has for records."
      )
    }

  const preferEffectPropertyAccessors = makeRule("prefer-effect-property-accessors")(
    preferEffectPropertyAccessorsScanner
  )(makePreferEffectPropertyAccessorsRuleMessage)

  return preferEffectPropertyAccessors
}

export const preferEffectPropertyAccessors = makePreferEffectPropertyAccessors()

const makePreferEffectfulRule = () => {
  const makePreferEffectfulFunctionRuleMessage: RuleMessage<
    typeof preferEffectfulFunctionScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferEffectfulFunctionScanner extends Scanner<infer Fact> ? Fact : never>
    ) => {
      const { functionName } = match.fact

      return makeRuleMessage(
        `Avoid synchronously unwrapping an Effect in ${functionName}.`,
        `Return the Effect from ${functionName} and compose callers with yield* or ` +
          "Effect.flatMap. Reserve Effect.runSync for the application runtime boundary."
      )
    }

  const preferEffectfulFunction = makeRule("prefer-effectful-function")(
    preferEffectfulFunctionScanner
  )(makePreferEffectfulFunctionRuleMessage)

  return preferEffectfulFunction
}

export const preferEffectfulFunction = makePreferEffectfulRule()

export const effectFunctionRules: ReadonlyArray<Rule> = Array.make(
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

  const preferSchemaTaggedStruct = makeRule("prefer-schema-tagged-struct")(
    preferSchemaTaggedStructScanner
  )(fixedRuleMessage(message, hint))

  return preferSchemaTaggedStruct
}

export const preferSchemaTaggedStruct = makePreferSchemaTaggedStruct()

export const schemaModelingRules: ReadonlyArray<Rule> = Array.make(preferSchemaTaggedStruct)

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
      typeof preferEffectSchemaConstructorScanner extends Scanner<infer Fact> ? Fact : never
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

    return makeRuleMessage(message, hint)
  }

  const preferEffectSchemaConstructor = makeRule("prefer-effect-schema-constructor")(
    preferEffectSchemaConstructorScanner
  )(Function.constant(makePreferEffectSchemaConstructorFindings))

  return preferEffectSchemaConstructor
}

export const preferEffectSchemaConstructor = makePreferEffectSchemaConstructor()

const makePreferEffectSchemaGuard = () => {
  const makePreferEffectSchemaGuardRuleMessage: RuleMessage<
    typeof preferEffectSchemaGuardScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferEffectSchemaGuardScanner extends Scanner<infer Fact> ? Fact : never>
    ) => {
      const { propertyName, objectText } = match.fact

      return makeRuleMessage(
        `Avoid using ${propertyName} in ${objectText} as a type guard.`,
        `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`
      )
    }

  const preferEffectSchemaGuard = makeRule("prefer-effect-schema-guard")(
    preferEffectSchemaGuardScanner
  )(makePreferEffectSchemaGuardRuleMessage)

  return preferEffectSchemaGuard
}

export const preferEffectSchemaGuard = makePreferEffectSchemaGuard()

const makePreferEffectSchemaIs = () => {
  const makePreferEffectSchemaIsRuleMessage: RuleMessage<
    typeof preferEffectSchemaIsScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferEffectSchemaIsScanner extends Scanner<infer Fact> ? Fact : never>
    ) => {
      const { valueText, operatorText, tagText, isNegated } = match.fact
      const schemaIsCheck = `Schema.is($schema)(${valueText})`
      const suggestion = isNegated ? `!${schemaIsCheck}` : schemaIsCheck

      return makeRuleMessage(
        `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
        `Replace the tag check with ${suggestion}, using the Effect Schema class for "${tagText}".`
      )
    }

  const preferEffectSchemaIs = makeRule("prefer-effect-schema-is")(preferEffectSchemaIsScanner)(
    makePreferEffectSchemaIsRuleMessage
  )

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

  const preferEffectSchemaRecordRuleMessage: RuleMessage<
    typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never
  > =
    (context: ProgramContext) =>
    (
      match: Match<
        typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const makeTupleFindings = (
        fact: Extract<
          typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never,
          { readonly kind: "tuple" }
        >
      ) => makeRuleMessage(`Avoid declaring ${fact.typeName} as a tuple type alias.`, tupleTypeHint)

      const makeObjectFindings = (
        fact: Extract<
          typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never,
          { readonly kind: "object" }
        >
      ) => {
        const toExampleFile = toRelativeFileName(context.projectRoot)
        const exampleFile = toExampleFile(fact.constructionFileName)

        return makeRuleMessage(
          `Avoid declaring ${fact.typeName} as ${fact.kindLabel} when this project constructs ` +
            "its values.",
          `Object literals of this shape are built in ${exampleFile}, so ${fact.typeName} is a ` +
            "data scan rather than a boundary type. Define it as an Effect schema " +
            "record — export const " +
            `${fact.typeName} = Schema.Struct({ ... }); export interface ${fact.typeName} extends ` +
            `Schema.Schema.Type<typeof ${fact.typeName}> {}. Construct trusted values with ` +
            `${fact.typeName}.make({ ... }) and decode unknown input at the boundary. Use ` +
            "Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values " +
            "as boundary types or explicit runtime data."
        )
      }

      return pipe(
        EffectMatch.value(match.fact),
        EffectMatch.when({ kind: "tuple" }, makeTupleFindings),
        EffectMatch.when({ kind: "object" }, makeObjectFindings),
        EffectMatch.exhaustive
      )
    }

  const preferEffectSchemaRecord = makeRule("prefer-effect-schema-record")(
    preferEffectSchemaRecordScanner
  )(preferEffectSchemaRecordRuleMessage)

  return preferEffectSchemaRecord
}

export const preferEffectSchemaRecord = makePreferEffectSchemaRecord()

export const effectSchemaRules: ReadonlyArray<Rule> = Array.make(
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

  const noUnsafeEffectApis = makeRule("no-unsafe-effect-apis")(noUnsafeEffectApisScanner)(
    fixedRuleMessage(message, hint)
  )

  return noUnsafeEffectApis
}

export const noUnsafeEffectApis = makeNoUnsafeEffectApis()

export const unsafeEffectRules: ReadonlyArray<Rule> = Array.make(noUnsafeEffectApis)

const makePreferEffectArray = () => {
  const hint =
    "Prefer Effect's Array module — define the array as a const and call " +
    "Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), " +
    "or the matching Array.* helper — instead of invoking Array.prototype methods " +
    "directly on array values."

  const makePreferEffectArrayRuleMessage: RuleMessage<
    typeof preferEffectArrayScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (match: Match<typeof preferEffectArrayScanner extends Scanner<infer Fact> ? Fact : never>) =>
      makeRuleMessage(`Avoid Array.prototype.${match.fact.method}().`, hint)

  const preferEffectArray = makeRule("prefer-effect-array")(preferEffectArrayScanner)(
    makePreferEffectArrayRuleMessage
  )

  return preferEffectArray
}

export const preferEffectArray = makePreferEffectArray()

const makePreferEffectArrayAppendAll = () => {
  const message = "Avoid conditional array spreads."

  const hint =
    "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional " +
    "expression that chooses between an array and an empty array literal."

  const preferEffectArrayAppendAll = makeRule("prefer-effect-array-append-all")(
    preferEffectArrayAppendAllScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectArrayAppendAll
}

export const preferEffectArrayAppendAll = makePreferEffectArrayAppendAll()

const makePreferEffectArrayCountBy = () => {
  const message = "Avoid filtering an array only to count matching elements."

  const hint =
    "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from " +
    "Effect. Remove a surrounding helper when that is its only behavior."

  const preferEffectArrayCountBy = makeRule("prefer-effect-array-count-by")(
    preferEffectArrayCountByScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectArrayCountBy
}

export const preferEffectArrayCountBy = makePreferEffectArrayCountBy()

const makePreferEffectIndexAccess = () => {
  const hint =
    "Use Array.get(collection, index) to represent a potentially absent array element, " +
    "or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, " +
    "use Tuple.get(tuple, index) to preserve its positional type."

  const message = "Avoid direct array and tuple index access."

  const preferEffectIndexAccess = makeRule("prefer-effect-index-access")(
    preferEffectIndexAccessScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectIndexAccess
}

export const preferEffectIndexAccess = makePreferEffectIndexAccess()

const makePreferEffectRecordFilterMap = () => {
  const message = "Avoid conditional object spreads."

  const hint =
    "Build a record of candidate properties and use Record.filterMap from Effect with " +
    "Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries."

  const preferEffectRecordFilterMap = makeRule("prefer-effect-record-filter-map")(
    preferEffectRecordFilterMapScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectRecordFilterMap
}

export const preferEffectRecordFilterMap = makePreferEffectRecordFilterMap()

export const effectCollectionRules: ReadonlyArray<Rule> = Array.make(
  preferEffectRecordFilterMap,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferEffectArrayCountBy,
  preferEffectIndexAccess
)

export const effectIdiomRules: ReadonlyArray<Rule> = pipe(
  effectSchemaRules,
  Array.appendAll(effectFunctionRules),
  Array.appendAll(effectCollectionRules),
  Array.appendAll(schemaModelingRules),
  Array.appendAll(unsafeEffectRules),
  Array.appendAll(equivalenceRules)
)
