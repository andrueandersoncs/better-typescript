import {
  SessionManager,
  createAgentSession,
  type AgentSessionEvent,
  type CreateAgentSessionResult
} from "@oh-my-pi/pi-coding-agent"
import { Array, Effect, Function, Match, pipe } from "effect"

const sessionManager = SessionManager.inMemory()
const noTools = Array.empty<string>()
const systemPrompt = Array.of("Reply to every prompt with exactly: hello world")

const createSession = () =>
  createAgentSession({
    sessionManager,
    disableExtensionDiscovery: true,
    enableMCP: false,
    enableLsp: false,
    toolNames: noTools,
    restrictToolNames: true,
    systemPrompt
  })

const acquireSession = Effect.promise(createSession)

const releaseSession = (result: CreateAgentSessionResult) =>
  Effect.promise(() => result.session.dispose())

const sessionResource = Effect.acquireRelease(acquireSession, releaseSession)

const writeTextDelta = pipe(
  Match.type<AgentSessionEvent>(),
  Match.when(
    {
      type: "message_update",
      assistantMessageEvent: { type: "text_delta" }
    },
    (event) => {
      process.stdout.write(event.assistantMessageEvent.delta)
    }
  ),
  Match.orElse(Function.constVoid)
)

const acquireSubscription = (session: CreateAgentSessionResult["session"]) =>
  Effect.sync(() => session.subscribe(writeTextDelta))

const releaseSubscription = Effect.sync

const subscriptionResource = (session: CreateAgentSessionResult["session"]) => {
  const acquire = acquireSubscription(session)

  return Effect.acquireRelease(acquire, releaseSubscription)
}

const writeNewline = Effect.sync(() => {
  process.stdout.write("\n")
})

const sessionProgram = Effect.gen(function* () {
  const { session } = yield* sessionResource

  yield* subscriptionResource(session)
  yield* Effect.promise(() => session.prompt("Say exactly: hello world"))
  yield* writeNewline
})

const program = Effect.scoped(sessionProgram)

await Effect.runPromise(program)
