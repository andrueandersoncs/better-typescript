# no-schema-opaque-instance-members

## What it does

Reports emitted instance fields, methods, accessors, and non-empty constructors on a class that directly extends `Schema.Opaque` over a direct `Schema.Struct` carrier.

`Schema.Opaque` returns that carrier rather than constructing the subclass, so inherited makers return a structural value without the subclass's instance behavior. Static helpers and type-only declarations are allowed. The rule does not apply to `Schema.Class` carriers, custom carriers, or a class with an emitted static `make`, `makeOption`, or `makeEffect` override; a `declare static` member is type-only and does not exempt instance behavior. An uninitialized non-`declare` field is reported when the project's `useDefineForClassFields` setting emits it.

## When to use it

Use `Schema.Opaque` for nominal structural values. Use `Schema.Class` when constructed values need an instance prototype.

## Conformant

```ts lint=clean
import { Schema } from "effect"

class User extends Schema.Opaque<User>()(Schema.Struct({ name: Schema.String })) {
  static display(user: User) {
    return user.name
  }
}

class Session extends Schema.Class<Session>("Session")({ user: User }) {
  display() {
    return this.user.name
  }
}
```

## Non-conformant

```ts lint=error:4:3
import { Schema } from "effect"

class User extends Schema.Opaque<User>()(Schema.Struct({ name: Schema.String })) {
  display() {
    return this.name
  }
}
```
