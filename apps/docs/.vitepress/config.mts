import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Onshape CadScript",
  description: "Script-first Onshape CAD for Codex and hobby 3D printing",
  base: "/onshape-cadscript/",
  cleanUrls: true,
  head: [
    ["meta", { name: "theme-color", content: "#102A43" }],
    ["link", { rel: "icon", href: "/onshape-cadscript/icon.svg" }],
  ],
  themeConfig: {
    logo: "/icon.svg",
    nav: [
      { text: "Guide", link: "/setup/" },
      { text: "Reference", link: "/reference/model-format" },
      { text: "Roadmap", link: "/roadmap" },
    ],
    sidebar: [
      {
        text: "Setup",
        items: [
          { text: "Overview", link: "/setup/" },
          { text: "Codex plugin", link: "/setup/codex" },
          { text: "Chrome bridge", link: "/setup/chrome" },
          { text: "Troubleshooting", link: "/troubleshooting" },
        ],
      },
      {
        text: "Modeling",
        items: [
          { text: "Model files", link: "/guide/model-files" },
          { text: "Parameters", link: "/guide/parameters" },
          { text: "Sketches", link: "/guide/sketches" },
          { text: "SVG import", link: "/guide/svg-import" },
          { text: "Features", link: "/guide/features" },
          { text: "Queries", link: "/guide/queries" },
          { text: "Deployment safety", link: "/guide/deployment-safety" },
          { text: "STL export", link: "/guide/stl-export" },
          { text: "Print tolerances", link: "/guide/print-tolerances" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Model format", link: "/reference/model-format" },
          { text: "MCP tools", link: "/reference/mcp-tools" },
          { text: "Coverage", link: "/reference/coverage" },
          { text: "TypeDoc API", link: "/api/" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Architecture", link: "/architecture" },
          { text: "Security", link: "/security/" },
          { text: "Privacy", link: "/security/privacy" },
          { text: "Contributing", link: "/contributing" },
          { text: "Releases", link: "/releases" },
          { text: "Roadmap", link: "/roadmap" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/ricokahler/onshape-cadscript" }],
    search: { provider: "local" },
    footer: {
      message: "Unofficial community project. Not affiliated with Onshape or PTC.",
      copyright: "MIT License",
    },
  },
});
