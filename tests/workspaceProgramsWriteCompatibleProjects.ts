import * as fs from "node:fs/promises"
import * as path from "node:path"

export const writeCompatibleProjects = async (root: string): Promise<void> => {
  const sharedTsconfig = {
    compilerOptions: {
      strict: true,
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      lib: ["ES2022"]
    },
    include: ["src/**/*.ts"]
  }

  for (const projectName of ["alpha", "beta"]) {
    const projectRoot = path.join(root, projectName)
    await fs.mkdir(path.join(projectRoot, "src"), { recursive: true })
    await fs.writeFile(
      path.join(projectRoot, "tsconfig.json"),
      `${JSON.stringify(sharedTsconfig, null, 2)}\n`
    )
    await fs.writeFile(
      path.join(projectRoot, "src", "index.ts"),
      `export const ${projectName}Value = 1\n`
    )
  }

  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    `${JSON.stringify(
      {
        files: [],
        references: [{ path: "alpha" }, { path: "beta" }]
      },
      null,
      2
    )}\n`
  )
}
