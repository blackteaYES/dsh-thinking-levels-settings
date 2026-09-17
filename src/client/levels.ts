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
import type { RawNamespace, RawSettingsDocument } from "./settings-wire"

/** Display spellings for the known levels; a future level falls back to a capitalized id. */
const LEVEL_LABELS: Readonly<Record<string, string>> = {
  off: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
  max: "Max",
}

/** Human-facing name of a level id. Level ids are vendor vocabulary, not UI copy, so they are not translated. */
export function levelLabel(id: string): string {
  return LEVEL_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1)
}

/** Human-facing name of a modality id. */
export function modalityLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

/** Settings namespace that owns the custom providers. */
export const NAMESPACE = "llm-pi-ai"

/** Level vocabulary used when the settings schema carries no discoverable one. */
export const DEFAULT_LEVELS: readonly string[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"]

/** Request modalities an `input` declaration may name. */
export const MODALITIES: readonly string[] = ["text", "image"]

type Rec = Record<string, unknown>

export function isRecord(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Structural clone of a JSON value; anything unrepresentable becomes `null`. */
export function cloneJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (Array.isArray(value)) return value.map((item) => cloneJson(item))
  if (!isRecord(value)) return null
  const result: Rec = {}
  for (const key of Object.keys(value)) result[key] = cloneJson(value[key])
  return result
}

/**
 * How a model entry expresses its reasoning capability. The three modes map
 * one-to-one onto the three legal wire shapes, so an illegal combination
 * cannot be written by accident.
 */
export type ReasoningMode = "inherit" | "false" | "map"

/** One model's editable configuration. */
export interface ModelEdit {
  mode: ReasoningMode
  /** Level id → wire spelling. `""` is meaningful for `off` alone (send nothing). */
  efforts: Record<string, string>
  /** Selected modalities; `undefined` omits the field, which inherits. */
  input: readonly string[] | undefined
}

/** Project a stored `models[]` entry into its editable form. */
export function editFromModel(model: Rec, levels: readonly string[]): ModelEdit {
  const raw = model.reasoningEfforts
  const efforts: Record<string, string> = {}
  let mode: ReasoningMode = "inherit"
  if (raw === false) {
    mode = "false"
  } else if (isRecord(raw)) {
    mode = "map"
    for (const id of levels) {
      if (!Object.prototype.hasOwnProperty.call(raw, id)) continue
      const wire = raw[id]
      // A valueless key survives validation for `off` only; keep it as "".
      if (wire === null) efforts[id] = ""
      else if (typeof wire === "string") efforts[id] = wire
    }
  }
  const declared = Array.isArray(model.input) ? model.input : []
  const kept = MODALITIES.filter((modality) => declared.includes(modality))
  // An empty declaration means "no opinion" — identical to an absent field.
  return { mode, efforts, input: kept.length > 0 ? kept : undefined }
}

/** Apply a draft back onto a stored entry, preserving every field it does not own. */
export function applyEdit(model: Rec, edit: ModelEdit, levels: readonly string[]): Rec {
  const cloned = cloneJson(model)
  const copy: Rec = isRecord(cloned) ? cloned : {}
  if (edit.mode === "inherit") {
    delete copy.reasoningEfforts
  } else if (edit.mode === "false") {
    copy.reasoningEfforts = false
  } else {
    const map: Rec = {}
    for (const id of levels) {
      if (!Object.prototype.hasOwnProperty.call(edit.efforts, id)) continue
      const wire = edit.efforts[id].trim()
      if (id === "off" && wire.length === 0) map.off = null
      else map[id] = wire
    }
    copy.reasoningEfforts = map
  }
  if (edit.input === undefined) delete copy.input
  else copy.input = MODALITIES.filter((modality) => (edit.input as readonly string[]).includes(modality))
  return copy
}

/** Canonical identity of a draft, used for dirty checking and per-provider diffing. */
export function editSignature(edit: ModelEdit, levels: readonly string[]): string {
  const efforts = levels
    .filter((id) => Object.prototype.hasOwnProperty.call(edit.efforts, id))
    .map((id) => [id, edit.efforts[id]])
  return JSON.stringify([edit.mode, efforts, edit.input ?? null])
}

/** A validation failure, reported as a message code so the caller can translate it. */
export interface EditError {
  code: string
  params?: Record<string, unknown>
}

/**
 * Reject a draft the schema would refuse, before it reaches the wire. The
 * settings service validates before persisting (so a bad write can never land),
 * but catching it here keeps the diagnostics next to the field at fault.
 */
export function validateEdit(edit: ModelEdit, levels: readonly string[]): EditError | undefined {
  if (edit.mode !== "map") return undefined
  const enabled = levels.filter((id) => Object.prototype.hasOwnProperty.call(edit.efforts, id))
  if (enabled.length === 0) return { code: "error.needLevel" }
  for (const id of enabled) {
    if (id === "off") continue
    if (edit.efforts[id].trim().length === 0) return { code: "error.needWire", params: { level: id } }
  }
  // An empty map and an off-only map are both refused upstream; only `false`
  // expresses "this model does not reason".
  if (!enabled.some((id) => id !== "off")) return { code: "error.offOnly" }
  return undefined
}

/** Vendor starting points; levels absent from the active vocabulary are dropped. */
export interface Preset {
  id: string
  efforts: Record<string, string>
}

export const PRESETS: readonly Preset[] = [
  { id: "deepseek", efforts: { off: "none", high: "high", max: "max" } },
  { id: "openai", efforts: { off: "none", low: "low", medium: "medium", high: "high" } },
  { id: "grok", efforts: { low: "low", medium: "medium", high: "high" } },
]

/** Turn a preset into a full draft over the active vocabulary. */
export function presetEdit(preset: Preset, levels: readonly string[]): ModelEdit {
  const efforts: Record<string, string> = {}
  for (const id of levels) {
    if (Object.prototype.hasOwnProperty.call(preset.efforts, id)) efforts[id] = preset.efforts[id]
  }
  return { mode: "map", efforts, input: undefined }
}

/** A compact description of a draft, for collapsed rows and previews. */
export interface EditSummary {
  mode: ReasoningMode
  /** Enabled level ids, in vocabulary order. */
  levels: readonly string[]
  /** Enabled level ids that actually switch thinking on. */
  thinking: readonly string[]
  /** True when `off` is declared without a wire value (send nothing). */
  offSendsNothing: boolean
  /** Declared modalities; empty means the field is omitted and therefore inherits. */
  modalities: readonly string[]
}

export function summarize(edit: ModelEdit, levels: readonly string[]): EditSummary {
  const enabled = levels.filter((id) => Object.prototype.hasOwnProperty.call(edit.efforts, id))
  return {
    mode: edit.mode,
    levels: enabled,
    thinking: enabled.filter((id) => id !== "off"),
    offSendsNothing: enabled.includes("off") && edit.efforts.off.trim().length === 0,
    modalities: edit.input ?? [],
  }
}

/**
 * Every filter the page can apply. Order is the order they are offered in.
 *
 * They are split into two groups for display: the ones shown as always-visible
 * chips, and the rest, which live in the 更多 menu. The split is about how often
 * a filter is reached for, not about importance — "已配置/未配置" answer "what
 * have I set up", which is a question people ask less often than "which models
 * take images".
 */
export const FILTERS = ["all", "configured", "unconfigured", "nonreasoning", "image", "dirty"] as const
export type FilterId = (typeof FILTERS)[number]

/** Filters shown as always-visible chips. The rest are offered in 更多. */
export const QUICK_FILTERS = ["all", "image"] as const satisfies readonly FilterId[]

/** Filters offered inside the 更多 menu. */
export const EXTRA_FILTERS = ["configured", "unconfigured", "nonreasoning", "dirty"] as const satisfies readonly FilterId[]

/** What each filter is evaluated against: the stored declaration and the draft. */
export interface RowFacts {
  /** The declaration as it stands in `settings.yaml`. */
  stored: ModelEdit
  /** The draft, which equals {@link stored} when the row is untouched. */
  edit: ModelEdit
  dirty: boolean
}

/**
 * Filters read the **stored** declaration rather than the draft, so the chips
 * answer "what is configured" instead of drifting with unsaved typing. The
 * `dirty` chip is the one exception, being about the draft by definition.
 */
export function matchesFilter(filter: FilterId, facts: RowFacts): boolean {
  switch (filter) {
    case "all":
      return true
    case "configured":
      return facts.stored.mode !== "inherit" || facts.stored.input !== undefined
    case "unconfigured":
      return facts.stored.mode === "inherit" && facts.stored.input === undefined
    case "nonreasoning":
      return facts.stored.mode === "false"
    case "image":
      return (facts.stored.input ?? []).includes("image")
    case "dirty":
      return facts.dirty
  }
}

/** One model entry as the page sees it. */
export interface ModelEntry {
  id: string
  name: string
  /** The stored entry, cloned on read so a draft can never mutate page state. */
  raw: Rec
  stored: ModelEdit
}

/** One provider profile and its models. */
export interface ProviderEntry {
  id: string
  name: string
  api: string
  models: ModelEntry[]
}

/**
 * Pick the namespace to edit: an exact match first, otherwise one whose
 * section holds a `providers` map and whose schema carries a level vocabulary.
 * The shape scan is what survives a namespace rename.
 */
export function pickNamespace(document: RawSettingsDocument, vocabulary: (ns: string) => readonly string[] | undefined): string | undefined {
  const namespaces = Array.isArray(document.namespaces) ? (document.namespaces as RawNamespace[]) : []
  if (namespaces.some((item) => isRecord(item) && item.ns === NAMESPACE)) return NAMESPACE
  for (const item of namespaces) {
    if (!isRecord(item) || typeof item.ns !== "string") continue
    const bag = isRecord(item.user) ? item.user : isRecord(item.value) ? item.value : undefined
    if (bag !== undefined && isRecord(bag.providers) && vocabulary(item.ns) !== undefined) return item.ns
  }
  return undefined
}

/** Namespace names present in a document, for diagnostics. */
export function namespaceNames(document: RawSettingsDocument): string[] {
  const namespaces = Array.isArray(document.namespaces) ? (document.namespaces as RawNamespace[]) : []
  return namespaces.map((item) => (isRecord(item) && typeof item.ns === "string" ? item.ns : "?"))
}

/** Read the user layer of one namespace, which is the layer this page writes. */
export function userSection(document: RawSettingsDocument, namespace: string): Rec {
  const namespaces = Array.isArray(document.namespaces) ? (document.namespaces as RawNamespace[]) : []
  const view = namespaces.find((item) => isRecord(item) && item.ns === namespace)
  return isRecord(view?.user) ? (view as Rec).user as Rec : {}
}

/** Revision of one namespace, when the document reports one. */
export function revisionOf(document: RawSettingsDocument, namespace: string): number | undefined {
  const namespaces = Array.isArray(document.namespaces) ? (document.namespaces as RawNamespace[]) : []
  const view = namespaces.find((item) => isRecord(item) && item.ns === namespace)
  return isRecord(view) && typeof view.revision === "number" ? view.revision : undefined
}

/** Project the document's configured providers into page rows. */
export function providerEntries(document: RawSettingsDocument, namespace: string, levels: readonly string[]): ProviderEntry[] {
  const user = userSection(document, namespace)
  const configured = isRecord(user.providers) ? user.providers : {}
  const providers: ProviderEntry[] = []
  for (const id of Object.keys(configured)) {
    const profile = configured[id]
    if (!isRecord(profile) || !Array.isArray(profile.models)) continue
    const models: ModelEntry[] = []
    for (const entry of profile.models) {
      if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.length === 0) continue
      const raw = cloneJson(entry)
      const record: Rec = isRecord(raw) ? raw : {}
      models.push({
        id: entry.id,
        name: typeof entry.name === "string" && entry.name.length > 0 ? entry.name : entry.id,
        raw: record,
        stored: editFromModel(record, levels),
      })
    }
    if (models.length === 0) continue
    providers.push({
      id,
      name: typeof profile.displayName === "string" && profile.displayName.length > 0 ? profile.displayName : id,
      api: typeof profile.api === "string" ? profile.api : "",
      models,
    })
  }
  return providers
}

/**
 * The **complete** `models` array of one provider, exactly as stored.
 *
 * Saving needs this rather than the page rows: {@link providerEntries} skips
 * entries it cannot render (a malformed row, a missing id), and rebuilding the
 * array from rows alone would silently drop them. Every entry is returned, and
 * only the ones with a draft are rewritten.
 */
export function rawModelsArray(document: RawSettingsDocument, namespace: string, providerId: string): unknown[] | undefined {
  const user = userSection(document, namespace)
  const providers = isRecord(user.providers) ? user.providers : {}
  const profile = providers[providerId]
  return isRecord(profile) && Array.isArray(profile.models) ? [...profile.models] : undefined
}

/** A stable key for one model row. */
export function modelKey(providerId: string, modelId: string): string {
  return `${providerId}\u0000${modelId}`
}

/** Interchange format identifier; a mismatched document is refused on import. */
export const EXPORT_FORMAT = "dsh-thinking-levels/v1"

/** One model's exported configuration, in exactly the shape `settings.yaml` takes. */
export interface ExportedModel {
  reasoningEfforts?: unknown
  input?: readonly string[]
}

/** The whole exported document. */
export interface ExportedDocument {
  format: string
  providers: Record<string, Record<string, ExportedModel>>
}

/**
 * Build the export document from the **drafts**, so what is exported is what
 * the page currently shows — including edits that have not been saved yet.
 */
export function buildExport(
  providers: readonly ProviderEntry[],
  editOf: (key: string) => ModelEdit,
  levels: readonly string[],
): ExportedDocument {
  const out: ExportedDocument = { format: EXPORT_FORMAT, providers: {} }
  for (const provider of providers) {
    const models: Record<string, ExportedModel> = {}
    for (const model of provider.models) {
      const applied = applyEdit(model.raw, editOf(modelKey(provider.id, model.id)), levels)
      const entry: ExportedModel = {}
      if (Object.prototype.hasOwnProperty.call(applied, "reasoningEfforts")) entry.reasoningEfforts = applied.reasoningEfforts
      if (Object.prototype.hasOwnProperty.call(applied, "input")) entry.input = applied.input as readonly string[]
      models[model.id] = entry
    }
    out.providers[provider.id] = models
  }
  return out
}

/** Outcome of parsing an imported document. */
export type ImportOutcome =
  | { ok: true; edits: Map<string, ModelEdit> }
  | { ok: false; code: string; params?: Record<string, unknown> }

/**
 * Parse an exported document back into drafts. Import never writes: it
 * produces drafts for review, so a mistyped file cannot reach `settings.yaml`
 * unreviewed.
 */
export function parseImport(text: string, levels: readonly string[]): ImportOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, code: "error.importJson" }
  }
  if (!isRecord(parsed)) return { ok: false, code: "error.importShape" }
  if (parsed.format !== EXPORT_FORMAT) return { ok: false, code: "error.importFormat", params: { format: EXPORT_FORMAT } }
  if (!isRecord(parsed.providers)) return { ok: false, code: "error.importShape" }
  const edits = new Map<string, ModelEdit>()
  for (const [providerId, models] of Object.entries(parsed.providers)) {
    if (!isRecord(models)) return { ok: false, code: "error.importShape" }
    for (const [modelId, entry] of Object.entries(models)) {
      if (!isRecord(entry)) return { ok: false, code: "error.importShape" }
      const edit = editFromModel(entry, levels)
      const failure = validateEdit(edit, levels)
      if (failure !== undefined) {
        return { ok: false, code: failure.code, params: { provider: providerId, model: modelId, ...failure.params } }
      }
      edits.set(modelKey(providerId, modelId), edit)
    }
  }
  if (edits.size === 0) return { ok: false, code: "error.importEmpty" }
  return { ok: true, edits }
}
