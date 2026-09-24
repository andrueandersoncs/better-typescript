export const loadUser = Effect.gen(function*() {
  const user = yield* Effect.tryPromise(() => vendor.get("one"))
  if (!user) {
    return yield* Effect.fail(new Error("missing"))
  }
  return user
})
