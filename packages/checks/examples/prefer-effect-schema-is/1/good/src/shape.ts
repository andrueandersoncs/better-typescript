import { Schema } from "effect"

const Circle = Schema.TaggedStruct("Circle", {
  radius: Schema.Number
})
interface Circle extends Schema.Schema.Type<typeof Circle> {}

const Square = Schema.TaggedStruct("Square", {
  side: Schema.Number
})
interface Square extends Schema.Schema.Type<typeof Square> {}

declare const circleArea: (circle: Circle) => number

export const area = (shape: Circle | Square) => {
  if (Schema.is(Circle)(shape)) {
    return circleArea(shape)
  }
}
