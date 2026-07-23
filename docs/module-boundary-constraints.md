# TypeScript module-boundary constraints

A TypeScript source file is an architectural boundary: it controls which names a consumer can reach,
which implementation details remain private, and which dependencies a reader must inspect to
understand a concept. A module boundary is useful when its path, exports, and direct imports let a
reader predict the concept it owns and the consequences of changing it.

These are principle-level constraints for repository-owned, non-generated TypeScript source files.

## Definitions

1. **Module.** One ECMAScript source file. Imports and exports are file-scoped; neither a directory
   nor a region within a file is a module boundary.

   ```ts
   // User.ts — one module
   export const displayName = (user: User): string => user.displayName

   // RegisterUser.ts — a different module can reach the export only by importing it.
   import { displayName } from "./User.js"
   ```

2. **Import declaration.** An import declaration gives one module access to a public declaration from
   another module.

   ```ts
   // RegisterUser.ts
   import { User } from "./User.js"

   const user = new User({ id: userId, displayName: "Ada" })
   ```

3. **Export declaration.** An export declaration makes a top-level declaration reachable to consumers
   of its module.

   ```ts
   // User.ts
   export const displayName = (user: User): string => user.displayName

   // Consumer.ts
   import { displayName } from "./User.js"
   const label: string = displayName(user)
   ```

4. **Public declaration.** A declaration a consumer can name through a module import: a top-level
   exported value, class, or type, or a public constructor, static member, or instance member of an
   exported class.

   ```ts
   // User.ts
   export class User {
     static readonly empty = new User()

     displayName(): string {
       return "Anonymous"
     }
   }

   // Consumer.ts names each public declaration through its import.
   import { User } from "./User.js"

   const empty: User = User.empty
   const label: string = new User().displayName()
   ```

5. **Public operation.** A callable public declaration. Its contract consists of accepted inputs and
   its success, failure, service, and observable-behavior guarantees.

   ```ts
   // User.ts
   export declare const displayName: (user: User) => string

   // Consumer.ts proves the input and result parts of the callable contract.
   const label: string = displayName(user)
   displayName(invoice) // TypeScript error: Invoice is not assignable to User
   const length: number = displayName(user) // TypeScript error: string is not assignable to number
   ```

6. **Runtime schema.** A value from a validation library such as Effect's `Schema` that validates,
   decodes, or encodes runtime data. It is not a TypeScript language feature or a type-only
   declaration.

   ```ts
   export const User = Schema.Struct({
     id: UserId,
     displayName: Schema.String,
   })

   const decodeUser = Schema.decodeUnknown(User)
   const decoded = decodeUser({ id: userId, displayName: "Ada" })
   // `decoded` validates a runtime unknown value through the User schema.
   ```

7. **Data representation.** A runtime schema or class together with the value shape it establishes.

   ```ts
   export class User extends Schema.Class<User>("User")({
     id: UserId,
     displayName: Schema.String,
   }) {}

   const user = new User({ id: userId, displayName: "Ada" })
   const id: UserId = user.id
   const name: string = user.displayName
   ```

8. **Rule.** A constraint expressed by a public TypeScript declaration or runtime schema.

   ```ts
   export declare const displayName: (user: User) => string

   displayName(user) // Accepted because user satisfies the declaration's rule.
   displayName(invoice) // TypeScript error: invoice violates the parameter rule.
   ```

9. **Fact.** A rule stated by a public declaration. Stating a fact puts it in a public signature or
   schema; establishing it creates or validates a value or Effect that satisfies it; using it consumes
   the declared contract.

   ```ts
   export class User extends Schema.Class<User>("User")({
     id: UserId,
     displayName: Schema.String,
   }) {}

   const established = new User({ id: userId, displayName: "Ada" })
   const used: string = established.displayName
   // `id: UserId` and `displayName: string` are stated, established, then used facts.
   ```

10. **Root concept.** The data structure, capability, operation, or composition concern for which a
    module is the authoritative public boundary.

    ```ts
    // User.ts exports the User representation and operations about that representation.
    export class User extends Schema.Class<User>("User")({
      id: UserId,
    }) {}

    export const same = (left: User, right: User): boolean => left.id === right.id

    // Consumer.ts reaches both through the one User root module.
    import { User, same } from "./User.js"
    ```

11. **Named root.** The exported declaration whose normalized name matches the file basename.

    ```ts
    // UserRepository.ts
    export class UserRepository extends Context.Service<UserRepository>()(
      "UserRepository",
    ) {}

    // Consumer.ts names the root from the matching module path.
    import { UserRepository } from "./UserRepository.js"
    ```

12. **Data module.** A module whose root concept is a runtime data representation.

    ```ts
    // User.ts is a data module: it exports one runtime representation named User.
    export class User extends Schema.Class<User>("User")({
      id: UserId,
    }) {}

    export const is = Schema.is(User)
    ```

13. **Primary data structure.** The one locally declared and exported `Data.Class`,
    `Data.TaggedClass`, `Schema.Class`, `Schema.TaggedClass`, or `Schema.Struct` representation in a
    data module.

    ```ts
    // User is the only exported data-structure declaration in User.ts.
    export class User extends Schema.Class<User>("User")({
      id: UserId,
    }) {}

    export const is = Schema.is(User) // A companion, not a second data structure.
    ```

14. **Data root.** A primary data structure used as a module's root concept.

    ```ts
    // User is both the primary data structure and the root of User.ts.
    export const User = Schema.Struct({ id: UserId })

    // Consumer.ts imports the same root witness to decode user data.
    import { User } from "./User.js"
    const decodeUser = Schema.decodeUnknown(User)
    ```

15. **Module ownership.** The rule that one module is a representation's sole local declaration and
    public export path. It is not mutable runtime ownership of individual values.

    ```ts
    // User.ts owns the declaration.
    export class User extends Schema.Class<User>("User")({ id: UserId }) {}

    // RegisterUser.ts consumes the owned representation instead of declaring another User.
    import { User } from "./User.js"
    const user = new User({ id: userId })
    ```

16. **Companion.** A public value that constructs, validates, normalizes, transforms, compares,
    serializes, deserializes, observes, or supplies a canonical value for a primary data structure.

    ```ts
    // User.ts
    export const is = Schema.is(User)
    export const displayName = (user: User): string => user.displayName
    export const encode = (user: User): UserEncoded => Schema.encodeSync(User)(user)

    // Consumer.ts uses each public value through the User module.
    const valid: boolean = is(value)
    const label: string = displayName(user)
    const encoded: UserEncoded = encode(user)
    ```

17. **Representation operation.** A companion that constructs, validates, transforms, serializes, or
    observes a data representation without accessing an application resource.

    ```ts
    export const decode = (input: unknown): Effect.Effect<User, ParseError> =>
      Schema.decodeUnknown(User)(input)

    // No service is required to run the operation.
    const user = yield* decode({ id: userId, displayName: "Ada" })
    ```

18. **Resource.** A stateful system or source of effects that an operation does not own as an ordinary
    input value and accesses through an injected capability.

    ```ts
    const users = new Map<UserId, User>()

    const read = (id: UserId): Effect.Effect<User, UserNotFound> => {
      const user = users.get(id)
      return user === undefined
        ? Effect.fail(new UserNotFound({ id }))
        : Effect.succeed(user)
    }

    // The caller supplies only id; `read` accesses the separately owned users resource.
    const user = yield* read(userId)
    ```

19. **Application resource.** A resource outside a data value: persisted records, a mail-delivery
    provider, an HTTP API, filesystem, message queue, process environment, wall clock, or random
    source.

    ```ts
    // This declaration names the boundary to a remote mail-delivery provider.
    export declare const sendWelcomeRequest: (
      user: User,
    ) => Promise<void>

    await sendWelcomeRequest(user) // The operation reaches an application resource.
    ```

20. **Application capability.** An Effect service that gives an operation typed access to an
    application resource or boundary.

    ```ts
    export class Mailer extends Context.Service<
      Mailer,
      {
        readonly sendWelcome: (user: User) => Effect.Effect<void, MailDeliveryError>
      }
    >()("Mailer") {}

    const mailer = yield* Mailer
    yield* mailer.sendWelcome(user)
    ```

21. **Effect service slot.** `R`, the third type parameter of `Effect.Effect<A, E, R>`, which lists
    the services required to run an Effect.

    ```ts
    declare const read: (
      id: UserId,
    ) => Effect.Effect<User, ReadUserError, UserRepository>

    const program = read(userId)
    const user = yield* program // Requires UserRepository in the surrounding Effect context.
    ```

22. **Capability root.** One Effect service contract used as a module's named root.

    ```ts
    // UserRepository.ts
    export class UserRepository extends Context.Service<
      UserRepository,
      {
        readonly read: (id: UserId) => Effect.Effect<User, UserNotFound>
        readonly save: (user: User) => Effect.Effect<void, SaveUserError>
      }
    >()("UserRepository") {}

    // Consumer code obtains the capability through its root token.
    const repository = yield* UserRepository
    ```

23. **Capability module.** A module that owns a resource contract: the operations callers may request,
    their inputs, successes, typed failures, and executable laws. It does not own the data
    representation it transports.

    ```ts
    // UserRepository.ts
    import { User } from "./User.js"

    export class UserRepository extends Context.Service<
      UserRepository,
      {
        readonly read: (id: UserId) => Effect.Effect<User, UserNotFound>
      }
    >()("UserRepository") {}

    // User is imported, proving the capability transports rather than declares User.
    ```

24. **Composition root.** An exported Effect `Layer` that selects a concrete provider for a capability.

    ```ts
    export const UserRepositoryInMemory = Layer.succeed(UserRepository)({
      read: (id) => Effect.fail(new UserNotFound({ id })),
      save: () => Effect.void,
    })

    const user = yield* read(userId).pipe(
      Effect.provide(UserRepositoryInMemory),
    )
    ```

25. **Composition module.** A module that imports a capability and its implementation details, then
    exports the Layer supplying that capability. The capability module does not import its providers.

    ```ts
    // UserRepositoryInMemory.ts
    import { Effect, Layer } from "effect"
    import { UserRepository } from "./UserRepository.js"

    export const UserRepositoryInMemory = Layer.succeed(UserRepository)({
      read: (id) => Effect.fail(new UserNotFound({ id })),
      save: () => Effect.void,
    })
    ```

26. **Public capability contract.** The consumer-visible service shape plus executable laws every
    supported provider must satisfy. It excludes the chosen database driver, URL, credential, or test
    store.

    ```ts
    export class UserRepository extends Context.Service<
      UserRepository,
      {
        readonly read: (id: UserId) => Effect.Effect<User, UserNotFound>
        readonly save: (user: User) => Effect.Effect<void, SaveUserError>
      }
    >()("UserRepository") {}

    // Consumers depend on the service shape, not a provider-specific implementation.
    const repository = yield* UserRepository
    yield* repository.save(user)
    ```

27. **Executable contract suite.** Test support that provides a candidate Layer and verifies each
    executable law of its public capability contract.

    ```ts
    // UserRepositoryInMemory.test.ts
    it.effect("satisfies the user-repository contract", () =>
      verifyUserRepository(UserRepositoryInMemory),
    )

    // A different provider proves the same contract by running the same suite.
    it.effect("SQL satisfies the user-repository contract", () =>
      verifyUserRepository(UserRepositorySql),
    )
    ```

    A suite can prove read-after-save and absence behavior for every provider it runs against. Atomic
    persistence requires an observable transaction or revision-based compare-and-set primitive plus
    concurrent and failure tests against the real storage engine; no TypeScript declaration, Effect
    type, or comment proves it alone.

28. **Operation root.** One exported callable whose normalized name matches the filename.

    ```ts
    // RegisterUser.ts
    export const registerUser = (
      input: RegisterUserInput,
    ): Effect.Effect<User, RegistrationError, UserRepository | Mailer> =>
      Effect.succeed(new User(input))

    // Consumer.ts imports the one callable named after RegisterUser.ts.
    import { registerUser } from "./RegisterUser.js"
    ```

29. **Effect program.** An operation that consumes services through its `R` slot. It is not an Effect
    service unless it provides a capability to other code.

    ```ts
    export const registerUser = (
      input: RegisterUserInput,
    ): Effect.Effect<User, RegistrationError, UserRepository | Mailer> =>
      Effect.gen(function* () {
        const repository = yield* UserRepository
        const mailer = yield* Mailer
        const user = yield* createUser(input)

        yield* repository.save(user)
        yield* mailer.sendWelcome(user)
        return user
      })

    // The program runs only after its required capabilities are provided.
    const user = yield* registerUser(input).pipe(
      Effect.provide(UserRepositoryInMemory),
      Effect.provide(MailerLive),
    )
    ```

30. **Problem-space result.** An outcome stated in the application's domain vocabulary, such as a
    persisted user or a requested welcome message, rather than an implementation mechanism such as a
    map mutation, SQL statement, or HTTP request.

    ```ts
    const user = yield* registerUser(input)

    expect(user.id).toBe(input.id)
    // The asserted outcome is a User; no caller needs to name the SQL or HTTP mechanism.
    ```

31. **Postcondition.** A fact that must hold after an operation succeeds.

    ```ts
    /**
     * @postcondition UserPersisted
     * @postcondition WelcomeMessageRequested
     */
    export declare const registerUser: (
      input: RegisterUserInput,
    ) => Effect.Effect<User, RegistrationError, UserRepository | Mailer>

    const user = yield* registerUser(input)
    // Tests must establish UserPersisted and WelcomeMessageRequested before this succeeds.
    ```

32. **Domain step.** An action named for a problem-space result with an observable state change,
    external effect, or decision. It is not an implementation-mechanics step such as assigning a
    field, mapping an array, or serializing JSON.

    ```ts
    const persistUser = (repository: UserRepository, user: User) =>
      repository.save(user)

    yield* persistUser(repository, user)
    // The callable names and performs the domain action “persist user.”
    ```

33. **Workflow.** One public operation that sequences two or more domain steps across distinct
    capability roots to achieve a named outcome.

    ```ts
    export const registerUser = (input: RegisterUserInput) =>
      Effect.gen(function* () {
        const repository = yield* UserRepository
        const mailer = yield* Mailer
        const user = yield* createUser(input)

        yield* repository.save(user)
        yield* mailer.sendWelcome(user)
        return user
      })

    // The single call executes both the persistence and delivery domain steps.
    const user = yield* registerUser(input)
    ```

34. **Registration policy.** The business decisions governing registration: valid input, user
    creation, persistence before notification, and the failures that prevent success.

    ```ts
    const register = Effect.gen(function* () {
      const user = yield* createUser(input)
      yield* repository.save(user)
      yield* mailer.sendWelcome(user)
      return user
    })

    // A Mailer failure prevents `register` from reaching its successful return.
    ```

35. **Public workflow contract.** An operation's callable declaration together with its promised
    ordering and postconditions. Postconditions are adjacent API documentation; implementation tests
    with recording services must exercise them.

    ```ts
    const events: Array<string> = []
    const recordingRepository = {
      save: (user: User) => Effect.sync(() => events.push(`save:${user.id}`)),
    }
    const recordingMailer = {
      sendWelcome: (user: User) => Effect.sync(() => events.push(`welcome:${user.id}`)),
    }

    yield* registerUser(input).pipe(
      Effect.provideService(UserRepository, recordingRepository),
      Effect.provideService(Mailer, recordingMailer),
    )
    expect(events).toEqual([`save:${input.id}`, `welcome:${input.id}`])
    ```

36. **Data closure.** A root data structure and the named domain types reachable through its declared
    schema or class fields.

    ```ts
    export class User extends Schema.Class<User>("User")({
      id: UserId,
      displayName: Schema.String,
    }) {}

    const user = new User({ id: userId, displayName: "Ada" })
    const id: UserId = user.id // UserId is reachable through User's declared field.
    ```

37. **Producer.** A companion that creates, decodes, reads, or transforms a domain value.

    ```ts
    export const decode = (input: unknown): Effect.Effect<User, UserDecodeError> =>
      Schema.decodeUnknown(User)(input)

    const user: User = yield* decode({ id: userId, displayName: "Ada" })
    ```

38. **Producer wrapper.** A generic type with a documented output slot that produces its contained
    type. `Effect.Effect<A, E, R>`, `Option.Option<A>`, `ReadonlyArray<A>`, and streams are producer
    wrappers.

    ```ts
    declare const users: ReadonlyArray<User>
    declare const optionalUser: Option.Option<User>

    const first: User | undefined = users[0]
    const user = Option.getOrUndefined(optionalUser) // User | undefined
    ```

39. **Output slot.** The type position in a producer wrapper representing its produced value. In
    `Effect.Effect<A, E, R>`, it is `A`; a `User` in `E` or `R` is not produced data.

    ```ts
    declare const decoded: Effect.Effect<User, UserDecodeError, never>

    const user: User = yield* decoded
    // `yield*` obtains A (User), not E (UserDecodeError) or R (never).
    ```

40. **Coherent module.** A module whose public declarations fit exactly one root grammar: a data
    module exports one primary representation and permitted companions; a capability module exports
    one `Context.Service` contract; an operation module exports one callable named after the file; or
    a composition module exports one `Layer` named after the file.

    ```ts
    // RegisterUser.ts exports its one operation root.
    export const registerUser = (
      input: RegisterUserInput,
    ): Effect.Effect<User, RegistrationError, UserRepository | Mailer> =>
      Effect.succeed(new User(input))

    // There is no second exported data structure, service, or Layer in this module.
    ```

41. **Direct module import.** An import that names the module declaring the imported concept.

    ```ts
    // Consumer.ts imports User from its declaring module.
    import { User } from "./User.js"

    const user = new User({ id: userId, displayName: "Ada" })
    ```

42. **Re-export.** An export that forwards another module's public name and creates a second public
    navigation path.

    ```ts
    // UserBarrel.ts creates a second path to the User declaration.
    export { User } from "./User.js"

    // Consumer.ts can now name the same declaration through two paths.
    import { User as DirectUser } from "./User.js"
    import { User as ReExportedUser } from "./UserBarrel.js"

    const sameConstructor: typeof DirectUser = ReExportedUser
    ```

43. **Local derived type.** A local type using TypeScript utilities to name a function's inferred input,
    result, Effect success, or Effect error within a consumer module.

    ```ts
    type RegistrationInput = Parameters<typeof registerUser>[0]
    type Registration = ReturnType<typeof registerUser>
    type RegisteredUser = Effect.Success<Registration>
    type RegistrationError = Effect.Error<Registration>

    const input: RegistrationInput = { id: userId, displayName: "Ada" }
    const user: RegisteredUser = yield* registerUser(input)
    ```

44. **Exported type alias.** A type alias made public through an export declaration. It creates a public
    concept without a runtime representation or root module.

    ```ts
    // RegisterUser.ts
    export type RegistrationInput = Parameters<typeof registerUser>[0]

    // Consumer.ts can name the alias but cannot import a runtime RegistrationInput value.
    import type { RegistrationInput } from "./RegisterUser.js"
    ```

45. **Shadow data structure.** An anonymous object parameter, result, or error with a domain name,
    invariant, lifecycle, or reuse across boundaries. Small technical options may remain inline only
    when naming and exporting them adds ceremony without preserving a real distinction.

    ```ts
    export declare const registerUser: (input: {
      readonly email: string
      readonly displayName: string
    }) => Effect.Effect<User, RegistrationError>

    const first: Parameters<typeof registerUser>[0] = {
      email: "ada@example.com",
      displayName: "Ada",
    }
    const second: Parameters<typeof registerUser>[0] = first
    // Reusing the anonymous input exposes the shadow data structure.
    ```

46. **Change locality.** The property that a representation change primarily affects its data module
    and direct consumers, a capability-contract change primarily affects its capability module and
    providers, and a workflow change primarily affects its operation module.

    ```ts
    // UserRepositorySql.ts can replace only the provider implementation.
    export const UserRepositorySql = Layer.succeed(UserRepository)({
      read: (id) => readUserFromSql(id),
      save: (user) => saveUserToSql(user),
    })

    // RegisterUser.ts still provides its workflow through the unchanged UserRepository capability.
    const user = yield* registerUser(input).pipe(
      Effect.provide(UserRepositorySql),
      Effect.provide(MailerLive),
    )
    ```
## Constraints

1. **Every module MUST have one coherent, named root concept.**

   Apply Definitions 10, 11, and 40. Every export must either be the root or directly support using
   it. A module must not combine unrelated roots merely because their types meet in one signature: an
   invoice renderer does not belong in `User.ts` merely because it accepts a `User`.

   The root determines ownership, not a coincidental parameter or result type. A reader must be able
   to identify the module responsible for a representation, capability contract, operation, or Layer
   without scanning unrelated files.

2. **A module's filename MUST name its root concept.**

   The basename is the stable, searchable public name of the concept owned by that file. A data
   module named `User.ts` owns `User`; a capability module named `UserRepository.ts` owns
   `UserRepository`; an operation module named `RegisterUser.ts` owns `registerUser`; and a
   composition module named `UserRepositoryLive.ts` owns `UserRepositoryLive`.

   Names must state the domain concept or architectural role rather than implementation mechanics.
   `User.ts`, `UserRepository.ts`, and `RegisterUser.ts` describe distinct roots; `helpers.ts`,
   `common.ts`, and `user-utils.ts` do not identify a selection rule for their exports.

3. **A data module MUST declare exactly one exported primary data structure locally.**

   Apply Definitions 12–15. Non-exported data structures and functions may support implementation.
   A data module must not export a second data structure, even if it is used by one public helper.
   Put an independent representation in its own data module.

4. **Every data-module export MUST be the primary structure or its companion.**

   Apply Definitions 16 and 17. Predicates may return `boolean`, formatters display data, and encoders
   boundary data; requiring every public function literally to return `User` would reject cohesive
   companions. A public operation on an exported class is part of the same public API. Its receiver,
   inputs, result, failures, effects, and state changes must satisfy this constraint just as a
   top-level exported function does.

5. **A data-module producer MUST produce the primary structure, not an unrelated domain result.**

   Apply Definitions 36–39. The successful output must be the primary structure, either directly or
   through a recognized producer wrapper. A project may configure the wrapper catalog and output
   slots, but arbitrary generic containment is not production.

6. **The data-structure rule MUST NOT force artificial data structures on capability, operation, or composition modules.**

   Apply Definitions 22–35 and 40. `registerUser` succeeding with `User` does not make it part of
   `User.ts`: its Effect signature requires repository and mail capabilities and its workflow owns
   registration ordering and failures. It must not invent a `Schema.Class` solely to satisfy the
   data-module rule.

7. **Effect boundaries MUST expose success, failure, and service requirements at the owning public operation.**

   A public Effect operation must expose its successful result, typed failures, and required services
   through its `Effect.Effect<A, E, R>` result. It must not run the effect, erase its error channel,
   or hide required services merely to make a module appear simpler.

   A reader of an exported operation must be able to identify which result it produces, which failures
   a caller handles, and which capabilities a caller provides. Place persistence, communication, and
   orchestration in the module whose root owns that effectful operation, not in a data module solely
   because the operation eventually produces that data type.

8. **Modules MUST NOT re-export another module's public API.**

   Apply Definitions 2, 3, 41, and 42. This prohibition includes type-only re-exports. It does not
   prohibit a module from importing a dependency for its own implementation or from exposing a
   deliberately constructed companion.

9. **Modules MUST NOT export type aliases.**

   Apply Definitions 43 and 44. Export a meaningful data structure from its own module when callers
   need a named domain value, error, input, or result concept. Repeated local inference expressions
   across independent consumers are evidence that the derived concept may deserve its own primary
   data structure.

10. **Public structural contracts SHOULD either use an existing named data structure or remain demonstrably incidental.**

    Apply Definition 45. This prevents a ban on aliases from replacing named concepts with unowned
    structural shapes. Necessary information remains explicit; redundant names and files do not.

11. **A module boundary MUST preserve change locality.**

    Apply Definition 46. Import direction must make ownership understandable and avoid cycles. A
    module may depend on the public contracts it needs, but consumers must not inspect private state,
    implementation helpers, or a barrel file to learn ordinary behavior.

12. **Module-boundary checks MUST be explicit, deterministic, and semantic.**

    A machine may verify local declaration, filename agreement, exported-data-structure count,
    prohibited aliases and re-exports, and membership in a configured producer-wrapper catalog. It
    may verify type positions with the TypeScript checker. It must report the module, exported symbol,
    root concept, and violated fact.

    A machine must not infer that two operations are cohesive from identifier similarity alone.
    Whether an export is a companion, whether an anonymous contract is independently meaningful, and
    whether a module root owns a workflow require explicit project configuration or human
    architectural review. The same source files, compiler configuration, and module-boundary
    configuration must produce the same finding set.

Together, these constraints use the actual TypeScript module boundary to make ownership, naming,
and public contracts explicit. They favor direct navigation and narrow change surfaces without
turning every Effect capability or workflow into an artificial data structure.
