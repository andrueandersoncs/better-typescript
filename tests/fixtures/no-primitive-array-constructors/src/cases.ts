export {}

const empty = new Array() // ~detect 15

const sized = new Array(3) // ~detect 15

const elements = new Array(1, 2, 3) // ~detect 18

const called = Array(1, 2) // ~detect 16

const calledSized = Array(5) // ~detect 21

const returnsInline = (): Array<number> => new Array(1) // ~detect 44

const literalEmpty: ReadonlyArray<number> = [] // ~detect 45

const literalOne: ReadonlyArray<number> = [1] // ~detect 43

const literalMany: ReadonlyArray<number> = [1, 2, 3] // ~detect 44

const returnsLiteral = (): ReadonlyArray<string> => ["x"] // ~detect 53
