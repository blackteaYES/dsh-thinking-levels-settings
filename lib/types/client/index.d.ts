/**
 * Per-model thinking-level settings page for the `llm-pi-ai` settings namespace.
 * Registers one `settings.section` slot contribution (declared by
 * `@deepseek-ai/dsh-client-ui-settings`) through the official composition path.
 * Data flows through the authenticated Settings wire; changes persist to
 * `~/.dsh/settings.yaml` under `llm-pi-ai.providers.*.models[*].reasoningEfforts`.
 *
 * Format notes (packages/client/AGENTS.md): exports only what cordis loading
 * needs (`apply`/`inject`); the render surface is assembled with plain
 * React.createElement. The bundle lands at lib/client.js via the tsdown preset
 * (window.__ModuleLoader__.load closure factory + module-table externals).
 */
import * as React from "react";
import type { IApiClient } from "@deepseek-ai/dsh-api-remotes/client";
/** Settings wire face consumed by the section: the shared API client's settings domain. */
type SettingsApi = IApiClient;
interface SectionProps {
    /** Settings wire face from the connection inject. */
    api: SettingsApi;
}
/** The Settings page body registered into the `settings.section` slot. */
export declare function ThinkingLevelsSection({ api }: SectionProps): React.ReactElement;
/** Client plugin apply: register the settings.section contribution, cleaned up on fiber unload. */
export declare function apply(ctx: any): void;
/** Required services: the connection (settings wire) and the slot system. */
export declare const inject: string[];
export {};
