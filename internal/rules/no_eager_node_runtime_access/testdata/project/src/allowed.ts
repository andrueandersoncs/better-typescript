import { mkdtempDisposableSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect, Schema } from "effect"
import { Query, Table } from "effect-domains"

const BookSchema = Schema.Struct({ title: Schema.String })
const Books = Table.make(BookSchema, { name: "books" })
const FindBook = Query.make(Books, { Result: Books })
const temporaryDirectoryPrefix = join("/tmp", "effect-domains-basic-")
const acquireTemporaryDirectory = Effect.sync(() =>
  mkdtempDisposableSync(join(tmpdir(), temporaryDirectoryPrefix)),
)
const readTemporaryDirectory = () => tmpdir()

class DirectoryOwner {
  readonly path = tmpdir()

  read() {
    return tmpdir()
  }

  static readLater() {
    return tmpdir()
  }
}

const deferredGenerator = (function* () {
  yield tmpdir()
})()

declare const decorateLater: (
  value: string,
) => (...args: ReadonlyArray<unknown>) => void
const makeDecorated = () => {
  class LocalDirectory {
    @decorateLater(tmpdir())
    read() {}
  }
  return LocalDirectory
}

{
  const tmpdir = () => "/local"
  const localDirectory = tmpdir()
  void localDirectory
}
void FindBook
void acquireTemporaryDirectory
void readTemporaryDirectory
void DirectoryOwner
void deferredGenerator
void makeDecorated
