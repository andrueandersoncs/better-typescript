# Getting started

## Prerequisites

- Git
- bash
- mise
- Bun 1.3.0
- Node.js 18 or newer with npm
- Network access for Go and package downloads

The project intentionally uses the latest Go 1.26 patch selected by mise.

## Install

Install the npm package in a TypeScript project:

```sh
npm install --save-dev @better-typescript/better-typescript
npx better-typescript
```

Alternatively, install a published tag with Go:

```sh
go install github.com/andrueandersoncs/better-typescript/cmd/better-typescript@<version>
```

## Run

Run the binary from a directory containing `tsconfig.json`:

```sh
npx better-typescript
```

With no flags or configuration, the command checks all project files with all rules.

### Select files

Restrict files with project-relative globs:

```sh
npx better-typescript --files 'src/**/*.ts'
```

Quote globs so the CLI expands them instead of the shell. Repeat the flag or separate its values with commas.

### Select rules

Restrict rules by name:

```sh
npx better-typescript --rules no-throw
npx better-typescript --rules no-throw,no-error-type
```

Repeat the flag or separate its values with commas.

## Build from source

A source checkout is a normal Go module:

```sh
mise exec go@1.26 -- go build ./cmd/better-typescript
```

The command writes `./better-typescript`.
