declare module "node:fs" {
  export const mkdtempDisposableSync: (prefix: string) => {
    readonly path: string
    readonly remove: () => void
  }
}

declare module "node:os" {
  export const hostname: () => string
  export const tmpdir: () => string
}

declare module "node:path" {
  export const join: (...parts: ReadonlyArray<string>) => string
}

declare module "effect" {
  export const Effect: {
    readonly sync: <A>(evaluate: () => A) => unknown
  }
  export const Schema: {
    readonly String: unknown
    readonly Struct: <A>(fields: A) => A
  }
}

declare module "effect-domains" {
  export const Query: { readonly make: <A, B>(table: A, options: B) => B }
  export const Table: {
    readonly make: <A, B>(schema: A, options: B) => A & B
  }
}


declare module "fs" {
  export const existsSync: (path: string) => boolean
}

declare module "fs/promises" {
  export const readFile: (path: string, encoding: string) => Promise<string>
}

declare module "node:fs/promises" {
  export const readFile: (path: string, encoding: string) => Promise<string>
}

declare module "os" {
  export const tmpdir: () => string
}
