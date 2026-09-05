declare const TypeId: "~effect/Schema/Schema"

export interface Class<Self> {
  readonly [TypeId]: typeof TypeId
  readonly make: (input?: unknown) => Self
  new (input?: unknown): Self
}

export declare const TaggedClass: <Self>() => (tag: string, fields: object) => Class<Self>
