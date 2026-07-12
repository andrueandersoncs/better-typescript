import type { Point } from "./point.js"

export const movePoint = (dx: number, dy: number, point: Point): Point => ({
  x: point.x + dx,
  y: point.y + dy
})
