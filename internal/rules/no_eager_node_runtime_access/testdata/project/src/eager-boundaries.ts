import * as os from "node:os"
import { tmpdir } from "node:os"

const iifeDirectory = (((() => tmpdir())))()

class RuntimeValues {
  static readonly hostname = os.hostname()

  static {
    os.hostname()
  }

  [tmpdir()]() {}
  [os.hostname()] = true
}

declare const decorate: (
  value: string,
) => (...args: ReadonlyArray<unknown>) => void

class DecoratedValues {
  @decorate(tmpdir())
  method() {}

  @decorate(os.hostname())
  field = true
}

void iifeDirectory
void RuntimeValues
void DecoratedValues
