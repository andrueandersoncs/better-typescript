import execute from "./anonymous.js"
execute({ x: 1 })

interface MethodParams { x: number }
class Runner {
  ["run"](arg: MethodParams): void { void arg }
}
new Runner().run({ x: 1 })
