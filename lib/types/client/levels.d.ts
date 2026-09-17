/**
 * Pure projection, validation and interchange logic for the thinking-levels
 * settings page.
 *
 * Everything here is a plain function over plain data: the vocabulary the page
 * offers, the projection between a `models[]` entry and an editable draft, the
 * rules the save path enforces, and the JSON interchange format. No React and
 * no `@deepseek-ai/*` import appear in this module, which is what lets the
 * page's rules be reasoned about without booting DSH.
 *
 * Format facts encoded below, each verified against
 * `dsh-llm-pi-ai/lib/index.js`:
 *
 *  - `reasoningEfforts` is **absent** (inherit the installed catalog), `false`
 *    (non-reasoning), or a **non-empty** map from level id to wire spelling
 *    (`resolveModelReasoning`, :562-585).
 *  - Only `off` may carry an empty value, and it means "supported, send
 *    nothing" (:553-556, :571-573).
 *  - A map must offer **at least one level beyond `off`**. "Off only" is
 *    refused, so the non-reasoning case must be expressed as `false` (:574).
 *    This is why the editor offers three modes rather than a checkbox set.
 *  - Level ids are locked to the schema's vocabulary; the page discovers it
 *    from the serialized schema and never invents a level.
 *  - `input` names modalities. Absent or empty inherits the catalog, then the
 *    route's `defaultInput` (`declaredInput`, :288-294) — so "both unchecked"
 *    is a legitimate, meaningfully different state from "text unchecked".
 */
import type { RawSettingsDocument } from "./settings-wire";
/** Human-facing name of a level id. Level ids are vendor vocabulary, not UI copy, so they are not translated. */
export declare function levelLabel(id: string): string;
/** Human-facing name of a modality id. */
export declare function modalityLabel(id: string): string;
/** Settings namespace that owns the custom providers. */
export declare const NAMESPACE = "llm-pi-ai";
/** Level vocabulary used when the settings schema carries no discoverable one. */
export declare const DEFAULT_LEVELS: readonly string[];
/** Request modalities an `input` declaration may name. */
export declare const MODALITIES: readonly string[];
type Rec = Record<string, unknown>;
export declare function isRecord(value: unknown): value is Rec;
/** Structural clone of a JSON value; anything unrepresentable becomes `null`. */
export declare function cloneJson(value: unknown): unknown;
/**
 * How a model entry expresses its reasoning capability. The three modes map
 * one-to-one onto the three legal wire shapes, so an illegal combination
 * cannot be written by accident.
 */
export type ReasoningMode = "inherit" | "false" | "map";
/** One model's editable configuration. */
export interface ModelEdit {
    mode: ReasoningMode;
    /** Level id → wire spelling. `""` is meaningful for `off` alone (send nothing). */
    efforts: Record<string, string>;
    /** Selected modalities; `undefined` omits the field, which inherits. */
    input: readonly string[] | undefined;
}
/** Project a stored `models[]` entry into its editable form. */
export declare function editFromModel(model: Rec, levels: readonly string[]): ModelEdit;
/** Apply a draft back onto a stored entry, preserving every field it does not own. */
export declare function applyEdit(model: Rec, edit: ModelEdit, levels: readonly string[]): Rec;
/** Canonical identity of a draft, used for dirty checking and per-provider diffing. */
export declare function editSignature(edit: ModelEdit, levels: readonly string[]): string;
/** A validation failure, reported as a message code so the caller can translate it. */
export interface EditError {
    code: string;
    params?: Record<string, unknown>;
}
/**
 * Reject a draft the schema would refuse, before it reaches the wire. The
 * settings service validates before persisting (so a bad write can never land),
 * but catching it here keeps the diagnostics next to the field at fault.
 */
export declare function validateEdit(edit: ModelEdit, levels: readonly string[]): EditError | undefined;
/** Vendor starting points; levels absent from the active vocabulary are dropped. */
export interface Preset {
    id: string;
    efforts: Record<string, string>;
}
export declare const PRESETS: readonly Preset[];
/** Turn a preset into a full draft over the active vocabulary. */
export declare function presetEdit(preset: Preset, levels: readonly string[]): ModelEdit;
/** A compact description of a draft, for collapsed rows and previews. */
export interface EditSummary {
    mode: ReasoningMode;
    /** Enabled level ids, in vocabulary order. */
    levels: readonly string[];
    /** Enabled level ids that actually switch thinking on. */
    thinking: readonly string[];
    /** True when `off` is declared without a wire value (send nothing). */
    offSendsNothing: boolean;
    /** Declared modalities; empty means the field is omitted and therefore inherits. */
    modalities: readonly string[];
}
export declare function summarize(edit: ModelEdit, levels: readonly string[]): EditSummary;
/**
 * Every filter the page can apply. Order is the order they are offered in.
 *
 * They are split into two groups for display: the ones shown as always-visible
 * chips, and the rest, which live in the 更多 menu. The split is about how often
 * a filter is reached for, not about importance — "已配置/未配置" answer "what
 * have I set up", which is a question people ask less often than "which models
 * take images".
 */
export declare const FILTERS: readonly ["all", "configured", "unconfigured", "nonreasoning", "image", "dirty"];
export type FilterId = (typeof FILTERS)[number];
/** Filters shown as always-visible chips. The rest are offered in 更多. */
export declare const QUICK_FILTERS: readonly ["all", "image"];
/** Filters offered inside the 更多 menu. */
export declare const EXTRA_FILTERS: readonly ["configured", "unconfigured", "nonreasoning", "dirty"];
/** What each filter is evaluated against: the stored declaration and the draft. */
export interface RowFacts {
    /** The declaration as it stands in `settings.yaml`. */
    stored: ModelEdit;
    /** The draft, which equals {@link stored} when the row is untouched. */
    edit: ModelEdit;
    dirty: boolean;
}
/**
 * Filters read the **stored** declaration rather than the draft, so the chips
 * answer "what is configured" instead of drifting with unsaved typing. The
 * `dirty` chip is the one exception, being about the draft by definition.
 */
export declare function matchesFilter(filter: FilterId, facts: RowFacts): boolean;
/** One model entry as the page sees it. */
export interface ModelEntry {
    id: string;
    name: string;
    /** The stored entry, cloned on read so a draft can never mutate page state. */
    raw: Rec;
    stored: ModelEdit;
}
/** One provider profile and its models. */
export interface ProviderEntry {
    id: string;
    name: string;
    api: string;
    models: ModelEntry[];
}
/**
 * Pick the namespace to edit: an exact match first, otherwise one whose
 * section holds a `providers` map and whose schema carries a level vocabulary.
 * The shape scan is what survives a namespace rename.
 */
export declare function pickNamespace(document: RawSettingsDocument, vocabulary: (ns: string) => readonly string[] | undefined): string | undefined;
/** Namespace names present in a document, for diagnostics. */
export declare function namespaceNames(document: RawSettingsDocument): string[];
/** Read the user layer of one namespace, which is the layer this page writes. */
export declare function userSection(document: RawSettingsDocument, namespace: string): Rec;
/** Revision of one namespace, when the document reports one. */
export declare function revisionOf(document: RawSettingsDocument, namespace: string): number | undefined;
/** Project the document's configured providers into page rows. */
export declare function providerEntries(document: RawSettingsDocument, namespace: string, levels: readonly string[]): ProviderEntry[];
/**
 * The **complete** `models` array of one provider, exactly as stored.
 *
 * Saving needs this rather than the page rows: {@link providerEntries} skips
 * entries it cannot render (a malformed row, a missing id), and rebuilding the
 * array from rows alone would silently drop them. Every entry is returned, and
 * only the ones with a draft are rewritten.
 */
export declare function rawModelsArray(document: RawSettingsDocument, namespace: string, providerId: string): unknown[] | undefined;
/** A stable key for one model row. */
export declare function modelKey(providerId: string, modelId: string): string;
/** Interchange format identifier; a mismatched document is refused on import. */
export declare const EXPORT_FORMAT = "dsh-thinking-levels/v1";
/** One model's exported configuration, in exactly the shape `settings.yaml` takes. */
export interface ExportedModel {
    reasoningEfforts?: unknown;
    input?: readonly string[];
}
/** The whole exported document. */
export interface ExportedDocument {
    format: string;
    providers: Record<string, Record<string, ExportedModel>>;
}
/**
 * Build the export document from the **drafts**, so what is exported is what
 * the page currently shows — including edits that have not been saved yet.
 */
export declare function buildExport(providers: readonly ProviderEntry[], editOf: (key: string) => ModelEdit, levels: readonly string[]): ExportedDocument;
/** Outcome of parsing an imported document. */
export type ImportOutcome = {
    ok: true;
    edits: Map<string, ModelEdit>;
} | {
    ok: false;
    code: string;
    params?: Record<string, unknown>;
};
/**
 * Parse an exported document back into drafts. Import never writes: it
 * produces drafts for review, so a mistyped file cannot reach `settings.yaml`
 * unreviewed.
 */
export declare function parseImport(text: string, levels: readonly string[]): ImportOutcome;
export {};
