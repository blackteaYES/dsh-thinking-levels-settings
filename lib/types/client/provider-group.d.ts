/**
 * Provider group and model row rendering, with the two collapse levels.
 *
 * Collapse state is owned by the page (keyed by provider id and model key) so
 * it can persist and so search/filter can force groups open; this module is
 * presentational and reports toggles upward.
 *
 * A collapsed row still has to answer the question the user opened the page
 * with — which levels does this model offer — so it carries a summary line and
 * badges rather than being an empty bar.
 */
import * as React from "react";
import type { ModelEdit, ProviderEntry } from "./levels";
import type { Translate } from "./locale";
/** Stable row key for one provider/model pair. */
export declare function keyOf(providerId: string, modelId: string): string;
interface ProviderGroupProps {
    provider: ProviderEntry;
    /** Level vocabulary, discovered from the settings schema. */
    levels: readonly string[];
    /** Model ids to render; search and filters narrow the list this way. */
    visibleModelIds: ReadonlySet<string>;
    /** Collapsed state of the provider group. */
    open: boolean;
    onToggleProvider: () => void;
    /** Model keys that are expanded. */
    openModels: ReadonlySet<string>;
    onToggleModel: (key: string) => void;
    /** Draft for one model; when absent the stored configuration stands. */
    editOf: (key: string) => ModelEdit;
    onChange: (key: string, next: ModelEdit) => void;
    dirtyKeys: ReadonlySet<string>;
    disabled: boolean;
    t: Translate;
}
/** One provider and its models. */
export declare function ProviderGroup(props: ProviderGroupProps): React.ReactElement;
export {};
