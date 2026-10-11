import {
  Deferred,
  Effect,
  FiberSet,
  Queue,
  Stream,
  Tuple,
  pipe,
} from "effect"
import type { Algebra } from "./algebra.js"
import type { Operation } from "./operation.js"
import { execute } from "./program.js"
import type { Program } from "./program.js"
import type { Transition } from "./reducer.js"

type AlgebraInput<F extends Operation<unknown>> = {
  readonly [Tag in F["_tag"]]: (
    operation: Extract<F, { readonly _tag: Tag }>,
  ) => Effect.Effect<
    Extract<F, { readonly _tag: Tag }> extends Operation<infer Success>
      ? Success
      : never,
    unknown,
    unknown
  >
}

type AlgebraEffect<Handlers> = keyof Handlers extends never
  ? Effect.Effect<unknown, never, never>
  : ReturnType<Extract<Handlers[keyof Handlers], (...args: never) => unknown>>

interface StoreReducer<S, A, F extends Operation<unknown>> {
  readonly initialState: S
  readonly reduce: (state: S, action: A) => Transition<S, F, A>
}

export const define = <
  S,
  A,
  F extends Operation<unknown>,
  const Handlers extends AlgebraInput<F>,
>(
  reducer: StoreReducer<S, A, F>,
  algebra: Handlers,
) => {
  const stream = <InputError, InputServices>(
    actions: Stream.Stream<A, InputError, InputServices>,
  ) => {
    const seed = Stream.succeed(reducer.initialState)

    const emit = (
      states: Queue.Enqueue<
        S,
        | Effect.Error<AlgebraEffect<Handlers>>
        | InputError
        | unknown
      >,
    ) =>
      pipe(
        Effect.gen(function* () {

          const boundedRequests = Queue.bounded<
            readonly [
              A,
              Deferred.Deferred<Program<F, ReadonlyArray<A>>>,
            ]

          >(1)

          const requests = yield* Effect.acquireRelease(
            boundedRequests,
            Queue.shutdown,
          )

          const commands = yield* FiberSet.make<void>()

          const reduce = Effect.fn("Store.reduce")(function* (action: A) {
            const result = yield* Deferred.make<Program<F, ReadonlyArray<A>>>()
            const offered = yield* Queue.offer(requests, [action, result])

            if (!offered) {
              return yield* Effect.interrupt
            }

            return yield* Deferred.await(result)
          })

          const transitionState = Effect.fn("Store.transition")(function* (
            state: S,
            request: readonly [
              A,
              Deferred.Deferred<Program<F, ReadonlyArray<A>>>,
            ],
          ) {

            const action = Tuple.get(request, 0)
            const waiter = Tuple.get(request, 1)

            const result = yield* Effect.try({
              try: () => reducer.reduce(state, action),
              catch: (error) => error,
            })

            const offered = yield* Queue.offer(states, result.state)

            if (!offered) {
              return yield* Effect.interrupt
            }

            yield* Deferred.succeed(waiter, result.command)
            return result.state
          })

          const requestStream = Stream.fromQueue(requests)

          const scanned = Stream.scanEffect(
            requestStream,
            reducer.initialState,
            transitionState,
          )

          const drained = Stream.runDrain(scanned)

          const forwardedScan = pipe(
            drained,
            Effect.catch((error) => Queue.fail(states, error)),
          )

          yield* Effect.forkScoped(forwardedScan)

          const executeCommand = Effect.fn("Store.command")(function* (
            command: Program<F, ReadonlyArray<A>>,
          ): Effect.fn.Return<
            void,
            Effect.Error<AlgebraEffect<Handlers>>,
            Effect.Services<AlgebraEffect<Handlers>>
          > {

            const followUps = yield* execute(
              command,
              algebra as Algebra<
                F,
                Effect.Services<AlgebraEffect<Handlers>>,
                Effect.Error<AlgebraEffect<Handlers>>
              >,
            )


            const reduceFollowUp = (next: A) => {
              const nextCommand = reduce(next)
              return Effect.flatMap(nextCommand, executeCommand)
            }

            yield* Effect.forEach(followUps, reduceFollowUp, {
              discard: true,
            })
          })

          const handleInput = Effect.fn("Store.input")(function* (action: A) {
            const command = yield* reduce(action)

            const forwardedCommand = pipe(
              executeCommand(command),
              Effect.catch((error) => Queue.fail(states, error)),
              Effect.asVoid,
            )

            yield* FiberSet.run(commands, forwardedCommand, {
              startImmediately: true,
            })
          })

          yield* Stream.runForEach(actions, handleInput)
          yield* FiberSet.awaitEmpty(commands)
          yield* Queue.end(states)
        }),
        Effect.catch((error) => Queue.fail(states, error)),
      )

    const live = Stream.callback<
      S,
      | Effect.Error<AlgebraEffect<Handlers>>
      | InputError
      | unknown,
      Effect.Services<AlgebraEffect<Handlers>> | InputServices
    >(emit, { bufferSize: 1 })

    return Stream.concat(seed, live)
  }

  return Object.freeze({ stream })
}
