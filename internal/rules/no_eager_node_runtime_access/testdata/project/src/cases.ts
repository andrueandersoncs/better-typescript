import { mkdtempDisposableSync } from "node:fs"
import * as os from "node:os"
import { tmpdir } from "node:os"

const systemTemporaryDirectory = tmpdir()
const hostname = os.hostname()
const directory = mkdtempDisposableSync("/tmp/example-")
void systemTemporaryDirectory
void hostname
void directory
