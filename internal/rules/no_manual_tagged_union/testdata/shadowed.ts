type Readonly<T> = T
type Shadowed = Readonly<{ readonly _tag: "A" }> | Readonly<{ readonly _tag: "B" }>

export {}
