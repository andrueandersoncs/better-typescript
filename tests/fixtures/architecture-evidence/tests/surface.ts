import { secret } from "../src/internal/secret.js"
import { packageSource } from "@acme/payments/src/checkout.js"
import { publicOnly } from "../src/publicEntry.js"
import { type StablePort } from "../src/seams.js"
import { normalizeForTest } from "../src/testSurface.js"

export const normalized = normalizeForTest(secret)

export const importedPackageSource = packageSource

export const publicResult = publicOnly("public")

export const testStable: StablePort = {
  load: () => "test"
}
