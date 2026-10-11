import { Schema } from "effect"
import * as command from "./command.js"
import type { Program } from "./program.js"

declare const OperationResult: unique symbol

export interface Operation<out A> {
  readonly _tag: string
  readonly [OperationResult]: (_: never) => A
}

export const operation =
  <A>() =>
  <O extends { readonly _tag: string }>(value: O) =>
    value as O & Operation<A>

export const make = <
  const Tag extends string,
  const Fields extends Schema.Struct.Fields,
  Success extends Schema.Top,
>(definition: {
  readonly tag: Tag
  readonly payload: Fields
  readonly success: Success
}) => {
  const requestSchema = Schema.TaggedStruct(definition.tag, definition.payload)

  const makeRequest = (
    input: Omit<Schema.TaggedStruct<Tag, Fields>["~type.make.in"], "_tag">,
  ) =>
    requestSchema.make({
      ...input,
      _tag: definition.tag,
    } as Schema.TaggedStruct<Tag, Fields>["~type.make.in"]) as Schema.TaggedStruct<
      Tag,
      Fields
    >["Type"] &
      Operation<Success["Type"]>

  const commandsFrom = <A>(
    input: Omit<Schema.TaggedStruct<Tag, Fields>["~type.make.in"], "_tag">,
    toAction: (value: Success["Type"]) => A,
  ): Program<
    Schema.TaggedStruct<Tag, Fields>["Type"] & Operation<Success["Type"]>,
    ReadonlyArray<A>
  > => {
    const request = makeRequest(input)
    return command.perform(request, toAction)
  }

  return Object.freeze({
    make: makeRequest,
    commandsFrom,
  })
}
