import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import type * as ts from "typescript"
import type { Rule } from "@better-typescript/core/linter"
import type { Violation } from "@better-typescript/core/linter"
import { violationLocationKey } from "./violationLocationKey.js"
import { fixturesRoot } from "./ruleTestFixturesRoot.js"
import { runRuleFixture } from "./runRuleFixture.js"

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

const lineKey = (fileName: string, line: number): string => `${fileName}:${line}`

const columnKey = (fileName: string, line: number, column: number): string =>
  `${fileName}:${line}:${column}`

const sortedKeys = (keys: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...keys].sort((left, right) => left.localeCompare(right))

export const assertRuleFixture = async (
  rule: Rule,
  compilerOptionOverrides: ts.CompilerOptions = {}
): Promise<void> => {
  const fixturePath = path.join(fixturesRoot, rule.name)
  const markers = markersInFixture(fixturePath)
  const elements = await runRuleFixture(rule, compilerOptionOverrides)

  for (const element of elements) {
    assert.ok(element.message.trim().length > 0, "expected every violation to be actionable")
  }

  const violationsByLine = new Map<string, Array<Violation>>()

  for (const element of elements) {
    const key = lineKey(element.filePath, element.line)
    const bucket = violationsByLine.get(key)

    if (bucket === undefined) {
      violationsByLine.set(key, [element])
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
  const unmarkedViolations: Array<string> = []

  for (const [key, lineElements] of violationsByLine) {
    if (!markedLineKeys.has(key)) {
      for (const element of lineElements) {
        unmarkedViolations.push(violationLocationKey(element))
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
        `expected exactly one violation on unmarked-column marker ${key}`
      )
      actualLineOnlyKeys.push(key)
      continue
    }

    for (const element of lineElements) {
      actualColumnKeys.push(columnKey(element.filePath, element.line, element.column))
    }
  }

  assert.deepEqual(
    sortedKeys(unmarkedViolations),
    [],
    "expected unmarked lines to have zero violations"
  )
  assert.deepEqual(
    sortedKeys(actualLineOnlyKeys),
    sortedKeys(expectedLineOnlyKeys),
    "expected line-only ~detect markers to match violations"
  )
  assert.deepEqual(
    sortedKeys(actualColumnKeys),
    sortedKeys(expectedColumnKeys),
    "expected column ~detect markers to match violations"
  )

  for (const marker of markers) {
    const key = lineKey(marker.fileName, marker.line)
    const lineElements = violationsByLine.get(key) ?? []

    if (marker.columns === undefined) {
      assert.equal(lineElements.length, 1, `expected exactly one violation for marker ${key}`)
      continue
    }

    const actualColumns = sortedKeys(lineElements.map((element) => String(element.column)))
    const expectedColumns = sortedKeys(marker.columns.map(String))

    assert.deepEqual(actualColumns, expectedColumns, `expected columns for marker ${key} to match`)
  }
}
