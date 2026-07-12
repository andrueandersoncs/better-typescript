export abstract class Shape {
  abstract area(): number
}

export class Circle extends Shape {
  constructor(readonly radius: number) {
    super()
  }

  area(): number {
    return Math.PI * this.radius ** 2
  }
}
