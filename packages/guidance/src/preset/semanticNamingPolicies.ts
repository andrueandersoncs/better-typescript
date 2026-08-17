import { Array, Function, pipe, Match as EffectMatch } from "effect"
import type { Guidance } from "@better-typescript/core/engine/policy/guidance"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { dataModelMatcherCatalog } from "@better-typescript/matchers/builtins/dataModelMatcherCatalog"
import { namingMatcherCatalog } from "@better-typescript/matchers/builtins/namingMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"

const makePreferSpecificOperationNames = () => {
  const preferSpecificOperationNamesGuidance: Guidance<
    typeof namingMatcherCatalog.preferSpecificOperationNamesMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof namingMatcherCatalog.preferSpecificOperationNamesMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) => {
      const { nameText, vague, role, renamed } = match.fact

      return makeFindings(
        match.target,
        `${nameText} uses the vague operation ${vague}, but its body has a unique ${role} role.`,
        `Rename to ${renamed}, preserving the known object or result noun.`,
        match.fact
      )
    }

  const preferSpecificOperationNames = makeBuiltinPolicy({
    name: "prefer-specific-operation-names",
    matcher: namingMatcherCatalog.preferSpecificOperationNamesMatcher,
    guidance: preferSpecificOperationNamesGuidance,
    reported: true,
    stage: "program"
  })

  return preferSpecificOperationNames
}

export const preferSpecificOperationNames = makePreferSpecificOperationNames()

const makeRequireCallableRoleNameConsistency = () => {
  const requireCallableRoleNameConsistencyGuidance: Guidance<
    typeof namingMatcherCatalog.requireCallableRoleNameConsistencyMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof namingMatcherCatalog.requireCallableRoleNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { nameText, role, expected } = match.fact

      return makeFindings(
        match.target,
        `${nameText} claims the ${role} role, but does not provide ${expected}.`,
        `Rename away from the ${role} role noun, or change the signature and body so the ` +
          `${role} contract holds.`,
        match.fact
      )
    }

  const requireCallableRoleNameConsistency = makeBuiltinPolicy({
    name: "require-callable-role-name-consistency",
    matcher: namingMatcherCatalog.requireCallableRoleNameConsistencyMatcher,
    guidance: requireCallableRoleNameConsistencyGuidance,
    reported: true,
    stage: "program"
  })

  return requireCallableRoleNameConsistency
}

export const requireCallableRoleNameConsistency = makeRequireCallableRoleNameConsistency()

const makeRequirePredicateNameConsistency = () => {
  const makeRequirePredicateNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requirePredicateNameConsistencyMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeNonBooleanPredicateFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requirePredicateNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "non-boolean-predicate" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims a predicate, but its result shape is ${fact.shape}.`,
        "Rename the function so its operation matches the non-boolean result, or return a " +
          "boolean or type-predicate result.",
        match.fact
      )

    const makeBooleanIncompatibleFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requirePredicateNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "boolean-incompatible" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} returns boolean, but claims the ${fact.operation} operation.`,
        "Rename with predicate vocabulary such as is, has, can, should, does, equal, " +
          "contain, include, match, exist, every, some, startsWith, or endsWith.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "non-boolean-predicate" }, makeNonBooleanPredicateFindings),
      EffectMatch.when({ kind: "boolean-incompatible" }, makeBooleanIncompatibleFindings),
      EffectMatch.exhaustive
    )
  }

  const requirePredicateNameConsistency = makeBuiltinPolicy({
    name: "require-predicate-name-consistency",
    matcher: namingMatcherCatalog.requirePredicateNameConsistencyMatcher,
    guidance: Function.constant(makeRequirePredicateNameConsistencyFindings),
    reported: true,
    stage: "program"
  })

  return requirePredicateNameConsistency
}

export const requirePredicateNameConsistency = makeRequirePredicateNameConsistency()

export const predicateNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requirePredicateNameConsistency
)

export const callableRoleNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireCallableRoleNameConsistency,
  preferSpecificOperationNames
)

const makeRequireCommandNameConsistency = () => {
  const makeRequireCommandNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireCommandNameConsistencyMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeFalseCommandFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireCommandNameConsistencyMatcher extends Matcher<infer Fact>
          ? Fact
          : never,
        { readonly kind: "false-command" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims the command ${fact.operation}, but its result and body do not provide command evidence.`,
        "Rename away from the command verb, or implement a true command with a void or Effect.void result.",
        match.fact
      )

    const makeHiddenCommandFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireCommandNameConsistencyMatcher extends Matcher<infer Fact>
          ? Fact
          : never,
        { readonly kind: "hidden-command" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} is a void command named like an accessor, projection, or result, not a command.`,
        "Rename with command language such as save, write, send, publish, set, update, remove, or delete.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "false-command" }, makeFalseCommandFindings),
      EffectMatch.when({ kind: "hidden-command" }, makeHiddenCommandFindings),
      EffectMatch.exhaustive
    )
  }

  const requireCommandNameConsistency = makeBuiltinPolicy({
    name: "require-command-name-consistency",
    matcher: namingMatcherCatalog.requireCommandNameConsistencyMatcher,
    guidance: Function.constant(makeRequireCommandNameConsistencyFindings),
    reported: true,
    stage: "program"
  })

  return requireCommandNameConsistency
}

export const requireCommandNameConsistency = makeRequireCommandNameConsistency()

const makeRequireLookupTotalityNameConsistency = () => {
  const makeRequireLookupTotalityNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const makeAbsenceClaimFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "optional-claim" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims optional lookup via ${fact.claimLabel}, but returns total data.`,
        "Return optional or fallible data (Option, nullish, Result), or remove find/lookup/maybe/optional from the name.",
        match.fact
      )

    const makePresenceClaimFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "total-claim" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims required access via ${fact.claimLabel}, but returns optional data.`,
        "Return total data, or remove require/unsafe/getOrThrow/getOrElse from the name.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "optional-claim" }, makeAbsenceClaimFindings),
      EffectMatch.when({ kind: "total-claim" }, makePresenceClaimFindings),
      EffectMatch.exhaustive
    )
  }

  const requireLookupTotalityNameConsistency = makeBuiltinPolicy({
    name: "require-lookup-totality-name-consistency",
    matcher: namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher,
    guidance: Function.constant(makeRequireLookupTotalityNameConsistencyFindings),
    reported: true,
    stage: "program"
  })

  return requireLookupTotalityNameConsistency
}

export const requireLookupTotalityNameConsistency = makeRequireLookupTotalityNameConsistency()

export const lookupNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireLookupTotalityNameConsistency
)

export const commandNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireCommandNameConsistency
)

const makeRequireConstructionNameConsistency = () => {
  const makeRequireConstructionNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireConstructionNameConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const makeFactoryMasqueradeFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireConstructionNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "factory-masquerade" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims factory construction via ${fact.operation}, but looks up or projects existing data.`,
        "Rename with lookup or projection vocabulary, or return a freshly constructed value.",
        match.fact
      )

    const makeUnnamedConstructionFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireConstructionNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "unnamed-construction" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} constructs a value, but does not use construction vocabulary.`,
        "Rename with make/create/build/construct (for example makeUser), or use a recognized " +
          "variant constructor such as some/none/left/right/succeed/fail/of.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "factory-masquerade" }, makeFactoryMasqueradeFindings),
      EffectMatch.when({ kind: "unnamed-construction" }, makeUnnamedConstructionFindings),
      EffectMatch.exhaustive
    )
  }

  const requireConstructionNameConsistency = makeBuiltinPolicy({
    name: "require-construction-name-consistency",
    matcher: namingMatcherCatalog.requireConstructionNameConsistencyMatcher,
    guidance: Function.constant(makeRequireConstructionNameConsistencyFindings),
    reported: true,
    stage: "program"
  })

  return requireConstructionNameConsistency
}

export const requireConstructionNameConsistency = makeRequireConstructionNameConsistency()

const makeRequireConversionDirectionConsistency = () => {
  const makeRequireConversionDirectionConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireConversionDirectionConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
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

    return makeFindings(match.target, message, hint, match.fact)
  }

  const requireConversionDirectionConsistency = makeBuiltinPolicy({
    name: "require-conversion-direction-consistency",
    matcher: namingMatcherCatalog.requireConversionDirectionConsistencyMatcher,
    guidance: Function.constant(makeRequireConversionDirectionConsistencyFindings),
    reported: true,
    stage: "program"
  })

  return requireConversionDirectionConsistency
}

export const requireConversionDirectionConsistency = makeRequireConversionDirectionConsistency()

export const constructionNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireConstructionNameConsistency
)

export const conversionNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireConversionDirectionConsistency
)

const makePreferResultConceptNames = () => {
  const preferResultConceptNamesGuidance: Guidance<
    typeof namingMatcherCatalog.preferResultConceptNamesMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof namingMatcherCatalog.preferResultConceptNamesMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) => {
      const { nameText, claimed, expected } = match.fact

      return makeFindings(
        match.target,
        `${nameText} names its result as ${claimed}, but it returns ${expected}.`,
        `Rename the result phrase to ${expected}. Preserve operation and source qualifiers, ` +
          `using ${expected}FromSource or sourceTo${expected} when direction matters.`,
        match.fact
      )
    }

  const preferResultConceptNames = makeBuiltinPolicy({
    name: "prefer-result-concept-names",
    matcher: namingMatcherCatalog.preferResultConceptNamesMatcher,
    guidance: preferResultConceptNamesGuidance,
    reported: true,
    stage: "program"
  })

  return preferResultConceptNames
}

export const preferResultConceptNames = makePreferResultConceptNames()

const makeRequireResultCardinalityNameConsistency = () => {
  const makeRequireResultCardinalityNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const makePluralForOneFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "plural-for-one" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} names its result as plural ${fact.claimed}, but returns ${fact.cardinality}.`,
        `Rename the result noun to singular ${fact.singular} so the name matches a single returned value.`,
        match.fact
      )

    const makeSingularForManyFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "singular-for-many" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} names its result as singular ${fact.claimed}, but returns ${fact.cardinality}.`,
        `Rename the result noun to plural ${fact.plural} so the name matches the collection result.`,
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "plural-for-one" }, makePluralForOneFindings),
      EffectMatch.when({ kind: "singular-for-many" }, makeSingularForManyFindings),
      EffectMatch.exhaustive
    )
  }

  const requireResultCardinalityNameConsistency = makeBuiltinPolicy({
    name: "require-result-cardinality-name-consistency",
    matcher: namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher,
    guidance: Function.constant(makeRequireResultCardinalityNameConsistencyFindings),
    reported: true,
    stage: "program"
  })

  return requireResultCardinalityNameConsistency
}

export const requireResultCardinalityNameConsistency = makeRequireResultCardinalityNameConsistency()

const makeRequireResultShapeNameConsistency = () => {
  const requireResultShapeNameConsistencyGuidance: Guidance<
    typeof dataModelMatcherCatalog.requireResultShapeNameConsistencyMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof dataModelMatcherCatalog.requireResultShapeNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { nameText, expected, observed, label } = match.fact

      return makeFindings(
        match.target,
        `${nameText} claims a ${expected} result via ${label}, but returns ${observed}.`,
        `Align the name with the actual result, or change the return type to ${expected}. ` +
          `Keep strong operation words only when the result shape matches.`,
        match.fact
      )
    }

  const requireResultShapeNameConsistency = makeBuiltinPolicy({
    name: "require-result-shape-name-consistency",
    matcher: dataModelMatcherCatalog.requireResultShapeNameConsistencyMatcher,
    guidance: requireResultShapeNameConsistencyGuidance,
    reported: true,
    stage: "program"
  })

  return requireResultShapeNameConsistency
}

export const requireResultShapeNameConsistency = makeRequireResultShapeNameConsistency()

export const resultConceptNamingPolicies: ReadonlyArray<Policy> =
  Array.make(preferResultConceptNames)

export const resultContractNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireResultCardinalityNameConsistency,
  requireResultShapeNameConsistency
)

// Member order is pinned because concatenated categories define the public report block order.
export const semanticNamingPolicies: ReadonlyArray<Policy> = pipe(
  resultConceptNamingPolicies,
  Array.appendAll(predicateNamingPolicies),
  Array.appendAll(constructionNamingPolicies),
  Array.appendAll(lookupNamingPolicies),
  Array.appendAll(resultContractNamingPolicies),
  Array.appendAll(conversionNamingPolicies),
  Array.appendAll(commandNamingPolicies),
  Array.appendAll(callableRoleNamingPolicies)
)
