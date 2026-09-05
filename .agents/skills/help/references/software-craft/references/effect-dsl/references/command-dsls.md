# Command DSLs

Use this shape for a command vocabulary or a static command program. A command is data that records a request; composition and an interpreter make the commands a language.

## Minimal Effect v4 shape

```ts
import { Effect, Match, Schema } from "effect"

export const Command = Schema.TaggedUnion({
  CreateUser: {
    name: Schema.String
  },
  SendEmail: {
    to: Schema.String,
    subject: Schema.String
  }
})
export type Command = Schema.Schema.Type<typeof Command>

export const Program = Schema.Array(Command)
export type Program = Schema.Schema.Type<typeof Program>

export const createUser = (name: string): Command =>
  Command.cases.CreateUser.make({ name })

export const sendEmail = (to: string, subject: string): Command =>
  Command.cases.SendEmail.make({ to, subject })

export const interpret = Match.type<Command>().pipe(
  Match.tagsExhaustive({
    CreateUser: ({ name }) => Effect.logInfo("Create user", name),
    SendEmail: ({ to, subject }) => Effect.logInfo("Send email", { to, subject })
  })
)

export const execute = (program: Program) =>
  Effect.forEach(program, interpret, { discard: true })

export const decodeAndExecute = (input: unknown) =>
  Schema.decodeUnknownEffect(Program)(input).pipe(Effect.flatMap(execute))
```

Replace the logging effects with focused services. The interpreter's resulting `Effect` accumulates their typed errors and requirements.

## Design rules

- Use an array or another data-only structure when the full sequence is known during construction.
- Use a continuation-bearing representation when a command's typed result chooses the next command. Function continuations provide in-memory composition; persistence requires a data representation for the continuation.
