import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Array, Effect } from "effect"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import { compilerOptionsForChecks } from "@better-typescript/core/engine/check"

interface SourceLocation {
  readonly fileName: string
  readonly line: number
  readonly column: number
}

export interface FixtureItem extends SourceLocation {
  readonly name: string
}

export interface DetectionDetails extends SourceLocation {
  readonly message: string
  readonly hint: string
}

export interface ExpectedDetection extends FixtureItem {
  readonly message: string
  readonly hint: string
}

interface AssertDisallowedOptions {
  readonly sort?: boolean
}

const locationKey = (location: SourceLocation): string =>
  [location.fileName, location.line, location.column].join(":")

const detectionLocationKey = (element: Detection): string =>
  [element.location.path, element.location.line, element.location.column].join(":")

const compareLocations = (left: SourceLocation, right: SourceLocation): number =>
  left.fileName.localeCompare(right.fileName) ||
  left.line - right.line ||
  left.column - right.column

const sortByLocation = <T extends SourceLocation>(items: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...items].sort(compareLocations)

const maybeSorted = <T extends SourceLocation>(
  items: ReadonlyArray<T>,
  shouldSort: boolean
): ReadonlyArray<T> => (shouldSort ? sortByLocation(items) : items)

const detectionDetails = (element: Detection): DetectionDetails => ({
  fileName: element.location.path,
  line: element.location.line,
  column: element.location.column,
  message: element.message,
  hint: element.hint
})

const expectedDetectionDetails = (expectedElement: ExpectedDetection): DetectionDetails => ({
  fileName: expectedElement.fileName,
  line: expectedElement.line,
  column: expectedElement.column,
  message: expectedElement.message,
  hint: expectedElement.hint
})

export const assertDisallowedFixtureItems = (
  elements: ReadonlyArray<Detection>,
  disallowedFixtureItems: ReadonlyArray<ExpectedDetection>,
  options: AssertDisallowedOptions = {}
): void => {
  const shouldSort = options.sort === true
  const actual = maybeSorted(elements.map(detectionDetails), shouldSort)
  const expected = maybeSorted(disallowedFixtureItems.map(expectedDetectionDetails), shouldSort)

  assert.deepEqual(actual, expected, "expected only disallowed fixture items to be reported")
}

export const assertAllowedFixtureItems = (
  elements: ReadonlyArray<Detection>,
  allowedFixtureItems: ReadonlyArray<FixtureItem>
): void => {
  const reportedLocations = new Set(elements.map(detectionLocationKey))
  const reportedAllowedFixtureItems = allowedFixtureItems.filter((item) =>
    reportedLocations.has(locationKey(item))
  )

  assert.deepEqual(
    reportedAllowedFixtureItems,
    [],
    "expected allowed fixture items not to be reported"
  )
}

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturesRoot = path.join(testDirectory, "fixtures")

const detectMarkerPattern = /\/\/ ~detect(?: ([0-9]+(?:,[0-9]+)*))?\s*$/

interface LineMarker {
  readonly fileName: string
  readonly line: number
  readonly columns: ReadonlyArray<number> | undefined
}

const listTypeScriptFiles = (directory: string): ReadonlyArray<string> => {
  if (!fs.existsSync(directory)) {
    return []
  }

  return fs
    .readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
}

const markersInFixture = (fixturePath: string): ReadonlyArray<LineMarker> => {
  const sourceRoot = path.join(fixturePath, "src")
  const files = listTypeScriptFiles(sourceRoot)

  return files.flatMap((absolutePath) => {
    const fileName = path.relative(fixturePath, absolutePath).split(path.sep).join("/")
    const content = fs.readFileSync(absolutePath, "utf8")
    const lines = content.split(/\r?\n/)

    return lines.flatMap((text, index) => {
      const match = detectMarkerPattern.exec(text)

      if (match === null) {
        return []
      }

      const columnsText = match[1]
      const columns =
        columnsText === undefined
          ? undefined
          : columnsText.split(",").map((column) => Number.parseInt(column, 10))

      return [
        {
          fileName,
          line: index + 1,
          columns
        }
      ]
    })
  })
}

const runNamedCheckFixture = async (named: NamedCheck): Promise<ReadonlyArray<Detection>> => {
  const fixturePath = path.join(fixturesRoot, named.name)
  const compilerOptions = compilerOptionsForChecks(Array.of(named.check))
  const workspace = await Effect.runPromise(loadProject(fixturePath, compilerOptions))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(named.check))(project))
    )
  )

  return projectElements.flat()
}

const lineKey = (fileName: string, line: number): string => `${fileName}:${line}`

const columnKey = (fileName: string, line: number, column: number): string =>
  `${fileName}:${line}:${column}`

const sortedKeys = (keys: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...keys].sort((left, right) => left.localeCompare(right))

export const assertCheckFixture = async (named: NamedCheck): Promise<void> => {
  const fixturePath = path.join(fixturesRoot, named.name)
  const markers = markersInFixture(fixturePath)
  const elements = await runNamedCheckFixture(named)

  for (const element of elements) {
    assert.ok(element.message.length > 0, "expected every detection to carry a nonempty message")
    assert.ok(element.hint.length > 0, "expected every detection to carry a nonempty hint")
  }

  const detectionsByLine = new Map<string, Array<Detection>>()

  for (const element of elements) {
    const key = lineKey(element.location.path, element.location.line)
    const bucket = detectionsByLine.get(key)

    if (bucket === undefined) {
      detectionsByLine.set(key, [element])
    } else {
      bucket.push(element)
    }
  }

  const expectedColumnKeys: Array<string> = []
  const expectedLineOnlyKeys: Array<string> = []
  const markedLineKeys = new Set<string>()

  for (const marker of markers) {
    const key = lineKey(marker.fileName, marker.line)
    markedLineKeys.add(key)

    if (marker.columns === undefined) {
      expectedLineOnlyKeys.push(key)
      continue
    }

    for (const column of marker.columns) {
      expectedColumnKeys.push(columnKey(marker.fileName, marker.line, column))
    }
  }

  const actualColumnKeys: Array<string> = []
  const actualLineOnlyKeys: Array<string> = []
  const unmarkedDetections: Array<string> = []

  for (const [key, lineElements] of detectionsByLine) {
    if (!markedLineKeys.has(key)) {
      for (const element of lineElements) {
        unmarkedDetections.push(detectionLocationKey(element))
      }
      continue
    }

    const marker = markers.find((candidate) => lineKey(candidate.fileName, candidate.line) === key)

    if (marker === undefined) {
      continue
    }

    if (marker.columns === undefined) {
      assert.equal(
        lineElements.length,
        1,
        `expected exactly one detection on unmarked-column marker ${key}`
      )
      actualLineOnlyKeys.push(key)
      continue
    }

    for (const element of lineElements) {
      actualColumnKeys.push(
        columnKey(element.location.path, element.location.line, element.location.column)
      )
    }
  }

  assert.deepEqual(
    sortedKeys(unmarkedDetections),
    [],
    "expected unmarked lines to have zero detections"
  )
  assert.deepEqual(
    sortedKeys(actualLineOnlyKeys),
    sortedKeys(expectedLineOnlyKeys),
    "expected line-only ~detect markers to match detections"
  )
  assert.deepEqual(
    sortedKeys(actualColumnKeys),
    sortedKeys(expectedColumnKeys),
    "expected column ~detect markers to match detections"
  )

  for (const marker of markers) {
    const key = lineKey(marker.fileName, marker.line)
    const lineElements = detectionsByLine.get(key) ?? []

    if (marker.columns === undefined) {
      assert.equal(lineElements.length, 1, `expected exactly one detection for marker ${key}`)
      continue
    }

    const actualColumns = sortedKeys(lineElements.map((element) => String(element.location.column)))
    const expectedColumns = sortedKeys(marker.columns.map(String))

    assert.deepEqual(actualColumns, expectedColumns, `expected columns for marker ${key} to match`)
  }
}

export const assertCheckFixtureExpectations = async (
  named: NamedCheck,
  disallowed: ReadonlyArray<ExpectedDetection>,
  allowed: ReadonlyArray<FixtureItem> = []
): Promise<void> => {
  const elements = await runNamedCheckFixture(named)

  assertDisallowedFixtureItems(elements, disallowed)

  if (allowed.length > 0) {
    assertAllowedFixtureItems(elements, allowed)
  }
}
