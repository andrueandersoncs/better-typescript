import { BunRuntime } from "@effect/platform-bun"
import { Context, Effect, Layer, Schema, pipe } from "effect"
import { Rpc, RpcGroup, RpcMiddleware } from "effect/unstable/rpc"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { StoragePrefix, StoredTextSchema } from "./prefix-codec.ts"
import { Authorization } from "effect-domains/authorization"
import { Resource } from "effect-domains/resource"
import { Application, Part } from "effect-domains/application"
import * as ApplicationBun from "effect-domains/application-bun"

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false

const emptyDefinition = Application.define({ name: "empty", parts: [] })
const emptyApplication = pipe(Application.compile(emptyDefinition), Effect.runSync)
const NoteSchema = Schema.Struct({ text: Schema.String })

interface Note extends Schema.Schema.Type<typeof NoteSchema> {}

const StoredNoteSchema = Schema.Struct({ text: StoredTextSchema })

interface StoredNote extends Schema.Schema.Type<typeof StoredNoteSchema> {}

const noteCapabilities = Resource.crud()

const Notes = Resource.define({
  name: "notes",
  schema: NoteSchema,
  storage: StoredNoteSchema,
  authorization: Authorization.public,
  capabilities: noteCapabilities,
})

const noteParts = [Part.resource(Notes)]

const NotesDefinition = Application.define({
  name: "codec-notes",
  parts: noteParts,
})

const NotesApplication = pipe(Application.compile(NotesDefinition), Effect.runSync)

const nestedParts = [Part.application(emptyDefinition), Part.application(NotesDefinition)]
const nestedDefinition = Application.define({ name: "nested-notes", parts: nestedParts })
const nestedNotes = pipe(Application.compile(nestedDefinition), Effect.runSync)

const missing = ApplicationBun.runApplication(nestedNotes, {
  database: { migrations: [] },
})

const storedPrefix = Layer.succeed(StoragePrefix, { value: "stored:" })

const storedTextRpc = Rpc.make("stored-text", {
  payload: StoredTextSchema,
  success: StoredTextSchema,
  error: Schema.Never,
})

const storedTextGroup = RpcGroup.make(storedTextRpc)
const storedTextParts = [Part.native({ group: storedTextGroup, handlers: Layer.empty })]
const storedTextDefinition = Application.define({ name: "stored-text", parts: storedTextParts })
const storedTextApplication = pipe(Application.compile(storedTextDefinition), Effect.runSync)

const storedTextCli = ApplicationBun.runApplication(storedTextApplication, {
  database: { migrations: [] },
  services: storedPrefix,
})

const complete = ApplicationBun.runApplication(nestedNotes, {
  database: { migrations: [] },
  services: storedPrefix,
})

class ExecutionDependency extends Context.Service<ExecutionDependency, {}>()("test/ApplicationBunExecution/ExecutionDependency") {}
class ExecutionOutput extends Context.Service<ExecutionOutput, {}>()("test/ApplicationBunExecution/ExecutionOutput") {}
class BackgroundDependency extends Context.Service<BackgroundDependency, {}>()("test/ApplicationBunExecution/BackgroundDependency") {}
class RoutesDependency extends Context.Service<RoutesDependency, {}>()("test/ApplicationBunExecution/RoutesDependency") {}

const makeExecution = Effect.gen(function* () {
  yield* ExecutionDependency

  return {}
})

const execution = Layer.effect(ExecutionOutput, makeExecution)

const executionOutput = Effect.gen(function* () {
  yield* ExecutionOutput
})

const background = pipe(BackgroundDependency, Effect.asVoid, Layer.effectDiscard)

const route = Effect.gen(function* () {
  yield* RoutesDependency

  return HttpServerResponse.empty()
})

const routes = HttpRouter.add("GET", "/probe", route)
const services = pipe(Layer.effectDiscard(executionOutput), Layer.provideMerge(execution))

const nativeRuntime = ApplicationBun.runApplication(emptyApplication, {
  database: { migrations: [] },
  services,
  initialize: executionOutput,
  background,
  routes,
})

class MiddlewareRequirement extends RpcMiddleware.Service<MiddlewareRequirement>()("test/ApplicationBunExecution/MiddlewareRequirement", {
  error: Schema.Never,
}) {}

const middlewareRpc = Rpc.make("middleware-requirement", {
  payload: Schema.Void,
  success: Schema.Void,
  error: Schema.Never,
})

const middlewareGroup = RpcGroup.make(middlewareRpc).middleware(MiddlewareRequirement)

const middlewareParts = [Part.native({ group: middlewareGroup, handlers: Layer.empty })]
const middlewareDefinition = Application.define({ name: "middleware-requirement", parts: middlewareParts })
const middlewareApplication = pipe(Application.compile(middlewareDefinition), Effect.runSync)

const middlewareRuntime = ApplicationBun.runApplication(middlewareApplication, {
  database: { migrations: [] },
})

const minimal = ApplicationBun.runApplication(emptyApplication, {
  database: { migrations: [] },
  ui: true,
})

BunRuntime.runMain(complete)

// @ts-expect-error Entry points cannot run because StoragePrefix remains a requirement.
BunRuntime.runMain(missing)

// @ts-expect-error Entry points cannot run because the wire codec still requires StoragePrefix.
BunRuntime.runMain(storedTextCli)

// A missing storage service remains a caller requirement because it is not needed by the wire client.
const preservesMissing = true satisfies Equal<Effect.Services<typeof missing>, StoragePrefix>
const dischargesProvided = true satisfies Equal<Effect.Services<typeof complete>, never>

const preservesNativeRequirements = true satisfies Equal<
  Effect.Services<typeof nativeRuntime>,
  ExecutionDependency | BackgroundDependency | RoutesDependency
>


const preservesMiddlewareRequirement = true satisfies Equal<
  Effect.Services<typeof middlewareRuntime>,
  MiddlewareRequirement
>

void preservesMiddlewareRequirement
void preservesNativeRequirements

const defaultsAreRunnable = true satisfies Equal<Effect.Services<typeof minimal>, never>
const preservesWireCodec = true satisfies Equal<Effect.Services<typeof storedTextCli>, StoragePrefix>

const isolatesWire = true satisfies Equal<
  Rpc.ServicesClient<RpcGroup.Rpcs<typeof NotesApplication.group>>,
  never
>

void preservesMissing
void dischargesProvided
void defaultsAreRunnable
void isolatesWire
void preservesWireCodec
