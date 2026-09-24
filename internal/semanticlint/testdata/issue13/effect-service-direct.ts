export const User = Context.GenericTag<User>("User")

export const UserLive: User = {
  find: (id) => Effect.tryPromise(() => vendor.get(id)),
}
