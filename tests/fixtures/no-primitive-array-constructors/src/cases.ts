export {}

const empty = new Array()

const sized = new Array(3)

const elements = new Array(1, 2, 3)

const called = Array(1, 2)

const calledSized = Array(5)

const returnsInline = (): Array<number> => new Array(1)

const literalEmpty: ReadonlyArray<number> = []

const literalOne: ReadonlyArray<number> = [1]

const literalMany: ReadonlyArray<number> = [1, 2, 3]

const returnsLiteral = (): ReadonlyArray<string> => ["x"]
