import { Effect as Fx } from "effect"
import { ignore as localIgnore } from "./effect"

Fx.ignore(Fx.fail("bad"))
Fx.ignore(Fx.fail("logged"), { log: true })
Fx.ignoreCause(Fx.fail("severity"), { log: "Error" })
Fx.fail("curried").pipe(Fx.ignore({ log: "Warning" }))
Fx.ignore(Fx.fail("observed").pipe(Fx.tapError(Fx.logError)))
Fx.ignore(Fx.tapError(Fx.fail("direct"), Fx.logError))
Fx.fail("data-last").pipe(Fx.tapError(Fx.logError), Fx.ignore())
Fx.fail("bare").pipe(Fx.tapError(Fx.logError), Fx.ignore)
Fx.ignoreCause(Fx.fail("cause").pipe(Fx.tapCause(Fx.logError)))
Fx.ignoreCause(Fx.fail("defect").pipe(Fx.tapError(Fx.logError)))
Fx.ignore(Fx.fail("hidden").pipe(Fx.tapError(Fx.logError), Fx.andThen(Fx.fail("later"))))
const disabled: { readonly log?: boolean } = { log: false }
Fx.ignore(Fx.fail("overridden"), { log: true, ...disabled })

localIgnore("not an Effect operation")
const local = { ignore: (_value: unknown) => undefined }
local.ignore("not an Effect operation")
const unrelatedLog = () => {
  console.error("starting")
  return Fx.ignore(Fx.fail("still hidden"))
}
void unrelatedLog
