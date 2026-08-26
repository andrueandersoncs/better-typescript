import { defineConfig } from "vitepress"

export default defineConfig({
  title: "Better TypeScript",
  description: "A focused TypeScript linter built on the compiler API.",
  base: "/better-typescript/",
  srcExclude: [
    "agents/**",
    "compiler-foundation.md",
    "effect-snapshot.md",
    "project-local-custom-rules.md",
  ],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "Configuration", link: "/configuration" },
      { text: "Rules", link: "/rules" },
      { text: "Project", link: "/project" },
    ],
    sidebar: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "Configuration", link: "/configuration" },
      { text: "Rules", link: "/rules" },
      { text: "Project", link: "/project" },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/andrueandersoncs/better-typescript",
      },
    ],
  },
})
