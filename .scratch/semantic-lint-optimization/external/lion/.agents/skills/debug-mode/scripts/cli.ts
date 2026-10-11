import { Args, Command } from "@effect/cli"
import { FetchHttpClient, HttpClient, HttpMiddleware, HttpRouter, HttpServer, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { BunContext, BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { FileSystem, Path } from "@effect/platform"
import { Config, Duration, Effect, Layer, pipe, Schema } from "effect"
import * as Crypto from "node:crypto"

const generateId = () => Crypto.randomBytes(3).toString("hex")

const toKebabCase = (str: string) =>
    str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")

const SessionBody = Schema.Struct({
    name: Schema.optionalWith(Schema.String, { default: () => "debug" })
})

const LogBody = Schema.Struct({
    sessionId: Schema.optionalWith(Schema.String, { default: () => "default" }),
    msg: Schema.optional(Schema.String),
}).pipe(Schema.extend(Schema.Record({ key: Schema.String, value: Schema.Unknown })))

const makeRouter = (logDir: string) =>
    HttpRouter.empty.pipe(
        HttpRouter.get("/", Effect.gen(function* () {
            return yield* HttpServerResponse.json({ status: "ok", log_dir: logDir })
        })),

        HttpRouter.post("/session", Effect.gen(function* () {
            const path = yield* Path.Path
            const fs = yield* FileSystem.FileSystem
            const body = yield* HttpServerRequest.schemaBodyJson(SessionBody)
            const name = toKebabCase(body.name)
            const sessionId = `${name}-${generateId()}`
            const logFile = path.join(logDir, `debug-${sessionId}.log`)

            yield* fs.writeFileString(logFile, "")
            yield* Effect.log(`[session] Created: ${sessionId}`)

            return yield* HttpServerResponse.json({ session_id: sessionId, log_file: logFile })
        })),

        HttpRouter.post("/log", Effect.gen(function* () {
            const path = yield* Path.Path
            const fs = yield* FileSystem.FileSystem
            const body = yield* HttpServerRequest.schemaBodyJson(LogBody)
            const { sessionId, ...rest } = body
            const logFile = path.join(logDir, `debug-${sessionId}.log`)
            const entry = { ts: new Date().toISOString(), ...rest }

            yield* fs.writeFileString(logFile, JSON.stringify(entry) + "\n", { flag: "a" })
            yield* Effect.log(`[${sessionId}] ${entry.msg ?? JSON.stringify(entry).slice(0, 80)}`)

            return yield* HttpServerResponse.json({ ok: true, log_file: logFile })
        })),

        HttpRouter.catchAll((error) =>
            HttpServerResponse.json({ error: String(error) }, { status: 400 })
        ),

        HttpMiddleware.cors()
    )

const directory = pipe(
    Args.text({ name: "directory" }),
    Args.withDescription("The relative path to your project's directory. A .debug/ directory will be created at this path.")
)

const serve = Command.make("serve", { directory }, ({ directory }) =>
    Effect.gen(function* () {
        const logSubdir = yield* Config.string("DEBUG_LOG_DIR").pipe(Config.withDefault(".debug"))
        const port = yield* Config.integer("DEBUG_PORT").pipe(Config.withDefault(8787))
        const path = yield* Path.Path
        const logDir = path.resolve(directory, logSubdir)

        // Check if server is already running
        const client = yield* HttpClient.HttpClient
        const alreadyRunning = yield* client.get(`http://localhost:${port}`).pipe(
            Effect.map((res) => res.status === 200),
            Effect.timeout(Duration.millis(500)),
            Effect.orElseSucceed(() => false)
        )

        if (alreadyRunning) {
            yield* Effect.log(JSON.stringify({
                status: "already_running",
                log_dir: logDir,
                endpoint: `http://localhost:${port}/log`,
            }))
            return
        }

        const fs = yield* FileSystem.FileSystem
        yield* fs.makeDirectory(logDir, { recursive: true })

        const router = makeRouter(logDir)

        const ServerLive = BunHttpServer.layer({ port })

        const app = pipe(
            router,
            HttpServer.serve(),
            HttpServer.withLogAddress,
            Layer.provide(ServerLive)
        )

        yield* Layer.launch(app)
    }));

const toLogFileBase = (raw: string) => {
    const base = raw.endsWith(".log") ? raw.slice(0, -4) : raw
    return base.startsWith("debug-") ? base : `debug-${base}`
}

const action = pipe(
    Args.choice([["clear", "clear"] as const, ["remove", "remove"] as const]),
    Args.withDescription("Action to perform: clear (truncate) or remove (delete)")
)

const sessionId = pipe(
    Args.text({ name: "sessionId" }),
    Args.withDescription("Session ID or log file base name")
)

const cleanup = Command.make("cleanup", { action, directory, sessionId }, ({ action, directory, sessionId }) =>
    Effect.gen(function* () {
        const logSubdir = yield* Config.string("DEBUG_LOG_DIR").pipe(Config.withDefault(".debug"))
        const path = yield* Path.Path
        const fs = yield* FileSystem.FileSystem

        const logDir = path.join(directory, logSubdir)
        const logFile = path.join(logDir, `${toLogFileBase(sessionId)}.log`)

        const exists = yield* fs.exists(logFile)
        if (!exists) {
            yield* Effect.fail(new Error(`Log file not found: ${logFile}`))
        }

        if (action === "clear") {
            yield* fs.writeFileString(logFile, "")
            yield* Effect.log(`Cleared: ${logFile}`)
        } else {
            yield* fs.remove(logFile)
            yield* Effect.log(`Removed: ${logFile}`)
        }
    }));

const debug = Command.make("debug", {}, Effect.succeed)

const command = pipe(
    debug,
    Command.withSubcommands([serve, cleanup])
)

const cli = Command.run(command, {
    name: "Debug Server CLI",
    version: "v1.0.0"
})

cli(process.argv).pipe(
    Effect.provide(Layer.merge(BunContext.layer, FetchHttpClient.layer)),
    BunRuntime.runMain
)
