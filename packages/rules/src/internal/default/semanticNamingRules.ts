import { preferResultConceptNamesScanner } from "../builtins/preferResultConceptNames.js"
import { preferSpecificOperationNamesScanner } from "../builtins/preferSpecificOperationNames.js"
import { requireCallableRoleNameConsistencyScanner } from "../builtins/requireCallableRoleNameConsistency.js"
import { requireCommandNameConsistencyScanner } from "../builtins/requireCommandNameConsistency.js"
import { requireConstructionNameConsistencyScanner } from "../builtins/requireConstructionNameConsistency.js"
import { requireConversionDirectionConsistencyScanner } from "../builtins/requireConversionDirectionConsistency.js"
import { requireLookupTotalityNameConsistencyScanner } from "../builtins/requireLookupTotalityNameConsistency.js"
import { requirePredicateNameConsistencyScanner } from "../builtins/requirePredicateNameConsistency.js"
import { requireResultCardinalityNameConsistencyScanner } from "../builtins/requireResultCardinalityNameConsistency.js"
import { requireResultShapeNameConsistencyScanner } from "../builtins/requireResultShapeNameConsistency.js"
import { Array, Function, pipe, Match as EffectMatch } from "effect"
import type { RuleMessage } from "../rule/ruleMessage.js"
import { makeRuleMessage } from "../rule/makeRuleMessage.js"
import type { Rule } from "@better-typescript/core/linter"
import type { Match } from "../scanner/match.js"
import type { Scanner } from "../scanner/scannerData.js"
import { makeRule } from "../rule/makeRule.js"

const makePreferSpecificOperationNames = () => {
  const makePreferSpecificOperationNamesRuleMessage: RuleMessage<
    typeof preferSpecificOperationNamesScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof preferSpecificOperationNamesScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { nameText, vague, role, renamed } = match.fact

      return makeRuleMessage(
        `${nameText} uses the vague operation ${vague}, but its body has a unique ${role} role.`,
        `Rename to ${renamed}, preserving the known object or result noun.`
      )
    }

  const preferSpecificOperationNames = makeRule("prefer-specific-operation-names")(
    preferSpecificOperationNamesScanner
  )(makePreferSpecificOperationNamesRuleMessage)

  return preferSpecificOperationNames
}

export const preferSpecificOperationNames = makePreferSpecificOperationNames()

const makeRequireCallableRoleNameConsistency = () => {
  const makeRequireCallableRoleNameConsistencyRuleMessage: RuleMessage<
    typeof requireCallableRoleNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof requireCallableRoleNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { nameText, role, expected } = match.fact

      return makeRuleMessage(
        `${nameText} claims the ${role} role, but does not provide ${expected}.`,
        `Rename away from the ${role} role noun, or change the signature and body so the ` +
          `${role} contract holds.`
      )
    }

  const requireCallableRoleNameConsistency = makeRule("require-callable-role-name-consistency")(
    requireCallableRoleNameConsistencyScanner
  )(makeRequireCallableRoleNameConsistencyRuleMessage)

  return requireCallableRoleNameConsistency
}

export const requireCallableRoleNameConsistency = makeRequireCallableRoleNameConsistency()

const makeRequirePredicateNameConsistency = () => {
  const makeRequirePredicateNameConsistencyFindings = (
    match: Match<
      typeof requirePredicateNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const makeNonBooleanPredicateFindings = (
      fact: Extract<
        typeof requirePredicateNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "non-boolean-predicate" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} claims a predicate, but its result shape is ${fact.shape}.`,
        "Rename the function so its operation matches the non-boolean result, or return a " +
          "boolean or type-predicate result."
      )

    const makeBooleanIncompatibleFindings = (
      fact: Extract<
        typeof requirePredicateNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "boolean-incompatible" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} returns boolean, but claims the ${fact.operation} operation.`,
        "Rename with predicate vocabulary such as is, has, can, should, does, equal, " +
          "contain, include, match, exist, every, some, startsWith, or endsWith."
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "non-boolean-predicate" }, makeNonBooleanPredicateFindings),
      EffectMatch.when({ kind: "boolean-incompatible" }, makeBooleanIncompatibleFindings),
      EffectMatch.exhaustive
    )
  }

  const requirePredicateNameConsistency = makeRule("require-predicate-name-consistency")(
    requirePredicateNameConsistencyScanner
  )(Function.constant(makeRequirePredicateNameConsistencyFindings))

  return requirePredicateNameConsistency
}

export const requirePredicateNameConsistency = makeRequirePredicateNameConsistency()

export const predicateNamingRules: ReadonlyArray<Rule> = Array.make(requirePredicateNameConsistency)

export const callableRoleNamingRules: ReadonlyArray<Rule> = Array.make(
  requireCallableRoleNameConsistency,
  preferSpecificOperationNames
)

const makeRequireCommandNameConsistency = () => {
  const makeRequireCommandNameConsistencyFindings = (
    match: Match<
      typeof requireCommandNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const makeFalseCommandFindings = (
      fact: Extract<
        typeof requireCommandNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "false-command" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} claims the command ${fact.operation}, but its result and body do not provide command evidence.`,
        "Rename away from the command verb, or implement a true command with a void or Effect.void result."
      )

    const makeHiddenCommandFindings = (
      fact: Extract<
        typeof requireCommandNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "hidden-command" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} is a void command named like an accessor, projection, or result, not a command.`,
        "Rename with command language such as save, write, send, publish, set, update, remove, or delete."
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "false-command" }, makeFalseCommandFindings),
      EffectMatch.when({ kind: "hidden-command" }, makeHiddenCommandFindings),
      EffectMatch.exhaustive
    )
  }

  const requireCommandNameConsistency = makeRule("require-command-name-consistency")(
    requireCommandNameConsistencyScanner
  )(Function.constant(makeRequireCommandNameConsistencyFindings))

  return requireCommandNameConsistency
}

export const requireCommandNameConsistency = makeRequireCommandNameConsistency()

const makeRequireLookupTotalityNameConsistency = () => {
  const makeRequireLookupTotalityNameConsistencyFindings = (
    match: Match<
      typeof requireLookupTotalityNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const makeAbsenceClaimFindings = (
      fact: Extract<
        typeof requireLookupTotalityNameConsistencyScanner extends Scanner<infer Fact>
          ? Fact
          : never,
        { readonly kind: "optional-claim" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} claims optional lookup via ${fact.claimLabel}, but returns total data.`,
        "Return optional or fallible data (Option, nullish, Result), or remove find/lookup/maybe/optional from the name."
      )

    const makePresenceClaimFindings = (
      fact: Extract<
        typeof requireLookupTotalityNameConsistencyScanner extends Scanner<infer Fact>
          ? Fact
          : never,
        { readonly kind: "total-claim" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} claims required access via ${fact.claimLabel}, but returns optional data.`,
        "Return total data, or remove require/unsafe/getOrThrow/getOrElse from the name."
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "optional-claim" }, makeAbsenceClaimFindings),
      EffectMatch.when({ kind: "total-claim" }, makePresenceClaimFindings),
      EffectMatch.exhaustive
    )
  }

  const requireLookupTotalityNameConsistency = makeRule("require-lookup-totality-name-consistency")(
    requireLookupTotalityNameConsistencyScanner
  )(Function.constant(makeRequireLookupTotalityNameConsistencyFindings))

  return requireLookupTotalityNameConsistency
}

export const requireLookupTotalityNameConsistency = makeRequireLookupTotalityNameConsistency()

export const lookupNamingRules: ReadonlyArray<Rule> = Array.make(
  requireLookupTotalityNameConsistency
)

export const commandNamingRules: ReadonlyArray<Rule> = Array.make(requireCommandNameConsistency)

const makeRequireConstructionNameConsistency = () => {
  const makeRequireConstructionNameConsistencyFindings = (
    match: Match<
      typeof requireConstructionNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const makeFactoryMasqueradeFindings = (
      fact: Extract<
        typeof requireConstructionNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "factory-masquerade" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} claims factory construction via ${fact.operation}, but looks up or projects existing data.`,
        "Rename with lookup or projection vocabulary, or return a freshly constructed value."
      )

    const makeUnnamedConstructionFindings = (
      fact: Extract<
        typeof requireConstructionNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "unnamed-construction" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} constructs a value, but does not use construction vocabulary.`,
        "Rename with make/create/build/construct (for example makeUser), or use a recognized " +
          "variant constructor such as some/none/left/right/succeed/fail/of."
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "factory-masquerade" }, makeFactoryMasqueradeFindings),
      EffectMatch.when({ kind: "unnamed-construction" }, makeUnnamedConstructionFindings),
      EffectMatch.exhaustive
    )
  }

  const requireConstructionNameConsistency = makeRule("require-construction-name-consistency")(
    requireConstructionNameConsistencyScanner
  )(Function.constant(makeRequireConstructionNameConsistencyFindings))

  return requireConstructionNameConsistency
}

export const requireConstructionNameConsistency = makeRequireConstructionNameConsistency()

const makeRequireConversionDirectionConsistency = () => {
  const makeRequireConversionDirectionConsistencyFindings = (
    match: Match<
      typeof requireConversionDirectionConsistencyScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => {
    const { axis, nameText, claimed, expected } = match.fact

    const resultMessage = () =>
      `${nameText} names its conversion result as ${claimed}, but it returns ${expected}.`

    const sourceMessage = () =>
      `${nameText} names its conversion source as ${claimed}, but its source is ${expected}.`

    const resultHint = () =>
      `Rename the result phrase to ${expected}, or return a value whose concept is ${claimed}.`

    const sourceHint = () =>
      `Rename the source phrase to ${expected}, or accept a parameter whose concept is ${claimed}.`

    const message = pipe(
      EffectMatch.value(axis),
      EffectMatch.when("result", resultMessage),
      EffectMatch.when("source", sourceMessage),
      EffectMatch.exhaustive
    )

    const hint = pipe(
      EffectMatch.value(axis),
      EffectMatch.when("result", resultHint),
      EffectMatch.when("source", sourceHint),
      EffectMatch.exhaustive
    )

    return makeRuleMessage(message, hint)
  }

  const requireConversionDirectionConsistency = makeRule(
    "require-conversion-direction-consistency"
  )(requireConversionDirectionConsistencyScanner)(
    Function.constant(makeRequireConversionDirectionConsistencyFindings)
  )

  return requireConversionDirectionConsistency
}

export const requireConversionDirectionConsistency = makeRequireConversionDirectionConsistency()

export const constructionNamingRules: ReadonlyArray<Rule> = Array.make(
  requireConstructionNameConsistency
)

export const conversionNamingRules: ReadonlyArray<Rule> = Array.make(
  requireConversionDirectionConsistency
)

const makePreferResultConceptNames = () => {
  const makePreferResultConceptNamesRuleMessage: RuleMessage<
    typeof preferResultConceptNamesScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof preferResultConceptNamesScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { nameText, claimed, expected } = match.fact

      return makeRuleMessage(
        `${nameText} names its result as ${claimed}, but it returns ${expected}.`,
        `Rename the result phrase to ${expected}. Preserve operation and source qualifiers, ` +
          `using ${expected}FromSource or sourceTo${expected} when direction matters.`
      )
    }

  const preferResultConceptNames = makeRule("prefer-result-concept-names")(
    preferResultConceptNamesScanner
  )(makePreferResultConceptNamesRuleMessage)

  return preferResultConceptNames
}

export const preferResultConceptNames = makePreferResultConceptNames()

const makeRequireResultCardinalityNameConsistency = () => {
  const makeRequireResultCardinalityNameConsistencyFindings = (
    match: Match<
      typeof requireResultCardinalityNameConsistencyScanner extends Scanner<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makePluralForOneFindings = (
      fact: Extract<
        typeof requireResultCardinalityNameConsistencyScanner extends Scanner<infer Fact>
          ? Fact
          : never,
        { readonly kind: "plural-for-one" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} names its result as plural ${fact.claimed}, but returns ${fact.cardinality}.`,
        `Rename the result noun to singular ${fact.singular} so the name matches a single returned value.`
      )

    const makeSingularForManyFindings = (
      fact: Extract<
        typeof requireResultCardinalityNameConsistencyScanner extends Scanner<infer Fact>
          ? Fact
          : never,
        { readonly kind: "singular-for-many" }
      >
    ) =>
      makeRuleMessage(
        `${fact.nameText} names its result as singular ${fact.claimed}, but returns ${fact.cardinality}.`,
        `Rename the result noun to plural ${fact.plural} so the name matches the collection result.`
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "plural-for-one" }, makePluralForOneFindings),
      EffectMatch.when({ kind: "singular-for-many" }, makeSingularForManyFindings),
      EffectMatch.exhaustive
    )
  }

  const requireResultCardinalityNameConsistency = makeRule(
    "require-result-cardinality-name-consistency"
  )(requireResultCardinalityNameConsistencyScanner)(
    Function.constant(makeRequireResultCardinalityNameConsistencyFindings)
  )

  return requireResultCardinalityNameConsistency
}

export const requireResultCardinalityNameConsistency = makeRequireResultCardinalityNameConsistency()

const makeRequireResultShapeNameConsistency = () => {
  const makeRequireResultShapeNameConsistencyRuleMessage: RuleMessage<
    typeof requireResultShapeNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof requireResultShapeNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { nameText, expected, observed, label } = match.fact

      return makeRuleMessage(
        `${nameText} claims a ${expected} result via ${label}, but returns ${observed}.`,
        `Align the name with the actual result, or change the return type to ${expected}. ` +
          `Keep strong operation words only when the result shape matches.`
      )
    }

  const requireResultShapeNameConsistency = makeRule("require-result-shape-name-consistency")(
    requireResultShapeNameConsistencyScanner
  )(makeRequireResultShapeNameConsistencyRuleMessage)

  return requireResultShapeNameConsistency
}

export const requireResultShapeNameConsistency = makeRequireResultShapeNameConsistency()

export const resultConceptNamingRules: ReadonlyArray<Rule> = Array.make(preferResultConceptNames)

export const resultContractNamingRules: ReadonlyArray<Rule> = Array.make(
  requireResultCardinalityNameConsistency,
  requireResultShapeNameConsistency
)

export const semanticNamingRules: ReadonlyArray<Rule> = pipe(
  resultConceptNamingRules,
  Array.appendAll(predicateNamingRules),
  Array.appendAll(constructionNamingRules),
  Array.appendAll(lookupNamingRules),
  Array.appendAll(resultContractNamingRules),
  Array.appendAll(conversionNamingRules),
  Array.appendAll(commandNamingRules),
  Array.appendAll(callableRoleNamingRules)
)
