/**
 * Per-model thinking-level settings page for the `llm-pi-ai` settings namespace.
 * Registers one `settings.section` slot contribution (declared by the DSH
 * settings UI) through the official composition path. Data flows through a
 * runtime-probed settings channel (see `./settings-wire`) and persists to
 * `~/.dsh/settings.yaml` under `llm-pi-ai.providers.*.models[*]`.
 *
 * Version policy: this file imports nothing from `@deepseek-ai/*` — not even
 * types. Every platform fact is either probed at runtime (settings wire, locale
 * service, pushed refresh events) or has a documented fallback (level
 * vocabulary from the settings schema, Chinese copy when the locale service is
 * absent). A DSH upgrade that renames a package, service, envelope, or argument
 * shape therefore cannot take this page down; the previous breakage was exactly
 * a pinned `IApiClient`/`ctx.connection.api` contract.
 *
 * Write policy: the `models` array is replaced **whole**. Path operations that
 * address an array index are destructive — `applyPathOp`
 * (`dsh-settings/lib/index.js:113-151`) treats an array as a non-object and
 * degrades it into `{"0": ...}`, so `path: ["providers", id, "models", "0",
 * "input"]` would destroy the list. Every write therefore clones the array,
 * edits only the entries it owns, and sends one `set` with `expectedRevision`,
 * which the settings service validates before persisting
 * (`:456-470`) and rejects on a revision mismatch rather than overwriting.
 *
 * Format notes (packages/client/AGENTS.md): exports only what cordis loading
 * needs (`apply`/`inject`); the render surface is assembled with plain
 * React.createElement. The bundle lands at lib/client.js via the tsdown preset
 * (window.__ModuleLoader__.load closure factory + module-table externals).
 */
import * as React from "react";
import type { SettingsWire } from "./settings-wire";
import type { Translate } from "./locale";
interface SectionProps {
    /** Runtime-probed settings channel, resolved once per plugin activation. */
    wire: SettingsWire;
    /** Subscribe to pushed settings changes; returns the unsubscribe function. */
    subscribe: (listener: () => void) => () => void;
    /** Runtime-probed translate function; falls back to the bundled Chinese copy. */
    t: Translate;
}
/** The Settings page body registered into the `settings.section` slot. */
export declare function ThinkingLevelsSection({ wire, subscribe, t }: SectionProps): React.ReactElement;
/**
 * Client plugin apply: register the settings.section contribution, cleaned up
 * on fiber unload.
 */
export declare function apply(ctx: any): void;
/** Hard service dependency: without the slot system there is nothing to register. Everything else is probed. */
export declare const inject: string[];
export {};
