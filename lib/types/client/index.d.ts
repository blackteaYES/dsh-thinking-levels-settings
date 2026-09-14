/**
 * Per-model thinking-level settings page for the `llm-pi-ai` settings namespace.
 * Registers one `settings.section` slot contribution (declared by the DSH
 * settings UI) through the official composition path. Data flows through a
 * runtime-probed settings channel (see `./settings-wire`) and persists to
 * `~/.dsh/settings.yaml` under `llm-pi-ai.providers.*.models[*].reasoningEfforts`.
 *
 * Version policy: this file imports nothing from `@deepseek-ai/*` — not even
 * types. Every platform fact is either probed at runtime (settings wire,
 * pushed refresh events) or has a documented fallback (level vocabulary is
 * discovered from the settings schema, default list otherwise). A DSH upgrade
 * that renames a package, service, envelope, or argument shape therefore
 * cannot take this page down; the previous breakage was exactly a pinned
 * `IApiClient`/`ctx.connection.api` contract.
 *
 * Format notes (packages/client/AGENTS.md): exports only what cordis loading
 * needs (`apply`/`inject`); the render surface is assembled with plain
 * React.createElement. The bundle lands at lib/client.js via the tsdown preset
 * (window.__ModuleLoader__.load closure factory + module-table externals).
 */
import * as React from "react";
import type { SettingsWire } from "./settings-wire";
interface SectionProps {
    /** Runtime-probed settings channel, resolved once per plugin activation. */
    wire: SettingsWire;
    /** Subscribe to pushed settings changes; returns the unsubscribe function. */
    subscribe: (listener: () => void) => () => void;
}
/** The Settings page body registered into the `settings.section` slot. */
export declare function ThinkingLevelsSection({ wire, subscribe }: SectionProps): React.ReactElement;
/** Client plugin apply: register the settings.section contribution, cleaned up on fiber unload. */
export declare function apply(ctx: any): void;
/** Hard service dependency: without the slot system there is nothing to register. Everything else is probed. */
export declare const inject: string[];
export {};
