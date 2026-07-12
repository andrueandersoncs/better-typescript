export type Point = {
  readonly x: number
  readonly y: number
}

export const movePoint = (dx: number, dy: number, point: Point): Point => ({
  x: point.x + dx,
  y: point.y + dy
})
