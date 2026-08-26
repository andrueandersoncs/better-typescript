# schema-class-models

## What it does

Reports Schema class data models and recommends declarative schemas. The tested diagnostic is exactly: `Avoid Schema class data models; use Schema.Struct or tagged schema variants. Keep ordinary data declarative and decode it at the boundary.`

The check covers class declarations containing `extends Schema.Class` or `extends Schema.TaggedClass`. It also covers calls named `Schema.Class`, `Schema.TaggedClass`, `Class`, or `TaggedClass` when the relevant first argument is an object literal, identifier, or call. Other spellings and calls without such an argument are allowed.

## When to use it

Use it when ordinary data should use `Schema.Struct` or tagged schema variants and be decoded at the boundary.

## Conformant

The fixture allows `Schema.Struct`:

```ts
Schema.Struct({ name: Schema.String })
```

## Non-conformant

The fixture reports `Schema.Class` with an object model:

```ts
Schema.Class({ name: Schema.String })
```
