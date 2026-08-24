declare const condition: boolean
const value = { ...(condition ? { name: "Ada" } : { name: "Grace" }) }
