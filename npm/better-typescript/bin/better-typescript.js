#!/usr/bin/env node

"use strict";

const { spawnSync } = require("node:child_process");

const packages = {
  "darwin-arm64": "@better-typescript/better-typescript-darwin-arm64",
  "darwin-x64": "@better-typescript/better-typescript-darwin-amd64",
  "linux-arm64": "@better-typescript/better-typescript-linux-arm64",
  "linux-x64": "@better-typescript/better-typescript-linux-amd64",
};

const target = `${process.platform}-${process.arch}`;
const packageName = packages[target];
if (packageName === undefined) {
  console.error(`better-typescript does not support ${process.platform}/${process.arch}.`);
  process.exit(1);
}

let binary;
try {
  binary = require.resolve(`${packageName}/bin/better-typescript`);
} catch {
  console.error(
    `better-typescript could not find ${packageName}. Reinstall with optional dependencies enabled.`,
  );
  process.exit(1);
}

const result = spawnSync(binary, process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
if (result.error !== undefined) {
  console.error(`better-typescript could not start: ${result.error.message}`);
  process.exit(1);
}
if (result.signal !== null) {
  process.kill(process.pid, result.signal);
}
process.exit(result.status ?? 1);
