import { Schema } from "effect"

class Circle extends Schema.TaggedClass<Circle>()("Circle", {
  radius: Schema.Number
}) {}

class Square extends Schema.TaggedClass<Square>()("Square", {
  side: Schema.Number
}) {}

declare const circleArea: (circle: Circle) => number

export const area = (shape: Circle | Square) => {
  if (Schema.is(Circle)(shape)) {
    return circleArea(shape)
  }
}
