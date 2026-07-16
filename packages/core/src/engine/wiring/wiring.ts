import { makeRe } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import {
  Array,
  Effect,
  Function,
  HashSet,
  Option,
  Predicate,
  Result,
  Stream,
  Struct,
  pipe
} from "effect"
import type { Check } from "../check/data.js"
import { collectSignals } from "../derive/derive.js"
import type { Advice } from "../derive/data.js"
import type { NonEmptyRefactorExamples, RefactorExample } from "../example/data.js"
import type { Signal } from "../signal/data.js"
import {
  DuplicateCheckNamesError,
  DuplicateNameState,
  InvalidWiringFilesError,
  NamedCheck,
  Wiring,
  WiringEntry
} from "./data.js"
import type { WiringConfig } from "./data.js"

const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

const hasNonWhitespace = (pattern: string): boolean => pattern.trim().length > 0

/**
 * True when a wiring files entry is a non-empty, non-whitespace glob string.
 *
 * @remarks
 *   Canonicalized here so configuration loading and defineConfig share one
 *   predicate instead of drifting copies.
 */
export const isFileGlob = Predicate.and(Predicate.isString, hasNonWhitespace)

const emptyRefactorExamples: ReadonlyArray<RefactorExample> = Array.empty()
const emptyRefactorExamplesThunk = Function.constant(emptyRefactorExamples)

/**
 * NamedCheck that participates in report rendering.
 *
 * @remarks
 *   Examples stay a thunk so wiring construction does not load remediation
 *   fixtures until a reported signal needs them.
 */
export const namedCheck = (
  name: string,
  check: Check,
  examples: () => NonEmptyRefactorExamples
): NamedCheck =>
  new NamedCheck({
    name,
    check,
    reported: true,
    examples
  })

/**
 * NamedCheck that runs and feeds derivation without rendering local blocks.
 *
 * @remarks
 *   Default examples are a constant empty thunk because silent checks rarely need
 *   remediation text and callers should not allocate a fresh empty array.
 */
export const silentCheck = (
  name: string,
  check: Check,
  examples: () => ReadonlyArray<RefactorExample> = emptyRefactorExamplesThunk
): NamedCheck =>
  new NamedCheck({
    name,
    check,
    reported: false,
    examples
  })

const emptyDuplicateNamesSeen = HashSet.empty<string>()
const emptyDuplicateNameCollisions = HashSet.empty<string>()
const emptyDuplicateNames = Array.empty<string>()

const emptyDuplicateNameState: DuplicateNameState = new DuplicateNameState({
  seen: emptyDuplicateNamesSeen,
  collisions: emptyDuplicateNameCollisions,
  names: emptyDuplicateNames
})

const addDuplicateName = (state: DuplicateNameState, check: NamedCheck): DuplicateNameState => {
  const name = check.name
  const alreadySeen = HashSet.has(state.seen, name)
  const alreadyCollision = HashSet.has(state.collisions, name)

  if (!alreadySeen) {
    const seen = HashSet.add(state.seen, name)

    return new DuplicateNameState({
      seen,
      collisions: state.collisions,
      names: state.names
    })
  }

  if (alreadyCollision) {
    return state
  }

  const collisions = HashSet.add(state.collisions, name)
  const names = Array.append(state.names, name)

  return new DuplicateNameState({
    seen: state.seen,
    collisions,
    names
  })
}

const validateCheckNames = <A>(checks: ReadonlyArray<NamedCheck>, value: A): A => {
  const names = Array.reduce(checks, emptyDuplicateNameState, addDuplicateName).names

  if (names.length === 0) {
    return value
  }

  const duplicateNamesError = new DuplicateCheckNamesError({ names })
  const failed = Effect.fail(duplicateNamesError)

  return Effect.runSync(failed)
}

/**
 * Validate check-name uniqueness and construct one Wiring.
 *
 * @remarks
 *   Validation runs at construction so duplicate names fail before any project
 *   analysis starts.
 */
export const makeWiring = <E = never>(
  definition: Pick<Wiring<E>, "checks" | "derive">
): Wiring<E> => {
  const wiring = new Wiring<E>(definition)
  return validateCheckNames(wiring.checks, wiring)
}

/**
 * Concatenate member wirings' checks and derive streams in order.
 *
 * @remarks
 *   Name collisions use the same validator as makeWiring so merged presets fail
 *   the same way as a hand-authored wiring with duplicate names. Derive
 *   concatenation preserves member order because later advice must not reorder
 *   earlier members' emissions.
 */
export const mergeWirings = <E = never>(wirings: ReadonlyArray<Wiring<E>>): Wiring<E> => {
  const checks = Array.flatMap(wirings, Struct.get("checks"))

  const derive: Wiring<E>["derive"] = (signals) => {
    const streams = Array.map(wirings, (wiring) => wiring.derive(signals))

    return pipe(
      Array.head(streams),
      Option.match({
        onNone: () => Stream.empty,
        onSome: (head) => {
          const rest = Array.drop(streams, 1)

          return Array.reduce(rest, head, (advice, next) => Stream.concat(advice, next))
        }
      })
    )
  }

  return makeWiring({ checks, derive })
}

/**
 * Within one batch, derivation consumes the complete materialized signal array.
 *
 * @remarks
 *   Full-array input is required because advice must see every signal from the
 *   same batch, not a partial stream.
 */
export const deriveAdvice =
  <E>(wiring: Wiring<E>) =>
  (signals: ReadonlyArray<Signal>): Effect.Effect<ReadonlyArray<Advice>, E> =>
    pipe(wiring.derive(signals), collectSignals)

/**
 * Validate file globs, compile patterns, and seal one WiringConfig.
 *
 * @remarks
 *   Glob compilation happens here so invalid patterns fail at config load, not
 *   mid-analysis. Cross-entry check names are validated once over the flattened
 *   check list.
 */
export const defineConfig = <E = never>(
  config: ReadonlyArray<{
    readonly files: Array.NonEmptyReadonlyArray<string>
    readonly wiring: Pick<Wiring<E>, "checks" | "derive">
  }>
): WiringConfig<E> => {
  const invalidIndexes = Array.filterMap(config, (entry, index) => {
    const hasFiles = entry.files.length > 0
    const hasOnlyNonEmptyPatterns = Array.every(entry.files, isFileGlob)

    return hasFiles && hasOnlyNonEmptyPatterns ? Result.failVoid : Result.succeed(index)
  })

  if (invalidIndexes.length > 0) {
    const invalidFilesError = new InvalidWiringFilesError({
      indexes: invalidIndexes
    })

    const failed = Effect.fail(invalidFilesError)

    return Effect.runSync(failed)
  }

  const entries = Array.map(config, (entry) => {
    Array.forEach(entry.files, (pattern) => {
      makeRe(pattern, globOptions)
    })

    const wiring = makeWiring(entry.wiring)

    return new WiringEntry<E>({
      files: entry.files,
      wiring
    })
  })

  const checks = Array.flatMap(entries, (entry) => entry.wiring.checks)

  return validateCheckNames(checks, entries)
}
