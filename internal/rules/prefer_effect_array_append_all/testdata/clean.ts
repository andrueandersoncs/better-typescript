declare const condition: boolean
const values = [1, ...(condition ? [2] : [3])]
