import { workflow, gen, step, agent, forEach, verify } from "@open-workflows/core"
import { Schema, Effect } from "effect"

const Argument = Schema.Struct({
  side: Schema.Literal("pro", "con"),
  point: Schema.String,
  strength: Schema.Literal("weak", "moderate", "strong"),
})

const Verdict = Schema.Struct({
  winner: Schema.Literal("pro", "con", "tie"),
  reasoning: Schema.String,
  keyPoints: Schema.Array(Schema.String),
})

/**
 * A structured debate workflow: fan out pro and con arguments in parallel,
 * then have a judge agent synthesize a verdict.
 */
export default workflow(
  "debate",
  {
    payload: Schema.Struct({
      topic: Schema.String,
      rounds: Schema.Number,
    }),
    success: Verdict,
  },
  ({ topic, rounds }) =>
    gen(function* () {
      const roundList = yield* step<number[]>(
        "plan-rounds",
        Effect.succeed(Array.from({ length: rounds }, (_, i) => i + 1)),
      )

      const proArgs = yield* forEach(
        roundList,
        (round) =>
          agent("pro-arg", {
            prompt: `Round ${round} of a debate on: "${topic}". You are arguing FOR this topic. Give your strongest argument for this round. Return JSON with { side: "pro", point: string, strength: "weak"|"moderate"|"strong" }.`,
            schema: Argument,
          }),
        { concurrency: "engine" },
      )

      const conArgs = yield* forEach(
        roundList,
        (round) =>
          agent("con-arg", {
            prompt: `Round ${round} of a debate on: "${topic}". You are arguing AGAINST this topic. Give your strongest argument for this round. Return JSON with { side: "con", point: string, strength: "weak"|"moderate"|"strong" }.`,
            schema: Argument,
          }),
        { concurrency: "engine" },
      )

      const allArgs = [...proArgs, ...conArgs]

      const verdict = yield* agent("judge", {
        prompt: `Judge this debate on "${topic}".\n\nArguments:\n${allArgs.map((a, i) => `${i + 1}. [${a.side}] ${a.point} (strength: ${a.strength})`).join("\n")}\n\nReturn JSON with { winner: "pro"|"con"|"tie", reasoning: string, keyPoints: string[] }.`,
        schema: Verdict,
      })

      return verdict
    }),
)
