// Relocated and renamed while retaining the same declaration relationships.
export interface Vertex {
  readonly x: number
}


// Whitespace and comments must not become membership evidence.
export interface Vertex {
  readonly y: number
}

export namespace Vertex {
  export const origin = { x: 0, y: 0 }
}
