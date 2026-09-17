/**
 * Shared tsdown preset mirroring the official deepseek-harness
 * packages/client/tsdown.client.ts clientBundle() shape, adapted for this
 * standalone profile plugin:
 *
 *  - lib half: src/index.ts → lib/index.js (node-side no-op apply)
 *  - client half: src/client/index.ts (+ ./settings-wire) → lib/client.js, a
 *    closure-factory artifact calling window.__ModuleLoader__.load({id,
 *    factory}), resolving platform modules through the injected require (loader
 *    seed table) and inlining everything else into the bundle.
 *
 * Version policy: the client bundle imports exactly one platform module —
 * `react` — which every DSH web seed table provides. It deliberately imports no
 * `@deepseek-ai/*` package (not even types): each such module-table name is one
 * more thing a DSH upgrade can retire, and that is exactly how this plugin
 * broke once. Platform collaboration goes through cordis services resolved at
 * runtime instead, and the purity plugin below keeps that property enforced at
 * build time.
 */
import { defineConfig } from "tsdown"
import { readFileSync } from "node:fs"

const PLUGIN_ID = "dsh-thinking-levels-settings"

/**
 * The version shown in the page is injected at build time from package.json,
 * never hand-maintained: a hardcoded copy drifts from the published version and
 * misleads exactly when someone is trying to work out which build they are
 * looking at. Inlined as a literal, so it is also greppable in lib/client.js.
 */
const PLUGIN_VERSION: string = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
).version

/**
 * Imports answered by the loader's platform seed table. Kept to `react` alone:
 * every other seed is a DSH-internal package this plugin has no reason to link
 * against. Anything not listed here is inlined into the closure factory, so the
 * bundle needs no network and no platform symbol at materialization time.
 */
const PLATFORM_MODULES = ["react", "react/jsx-runtime", "react-dom", "react-dom/client"] as const

export default defineConfig([
  // Node half (lib/index.js) — no host behavior.
  {
    entry: ["src/index.ts"],
    outDir: "lib",
    format: ["esm"],
    platform: "node",
    target: "es2024",
    dts: false,
    clean: true,
    sourcemap: true,
    fixedExtension: false,
  },
  // Invariant companion (lib/invariant.js).
  {
    entry: ["src/invariant.ts"],
    outDir: "lib",
    format: ["esm"],
    platform: "node",
    target: "es2024",
    dts: false,
    clean: false,
    sourcemap: true,
    fixedExtension: false,
  },
  // Browser client bundle (lib/client.js) — closure-factory ModuleLoader artifact.
  {
    entry: { client: "src/client/index.ts" },
    outDir: "lib",
    format: "cjs",
    platform: "browser",
    target: "es2024",
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      // Only the seed-table modules stay external; this package has no runtime
      // dependencies, so every other import is a relative source file and is
      // inlined into the closure (settings-wire included).
      neverBundle: [...PLATFORM_MODULES],
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
      "import.meta.env.MODE": JSON.stringify(process.env.NODE_ENV ?? "production"),
      "import.meta.env": JSON.stringify({ MODE: process.env.NODE_ENV ?? "production" }),
      // Surfaced in the page footer so a running build can be identified.
      __PLUGIN_VERSION__: JSON.stringify(PLUGIN_VERSION),
    },
    plugins: [
      {
        name: "dsh-client-bundle-purity",
        resolveId(source: string) {
          if (!source.startsWith("@deepseek-ai/")) return null
          throw new Error(
            `client bundle purity: "${source}" must not be imported by the client bundle — ` +
            "a platform package name is a version-pinned contract; collaborate through " +
            "cordis services resolved at runtime (ctx.get / probed wire) instead",
          )
        },
      },
    ],
    outputOptions: {
      entryFileNames: "client.js",
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: "return module.exports; } });",
      intro: "var module = { exports: {} }; var exports = module.exports;",
    },
  },
])
