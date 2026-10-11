import { Array, Effect, Equivalence, Function, HashMap, HashSet, Option, Order, Struct, pipe } from "effect"
import { CandidateCountSchema, TallyRoundSchema, TallySchema, type Tally, type TallyRound } from "./domain.ts"

const tallyRounds: (
  remaining: ReadonlyArray<string>,
  ballots: ReadonlyArray<ReadonlyArray<string>>,
  rounds: ReadonlyArray<TallyRound>,
) => Effect.Effect<Tally> = Effect.fn("Elections.tallyRounds")(function* (
  remaining: ReadonlyArray<string>,
  ballots: ReadonlyArray<ReadonlyArray<string>>,
  rounds: ReadonlyArray<TallyRound>,
) {
  const eligible = HashSet.fromIterable(remaining)
  const increment = (current: number) => Option.some(current + 1)

  const countBallot = (votes: HashMap.HashMap<string, number>, ballot: ReadonlyArray<string>) => pipe(
    ballot,
    Array.findFirst((candidateId) => HashSet.has(eligible, candidateId)),
    Option.match({
      onNone: () => votes,
      onSome: (candidateId) => pipe(votes, HashMap.modifyAt(candidateId, (count) => pipe(
        count,
        Option.getOrElse(Function.constant(0)),
        increment,
      ))),
    }),
  )

  const initialVotes = HashMap.empty<string, number>()
  const votes = pipe(ballots, Array.reduce(initialVotes, countBallot))

  const candidateCount = (candidateId: string) => {
    const count = pipe(votes, HashMap.get(candidateId), Option.getOrElse(Function.constant(0)))

    return CandidateCountSchema.make({ candidateId, votes: count })
  }

  const counts = Array.map(remaining, candidateCount)
  const activeVotes = pipe(counts, Array.reduce(0, (total, count) => total + count.votes))
  const exhausted = ballots.length - activeVotes

  const finish = (outcome: Tally["outcome"], winnerId: Tally["winnerId"], tiedCandidateIds: Tally["tiedCandidateIds"]) => {
    const round = TallyRoundSchema.make({ counts, exhausted, eliminated: null })
    const completedRounds = Array.append(rounds, round)

    return TallySchema.make({ outcome, winnerId, tiedCandidateIds, ballotCount: ballots.length, rounds: completedRounds })
  }

  if (Equivalence.strictEqual()(activeVotes, 0)) {
    return finish("noVotes", null, [])
  }

  const winner = Array.findFirst(counts, (count) => count.votes > activeVotes / 2)

  if (Option.isSome(winner)) {
    return finish("winner", winner.value.candidateId, [])
  }

  const minimum = pipe(counts, Array.reduce(Infinity, (lowest, count) => Math.min(lowest, count.votes)))
  const hasMinimumVotes = (count: typeof CandidateCountSchema.Type) => Equivalence.strictEqual()(count.votes, minimum)

  const tiedCandidateIds = pipe(
    counts,
    Array.filter(hasMinimumVotes),
    Array.map(Struct.get("candidateId")),
  )

  if (tiedCandidateIds.length > 1) {
    return finish("tie", null, tiedCandidateIds)
  }

  const eliminated = pipe(tiedCandidateIds, Array.head, Option.getOrThrow)
  const eliminationRound = TallyRoundSchema.make({ counts, exhausted, eliminated })
  const nextRounds = Array.append(rounds, eliminationRound)
  const survives = (candidateId: string) => !Equivalence.strictEqual()(candidateId, eliminated)
  const survivors = Array.filter(remaining, survives)

  return yield* tallyRounds(survivors, ballots, nextRounds)
})

export const tally = Effect.fn("Elections.tally")(function* (
  candidateIds: ReadonlyArray<string>,
  ballots: ReadonlyArray<ReadonlyArray<string>>,
) {
  if (Equivalence.strictEqual()(ballots.length, 0)) {
    return TallySchema.make({ outcome: "noVotes", winnerId: null, tiedCandidateIds: [], ballotCount: 0, rounds: [] })
  }

  const remaining = pipe(candidateIds, Array.dedupe, Array.sort(Order.String))

  return yield* tallyRounds(remaining, ballots, [])
})
