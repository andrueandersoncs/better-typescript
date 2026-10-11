import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { initializeE2eRuntime } from "./e2e/helpers/runtime";

const runtime = initializeE2eRuntime();
const executionRepositoryDirectory = resolve(runtime.runDirectory, "repository");

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/isolation/**", "**/recovery/**", "**/live-steering.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // All tests share Playwright's one web server and database. State resets before each test.
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: runtime.baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  outputDir: "test-results",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: {
    command: `${runtime.resetCommand} && mkdir -p '${executionRepositoryDirectory}' && git -C '${executionRepositoryDirectory}' init -b main && printf '# Dashboard E2E repository\n' > '${executionRepositoryDirectory}/README.md' && git -C '${executionRepositoryDirectory}' add README.md && git -C '${executionRepositoryDirectory}' -c user.name='Task Based Pi E2E' -c user.email='e2e@example.invalid' -c commit.gpgSign=false commit -m initial && bun run start`,
    cwd: runtime.appDirectory,
    url: runtime.baseURL,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
    env: {
      ...runtime.webServerEnv,
      AGENT_WORKING_DIRECTORY: executionRepositoryDirectory,
      TASK_ISOLATION_MODE: "worktree",
      TASK_WORKSPACE_ROOT_DIRECTORY: `${runtime.dataDirectory}/workspaces`,
      TASK_INTEGRATION_MODE: "automatic",
      TASK_VERIFICATION_COMMAND: "true",
      // Test runners may inherit a coordinator-only role from their parent process.
      // The dashboard suite needs the combined HTTP application.
      TBP_PROCESS_ROLE: "all",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
