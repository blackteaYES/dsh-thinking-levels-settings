/**
 * Shared tsdown preset mirroring the official deepseek-harness
 * packages/client/tsdown.client.ts clientBundle() shape, adapted for this
 * standalone profile plugin:
 *
 *  - lib half: src/index.ts → lib/index.js (node-side no-op apply)
 *  - client half: src/client/index.ts → lib/client.js, a closure-factory
 *    artifact calling window.__ModuleLoader__.load({id, factory}), resolving
 *    platform modules through the injected require (loader module table) and
 *    inlining everything else (react, wire layers) into the bundle.
 */
import { defineConfig } from "tsdown"

const PLUGIN_ID = "dsh-thinking-levels-settings"

/**
 * Wire/type layers a client bundle may inline: browser-safe contracts with
 * no shared runtime identity. Everything else under @deepseek-ai/* is either
 * a module-table entry (external) or a cross-plugin value import (forbidden).
 */
const EXTERNAL_PLATFORM_MODULES = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-web-react",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-ui-attachment",
  "@deepseek-ai/dsh-client-schema-form",
] as const

const INLINE_SAFE = /^@deepseek-ai\/dsh-(host-apiproxy|session|llm|tools|brand)(\/|$)/

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
    external: [...EXTERNAL_PLATFORM_MODULES],
    // tsdown auto-externalizes package dependencies; the loader module table
    // only answers the platform seeds, so anything else must inline
    // (wire/type layers, react's jsx-runtime, zod, clsx).
    noExternal: (id: string) => (EXTERNAL_PLATFORM_MODULES.includes(id as never) ? undefined : true),
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
      "import.meta.env.MODE": JSON.stringify(process.env.NODE_ENV ?? "production"),
      "import.meta.env": JSON.stringify({ MODE: process.env.NODE_ENV ?? "production" }),
    },
    plugins: [
      {
        name: "dsh-client-bundle-purity",
        resolveId(source: string) {
          if (!source.startsWith("@deepseek-ai/")) return null
          if ((EXTERNAL_PLATFORM_MODULES as readonly string[]).includes(source)) return null
          if (INLINE_SAFE.test(source)) return null
          throw new Error(
            `client bundle purity: "${source}" is not a platform module or an inline-safe wire layer — ` +
            "cross-plugin value imports are forbidden; collaborate through cordis services",
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