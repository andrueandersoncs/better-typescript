declare const condition: boolean
const value = { ...(condition ? { name: "Ada" } : {}) }
