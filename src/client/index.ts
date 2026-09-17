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
import * as React from "react"
import { SettingsCallError, levelVocabularyFromSchema, resolveSettingsWire } from "./settings-wire"
import type { RawSettingsDocument, SettingsWire } from "./settings-wire"
import { DICTIONARIES, LOCALE_NS, fallbackTranslate } from "./locale"
import type { Translate } from "./locale"
import {
  IconCollapseAll,
  IconDiscard,
  IconDownload,
  IconExpandAll,
  IconSave,
  IconSearch,
  IconUpload,
} from "./icons"
import { OverflowMenu } from "./menu"

/**
 * Build-time version, replaced by the bundler with a string literal
 * (`__PLUGIN_VERSION__` in tsdown.config.ts). Declared here so the value is
 * type-checked, and guarded at runtime because the page must still render if
 * the bundle is ever evaluated without that replacement.
 */
declare const __PLUGIN_VERSION__: string

/** The running build's version, or undefined when the define did not apply. */
function pluginVersion(): string | undefined {
  try {
    return typeof __PLUGIN_VERSION__ === "string" ? __PLUGIN_VERSION__ : undefined
  } catch {
    return undefined
  }
}
import {
  DEFAULT_LEVELS,
  EXTRA_FILTERS,
  QUICK_FILTERS,
  NAMESPACE,
  applyEdit,
  buildExport,
  cloneJson,
  editFromModel,
  editSignature,
  isRecord,
  matchesFilter,
  modelKey,
  namespaceNames,
  parseImport,
  pickNamespace,
  providerEntries,
  rawModelsArray,
  revisionOf,
  userSection,
  validateEdit,
} from "./levels"
import type { EditError, FilterId, ModelEdit, ProviderEntry } from "./levels"
import { ProviderGroup } from "./provider-group"

/** Every edit target, addressed by `modelKey(providerId, modelId)`. */
type DraftMap = ReadonlyMap<string, ModelEdit>

/** One row's derived facts, computed once per render pass. */
interface RowInfo {
  key: string
  providerId: string
  modelId: string
  stored: ModelEdit
  edit: ModelEdit
  dirty: boolean
}

/** Page data as loaded from the wire. */
interface PageState {
  namespace: string
  writable: boolean
  revision: number | undefined
  levels: readonly string[]
  providers: ProviderEntry[]
  /** The raw document, kept so a save can rebuild the untouched parts. */
  document: RawSettingsDocument
  /** Stored configuration per row, for dirty diffing and filters. */
  stored: DraftMap
}

/** Collapse state persistence key. */
/**
 * Persisted expansion state. The `:v2` suffix is a semantics break, not a
 * cosmetic bump: v1 stored "is collapsed" for providers (which defaulted to
 * open), v2 stores "is opened" for both levels (providers now default to
 * collapsed, like rows). Reusing the v1 key would read old `false` — written
 * when "false" meant collapsed — as "not opened", and resurrect stale choices.
 */
const STORAGE_KEY = "dsh-thinking-levels-settings:collapsed:v2"

interface CollapseState {
  providers: Record<string, boolean>
  models: Record<string, boolean>
}

/** Shared empty collapse state; never mutated, only replaced. */
const EMPTY_COLLAPSE: CollapseState = { providers: {}, models: {} }

function readCollapse(): CollapseState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { providers: {}, models: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return { providers: {}, models: {} }
    return {
      providers: isRecord(parsed.providers) ? (parsed.providers as Record<string, boolean>) : {},
      models: isRecord(parsed.models) ? (parsed.models as Record<string, boolean>) : {},
    }
  } catch {
    // Storage can be unavailable or hold stale data; defaults are always safe.
    return { providers: {}, models: {} }
  }
}

function writeCollapse(state: CollapseState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* collapsing still works for the session; only persistence is lost */
  }
}

interface SectionProps {
  /** Runtime-probed settings channel, resolved once per plugin activation. */
  wire: SettingsWire
  /** Subscribe to pushed settings changes; returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void
  /** Runtime-probed translate function; falls back to the bundled Chinese copy. */
  t: Translate
}

/** The Settings page body registered into the `settings.section` slot. */
export function ThinkingLevelsSection({ wire, subscribe, t }: SectionProps): React.ReactElement {
  const [state, setState] = React.useState<PageState | null>(null)
  const [drafts, setDrafts] = React.useState<DraftMap>(() => new Map())
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<FilterId>("all")
  const [collapsed, setCollapsed] = React.useState<CollapseState>(readCollapse)
  /**
   * Manual collapse overrides for the current search/filter session, layered
   * *above* the automatic "show me the matches" expansion. Values are the
   * effective ones (provider `true` = open, model `true` = expanded), not
   * inverted, so a row the user collapsed while filtering stays collapsed
   * instead of being yanked back open on the next render. Cleared whenever the
   * search text or filter changes, so a new query starts fresh.
   */
  const [manual, setManual] = React.useState<CollapseState>(() => EMPTY_COLLAPSE)
  const [notice, setNotice] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [importText, setImportText] = React.useState("")
  const [exported, setExported] = React.useState<string | null>(null)

  const load = React.useCallback(async (silent = false) => {
    if (!silent) {
      setStatus("loading")
      setError(null)
    }
    try {
      const document = await wire.describe()
      const namespace = pickNamespace(document, (ns) => levelVocabularyFromSchema(document, ns))
      if (namespace === undefined) {
        throw new Error(t("page.error.namespace", { expected: NAMESPACE, seen: namespaceNames(document).join("、") || "无" }))
      }
      const levels = levelVocabularyFromSchema(document, namespace) ?? [...DEFAULT_LEVELS]
      const providers = providerEntries(document, namespace, levels)
      const stored = new Map<string, ModelEdit>()
      for (const provider of providers) {
        for (const model of provider.models) stored.set(modelKey(provider.id, model.id), model.stored)
      }
      setState({
        namespace,
        writable: document.writable === true,
        revision: revisionOf(document, namespace),
        levels,
        providers,
        document,
        stored,
      })
      setDrafts(new Map())
      setStatus("ready")
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      setError(detail + t("page.error.channel", { source: wire.source() ?? "?" }))
      setStatus("error")
    }
  }, [wire, t])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => subscribe(() => void load(true)), [subscribe, load])

  // A new search or filter is a new "show me these rows" request, so manual
  // collapse overrides from the previous one are dropped. Keyed on the two
  // inputs only, so the overrides survive ordinary re-renders and reloads.
  React.useEffect(() => {
    setManual(EMPTY_COLLAPSE)
  }, [query, filter])

  const rows = React.useMemo<RowInfo[]>(() => {
    if (state === null) return []
    const result: RowInfo[] = []
    for (const provider of state.providers) {
      for (const model of provider.models) {
        const key = modelKey(provider.id, model.id)
        const stored = state.stored.get(key) ?? editFromModel(model.raw, state.levels)
        const edit = drafts.get(key) ?? stored
        result.push({
          key,
          providerId: provider.id,
          modelId: model.id,
          stored,
          edit,
          dirty: editSignature(edit, state.levels) !== editSignature(stored, state.levels),
        })
      }
    }
    return result
  }, [state, drafts])

  const dirtyKeys = React.useMemo(() => new Set(rows.filter((row) => row.dirty).map((row) => row.key)), [rows])

  const editOf = React.useCallback(
    (key: string): ModelEdit => {
      const draft = drafts.get(key)
      if (draft !== undefined) return draft
      const row = rows.find((item) => item.key === key)
      return row !== undefined ? row.stored : { mode: "inherit", efforts: {}, input: undefined }
    },
    [drafts, rows],
  )

  const setEdit = React.useCallback((key: string, next: ModelEdit) => {
    setDrafts((current) => {
      const map = new Map(current)
      map.set(key, next)
      return map
    })
    setNotice(null)
  }, [])

  /**
   * Open/close one provider. Writes both layers: the durable flag in
   * `collapsed` (so the choice survives reloads) and an override in `manual`
   * (so the change is visible right now, even while a search or filter is
   * auto-opening the matching groups).
   */
  const setProviderOpen = (providerId: string, open: boolean) => {
    setCollapsed((current) => {
      const next: CollapseState = { providers: { ...current.providers }, models: current.models }
      // Both levels now persist "is opened", so one vocabulary covers the file.
      next.providers[providerId] = open
      writeCollapse(next)
      return next
    })
    setManual((current) => {
      const next: CollapseState = { providers: { ...current.providers }, models: current.models }
      next.providers[providerId] = open
      return next
    })
  }

  /**
   * Expand/collapse one model row. Same two-layer write as the provider
   * toggle; both levels persist "is opened".
   */
  const setModelOpen = (key: string, open: boolean) => {
    setCollapsed((current) => {
      const next: CollapseState = { providers: current.providers, models: { ...current.models } }
      next.models[key] = open
      writeCollapse(next)
      return next
    })
    setManual((current) => {
      const next: CollapseState = { providers: current.providers, models: { ...current.models } }
      next.models[key] = open
      return next
    })
  }

  const setAllCollapsed = (providersOpen: boolean, modelsOpen: boolean) => {
    const providers: Record<string, boolean> = {}
    const models: Record<string, boolean> = {}
    for (const provider of state?.providers ?? []) {
      providers[provider.id] = providersOpen
      for (const model of provider.models) models[modelKey(provider.id, model.id)] = modelsOpen
    }
    const next: CollapseState = { providers, models }
    writeCollapse(next)
    setCollapsed(next)
    // Mirror onto the override layer, otherwise the bulk buttons appear dead
    // whenever a search or filter is auto-opening the matching rows.
    setManual({ providers: { ...providers }, models: { ...models } })
  }

  /** Validate every draft, returning the first failure with the row it belongs to. */
  const firstFailure = (keys: readonly string[]): { key: string; failure: EditError } | undefined => {
    if (state === null) return undefined
    for (const key of keys) {
      const failure = validateEdit(editOf(key), state.levels)
      if (failure !== undefined) return { key, failure }
    }
    return undefined
  }

  /**
   * Save the dirty rows of one provider, or of every provider when
   * `providerId` is undefined. One provider is one array write, so a provider
   * can never be saved halfway.
   */
  const save = async (providerId?: string) => {
    if (state === null) return
    const targets = rows.filter((row) => row.dirty && (providerId === undefined || row.providerId === providerId))
    if (targets.length === 0) {
      setNotice({ type: "error", text: t("save.nothing") })
      return
    }
    const failure = firstFailure(targets.map((row) => row.key))
    if (failure !== undefined) {
      setNotice({ type: "error", text: failureMessage(failure.failure, t) })
      return
    }
    setBusy(true)
    setNotice(null)
    // Group by provider: each group is exactly one `models` array write.
    const byProvider = new Map<string, RowInfo[]>()
    for (const row of targets) {
      const list = byProvider.get(row.providerId)
      if (list === undefined) byProvider.set(row.providerId, [row])
      else list.push(row)
    }
    let saved = 0
    const failures: string[] = []
    let conflicted = false
    for (const [id, group] of byProvider) {
      const array = rawModelsArray(state.document, state.namespace, id)
      if (array === undefined) {
        failures.push(`${id}: ${t("save.removed")}`)
        continue
      }
      const wanted = new Map(group.map((row) => [row.modelId, row]))
      const models = array.map((entry) => {
        if (!isRecord(entry) || typeof entry.id !== "string") return cloneJson(entry)
        const row = wanted.get(entry.id)
        return row === undefined ? cloneJson(entry) : applyEdit(entry, row.edit, state.levels)
      })
      try {
        await wire.mutate(state.namespace, [{ op: "set", path: ["providers", id, "models"], value: models }], state.revision)
        saved += group.length
      } catch (cause) {
        if (cause instanceof SettingsCallError && cause.conflict) {
          conflicted = true
          failures.push(`${id}: ${t("save.conflict")}`)
        } else {
          failures.push(`${id}: ${cause instanceof Error ? cause.message : String(cause)}`)
        }
      }
    }
    setBusy(false)
    if (conflicted) {
      await load(true)
      setNotice({ type: "error", text: t("save.conflict") })
      return
    }
    if (failures.length === 0) {
      setNotice({ type: "success", text: t("save.saved") })
      await load(true)
      return
    }
    setNotice({
      type: "error",
      text: saved > 0
        ? t("save.partial", { done: saved, failed: failures.length, detail: failures.join("; ") })
        : failures.join("; "),
    })
    await load(true)
  }

  const exportJson = () => {
    if (state === null) return
    const document = buildExport(state.providers, editOf, state.levels)
    setExported(JSON.stringify(document, null, 2))
    setNotice({ type: "success", text: t("export.done") })
  }

  const copyExport = async () => {
    if (exported === null) return
    try {
      await navigator.clipboard.writeText(exported)
      setNotice({ type: "success", text: t("export.copied") })
    } catch {
      setNotice({ type: "error", text: t("export.copyFailed") })
    }
  }

  const applyImport = () => {
    if (state === null) return
    const outcome = parseImport(importText, state.levels)
    if (!outcome.ok) {
      setNotice({ type: "error", text: t(outcome.code, outcome.params) })
      return
    }
    // Import only fills drafts for models that exist here: writing a file's
    // idea of the model list into settings.yaml is what a stray export must
    // never be able to do. The matching happens before the state update so the
    // report reflects exactly what was applied, however React schedules it.
    const known = new Set(rows.map((row) => row.key))
    const matched = [...outcome.edits].filter(([key]) => known.has(key))
    setDrafts((current) => {
      const map = new Map(current)
      for (const [key, edit] of matched) map.set(key, edit)
      return map
    })
    setImportOpen(false)
    setImportText("")
    if (matched.length === 0) setNotice({ type: "error", text: t("import.noneMatched") })
    else setNotice({ type: "success", text: t("import.applied", { count: matched.length }) })
  }

  if (status === "loading") {
    return React.createElement("p", { className: "tl-muted" }, t("page.loading"))
  }
  if (status === "error") {
    return React.createElement("div", { className: "tl-page" },
      React.createElement("p", { className: "tl-error" }, error),
      React.createElement("button", { type: "button", className: "tl-primary", onClick: () => void load() }, t("page.retry")))
  }
  if (state === null) return React.createElement(React.Fragment, null)

  const normalized = query.trim().toLowerCase()
  const searching = normalized.length > 0
  const visible = rows.filter((row) => {
    const provider = state.providers.find((item) => item.id === row.providerId)
    const model = provider?.models.find((item) => item.id === row.modelId)
    const matches = !searching ||
      row.modelId.toLowerCase().includes(normalized) ||
      row.providerId.toLowerCase().includes(normalized) ||
      (model !== undefined && model.name.toLowerCase().includes(normalized))
    return matches && matchesFilter(filter, { stored: row.stored, edit: row.edit, dirty: row.dirty })
  })
  const dirtyCount = dirtyKeys.size

  // A filter chosen from the 更多 menu is invisible on the chip row, so the
  // trigger carries its name: the current view stays readable without opening
  // the menu to check what is applied.
  const extraFilterActive = (EXTRA_FILTERS as readonly string[]).includes(filter)
  const moreLabel = extraFilterActive ? t("toolbar.moreWith", { name: t(`filter.${filter}`) }) : t("toolbar.more")

  const toolbar = React.createElement("div", { className: "tl-toolbar" },
    // Row 1 holds the two ways to narrow the list — free text, and the filters
    // that do not earn a chip — with drafts first when they exist.
    React.createElement("div", { className: "tl-toolbar-row" },
      React.createElement("span", { className: "tl-search-wrap" },
        React.createElement(IconSearch, { size: 14 }),
        React.createElement("input", {
          className: "tl-search",
          type: "search",
          value: query,
          placeholder: t("toolbar.search"),
          "aria-label": t("toolbar.search"),
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
        }),
      ),
      React.createElement("span", { className: "tl-toolbar-actions" },
        // 保存/放弃修改 only exist while drafts do: with nothing pending they
        // are two dead buttons in the primary position, which both wastes the
        // space and dilutes the signal that there *is* something to save.
        dirtyCount > 0
          ? React.createElement("span", { className: "tl-actions-pending" },
              React.createElement("button", {
                type: "button",
                className: "tl-primary",
                disabled: busy || !state.writable,
                onClick: () => void save(),
              }, React.createElement(IconSave, { size: 14 }),
                React.createElement("span", null, busy ? t("toolbar.saving") : t("toolbar.saveAll", { count: dirtyCount }))),
              React.createElement("button", {
                type: "button",
                className: "tl-secondary",
                disabled: busy || !state.writable,
                onClick: () => { setDrafts(new Map()); setNotice(null) },
              }, React.createElement(IconDiscard, { size: 14 }), React.createElement("span", null, t("toolbar.discard"))),
              React.createElement("span", { className: "tl-sep", "aria-hidden": "true" }),
            )
          : null,
        // One menu holds the less-reached-for filters and the JSON transfer.
        // It is named 更多 rather than for either half: a name like 「高级筛选」
        // would hide where import/export lives.
        React.createElement(OverflowMenu, {
          label: moreLabel,
          triggerIcon: null,
          active: extraFilterActive,
          items: [
            ...EXTRA_FILTERS.map((id) => ({
              key: `filter-${id}`,
              label: t(`filter.${id}`),
              selected: filter === id,
              onSelect: () => setFilter(id),
            })),
            {
              key: "export",
              label: t("toolbar.export"),
              icon: React.createElement(IconDownload, { size: 14 }),
              separatorBefore: true,
              onSelect: exportJson,
            },
            {
              key: "import",
              label: t("toolbar.import"),
              icon: React.createElement(IconUpload, { size: 14 }),
              onSelect: () => { setImportOpen(true); setExported(null) },
            },
          ],
        }),
      ),
    ),
    // Row 2 pairs the quick filters with the list-wide toggles: both act on the
    // list as a whole, so they read as one strip under the search field.
    React.createElement("div", { className: "tl-toolbar-row tl-toolbar-row-end" },
      React.createElement("span", { className: "tl-chips" },
        ...QUICK_FILTERS.map((id) =>
          React.createElement("button", {
            key: id,
            type: "button",
            className: filter === id ? "tl-chip tl-chip-active" : "tl-chip",
            "aria-pressed": filter === id,
            onClick: () => setFilter(id),
          }, t(`filter.${id}`))),
      ),
      React.createElement("span", { className: "tl-toolbar-end" },
        React.createElement("button", { type: "button", className: "tl-secondary", onClick: () => setAllCollapsed(true, false) },
          React.createElement(IconExpandAll, { size: 14 }), React.createElement("span", null, t("toolbar.expandAll"))),
        React.createElement("button", { type: "button", className: "tl-secondary", onClick: () => setAllCollapsed(false, false) },
          React.createElement(IconCollapseAll, { size: 14 }), React.createElement("span", null, t("toolbar.collapseAll"))),
      ),
    ),
    // Rendered only while drafts are pending, so it costs no space at rest. It
    // is a live region so the count is announced when drafts appear, not merely
    // painted: the save button's own count is not announced as a change.
    dirtyCount > 0
      ? React.createElement("p", { className: "tl-dirty-note", role: "status", "aria-live": "polite" }, t("toolbar.dirtyCount", { count: dirtyCount }))
      : null,
  )

  // Search and filtering *narrow the list*. They open the groups that hold
  // matches, so matching rows are visible without a click each, but they
  // deliberately do NOT expand the model editors: unfolding every match's form
  // buried the very list the filter was meant to shorten. A manual click still
  // wins over both (see `manual`).
  const narrowing = searching || filter !== "all"
  const visibleProviders = new Set(visible.map((row) => row.providerId))

  /** Effective expansion of one group: manual override, else auto, else stored. */
  const isProviderOpen = (providerId: string): boolean => {
    const override = manual.providers[providerId]
    if (override !== undefined) return override
    // Groups, like rows, start collapsed: a freshly opened page lists what
    // exists, and nothing is unfolded until asked for.
    return narrowing ? true : collapsed.providers[providerId] === true
  }

  /**
   * Effective expansion of one model row. Narrowing never expands a row: the
   * row already states its configuration on its single line, and opening its
   * editor is a deliberate click.
   */
  const isModelOpen = (key: string): boolean => {
    const override = manual.models[key]
    if (override !== undefined) return override
    return collapsed.models[key] === true
  }

  const body = state.providers.length === 0
    ? React.createElement("p", { className: "tl-muted" }, t("page.empty"))
    : visible.length === 0
      ? React.createElement("p", { className: "tl-muted" }, t("filter.all") + " · 0")
      : React.createElement(React.Fragment, null,
          ...state.providers
            .filter((provider) => visibleProviders.has(provider.id))
            .map((provider) => React.createElement(ProviderGroup, {
              key: provider.id,
              provider,
              levels: state.levels,
              visibleModelIds: new Set(
                visible.filter((row) => row.providerId === provider.id).map((row) => row.modelId),
              ),
              open: isProviderOpen(provider.id),
              onToggleProvider: () => setProviderOpen(provider.id, !isProviderOpen(provider.id)),
              openModels: new Set(
                visible
                  .filter((row) => row.providerId === provider.id)
                  .map((row) => row.key)
                  .filter(isModelOpen),
              ),
              onToggleModel: (key: string) => setModelOpen(key, !isModelOpen(key)),
              editOf,
              onChange: setEdit,
              dirtyKeys,
              disabled: busy || !state.writable,
              t,
            })),
        )

  return React.createElement("div", { className: "tl-page" },
    React.createElement("header", { className: "tl-intro" },
      React.createElement("h2", { className: "tl-title" }, t("page.title")),
      React.createElement("p", { className: "tl-muted" }, t("page.intro")),
      React.createElement("ul", { className: "tl-help" },
        React.createElement("li", null, t("page.help.edit")),
        React.createElement("li", null, t("page.help.use")),
        React.createElement("li", null, t("page.help.wire")),
      ),
    ),
    !state.writable ? React.createElement("p", { className: "tl-note" }, t("page.readonly")) : null,
    toolbar,
    notice !== null ? React.createElement("p", { className: notice.type === "success" ? "tl-success" : "tl-error" }, notice.text) : null,
    importOpen
      ? React.createElement("div", { className: "tl-import" },
          React.createElement("textarea", {
            className: "tl-import-text",
            value: importText,
            placeholder: t("toolbar.importPlaceholder"),
            "aria-label": t("toolbar.importPlaceholder"),
            onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setImportText(event.target.value),
          }),
          React.createElement("div", { className: "tl-toolbar-row" },
            React.createElement("button", { type: "button", className: "tl-primary", onClick: applyImport }, t("toolbar.importApply")),
            React.createElement("button", { type: "button", className: "tl-secondary", onClick: () => { setImportOpen(false); setImportText("") } }, t("toolbar.importCancel")),
          ),
        )
      : null,
    exported !== null
      ? React.createElement("div", { className: "tl-import" },
          React.createElement("textarea", { className: "tl-import-text", value: exported, readOnly: true, "aria-label": t("toolbar.export") }),
          React.createElement("div", { className: "tl-toolbar-row" },
            React.createElement("button", { type: "button", className: "tl-secondary", onClick: () => void copyExport() }, t("export.copy")),
            React.createElement("button", { type: "button", className: "tl-secondary", onClick: () => setExported(null) }, t("toolbar.importCancel")),
          ),
        )
      : null,
    body,
    React.createElement("footer", { className: "tl-footer" },
      React.createElement("span", { className: "tl-version" }, t("page.version", { version: pluginVersion() ?? "dev" })),
      React.createElement("span", { className: "tl-build" },
        t("page.build", { count: state.providers.length, levels: state.levels.length }),
      ),
    ),
  )
}

/** Render a validation failure in the active language. */
function failureMessage(failure: EditError, t: Translate): string {
  return t(failure.code, failure.params)
}

const CSS = `
.tl-page { display: flex; flex-direction: column; gap: 20px; min-width: 0; padding: 4px 0 32px; color: var(--dsw-alias-label-primary); }
.tl-intro { display: flex; flex-direction: column; gap: 6px; }
.tl-title { margin: 0; font-size: 20px; line-height: 1.3; font-weight: 600; letter-spacing: 0; }
.tl-muted, .tl-help, .tl-note, .tl-model-id, .tl-summary, .tl-provider-meta, .tl-provider-counts, .tl-mode-help, .tl-unavailable, .tl-level-hint, .tl-dirty-note, .tl-preview-body { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.5; }
.tl-muted { margin: 0; }
/* The three usage notes read as one small line rather than a block that pushes
   the real content down. */
.tl-help { display: flex; flex-wrap: wrap; gap: 2px 10px; margin: 0; padding: 0; list-style: none; font-size: 12px; line-height: 1.5; }
.tl-help > li + li::before { content: "\u00B7"; margin-right: 10px; }
.tl-note { margin: 0; }
.tl-dirty-note { margin: 0; }
/* The controls are grouped in their own surface so they stop competing with
   the list below them. */
/* Two rows: "what am I looking at" (search + chips) and "what do I do with it"
   (save / view / transfer). The chips moved up beside the search box, which
   removed a whole row of vertical space. */
.tl-toolbar { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.tl-toolbar-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
/* The row's own controls disappear under the chip row's width, so it keeps
   wrapping to a new line rather than squashing the search field. */
.tl-search-wrap { position: relative; display: flex; align-items: center; flex: 1 1 220px; min-width: 0; color: var(--dsw-alias-label-secondary); }
.tl-search-wrap > svg { position: absolute; left: 9px; pointer-events: none; }
.tl-search { width: 100%; min-width: 0; box-sizing: border-box; min-height: 32px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 6px 10px 6px 29px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 18px; }
.tl-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
/* The action cluster sits right of the search field, which takes the slack. */
.tl-toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-left: auto; }
/* Row 2 pairs the quick filters with the list-wide toggles, so the toggles sit
   at the right end of the same strip. */
.tl-toolbar-end { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-left: auto; }
/* The trigger carries the name of a filter chosen inside it, so an applied
   filter stays visible without opening the menu. */
.tl-more-active { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.tl-sep { flex: none; width: 1px; height: 18px; margin: 0 2px; background: var(--dsw-alias-border-l1); }
/* Appears only while drafts are pending, so the primary action is never a dead
   button. Keeps its own inline group so the separator travels with it. */
.tl-actions-pending { display: inline-flex; gap: 8px; align-items: center; }
/* The overflow menu: infrequent actions, one click away, out of the way. */
.tl-more { position: relative; display: inline-flex; }
.tl-more-trigger[aria-expanded='true'] { background: var(--dsw-alias-bg-layer-2); }
.tl-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 20; display: flex; flex-direction: column; min-width: 168px; padding: 4px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); box-shadow: 0 6px 20px rgb(0 0 0 / 14%); }
.tl-menu-item { display: flex; gap: 8px; align-items: center; width: 100%; box-sizing: border-box; min-height: 30px; border: 0; border-radius: 6px; padding: 5px 9px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 16px; text-align: left; cursor: pointer; }
.tl-menu-item:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.tl-menu-item:disabled { cursor: not-allowed; opacity: 0.5; }
.tl-menu-item > svg { flex: none; opacity: 0.85; }
/* A choice entry leads with its label and shows the tick at the end. */
.tl-menu-item-choice .tl-menu-label { flex: 1 1 auto; }
.tl-menu-check { display: inline-flex; flex: none; width: 14px; justify-content: flex-end; color: var(--dsw-alias-brand-primary); opacity: 0; }
.tl-menu-item-selected .tl-menu-check { opacity: 1; }
/* A divider groups the filters above from the JSON transfer below. */
.tl-menu-item-sep { margin-top: 5px; border-top: 1px solid var(--dsw-alias-border-l1); border-radius: 0 0 6px 6px; padding-top: 8px; }
.tl-menu-item:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.tl-secondary, .tl-primary, .tl-chip { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 30px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 5px 10px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 16px; cursor: pointer; }
.tl-secondary > svg, .tl-primary > svg { flex: none; opacity: 0.85; }
.tl-primary { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }
.tl-chip { min-height: 26px; padding: 3px 10px; border-radius: 13px; color: var(--dsw-alias-label-secondary); }
.tl-chip-active { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-label-primary); font-weight: 600; }
.tl-secondary:hover:not(:disabled), .tl-chip:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.tl-secondary:disabled, .tl-primary:disabled, .tl-chip:disabled { cursor: not-allowed; opacity: 0.5; }
.tl-secondary:focus-visible, .tl-primary:focus-visible, .tl-chip:focus-visible, .tl-wire:focus-visible, .tl-search:focus-visible, .tl-import-text:focus-visible, .tl-toggle:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.tl-import { display: flex; flex-direction: column; gap: 8px; }
.tl-import-text { width: 100%; min-height: 150px; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; resize: vertical; }
/* A provider is a section of the page, so it gets a rule and real space above
   it rather than just another line of text. */
.tl-provider { display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 16px 0 0; border: 0; border-top: 1px solid var(--dsw-alias-border-l1); background: transparent; }
.tl-provider:first-child { padding-top: 0; border-top: 0; }
.tl-provider-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0; }
.tl-toggle { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 24px; height: 24px; border: 1px solid transparent; border-radius: 5px; padding: 0; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.tl-toggle:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.tl-chevron { display: inline-flex; align-items: center; transition: transform 120ms ease; }
.tl-chevron-open { transform: rotate(90deg); }
.tl-provider-name { font-size: 14px; font-weight: 600; }
/* The id/api trail and the counter are supporting detail: pushed right and
   lightened so the provider name is what the eye lands on. */
.tl-provider-meta, .tl-provider-counts { font-weight: 400; font-size: 12px; }
.tl-provider-counts { margin-left: auto; border: 1px solid var(--dsw-alias-border-l2); border-radius: 11px; padding: 2px 9px; white-space: nowrap; }
.tl-models { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
/* Collapsed rows are single flat lines, not cards: a dozen models then fit on
   one screen. Only the expanded row grows into a bordered surface, which is
   also what makes "which one am I editing" obvious at a glance. */
.tl-model { display: flex; flex-direction: column; gap: 0; min-width: 0; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent; }
.tl-model:hover { background: var(--dsw-alias-bg-layer-2); }
.tl-model-open { gap: 12px; padding: 11px 13px; border-color: var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.tl-model-open:hover { background: var(--dsw-alias-bg-layer-1); }
.tl-model-head { display: flex; gap: 8px; align-items: center; min-width: 0; min-height: 34px; padding: 0 8px 0 4px; }
.tl-model-open .tl-model-head { min-height: 0; padding: 0; }
.tl-model-title { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; min-width: 0; flex: 0 1 auto; }
.tl-model-name { font-size: 13px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.tl-model-id { overflow-wrap: anywhere; }
/* Pushes the badges to the right edge and lets the state text truncate before
   the badges do. */
.tl-badges { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-left: auto; }
.tl-badge { display: inline-flex; align-items: center; gap: 3px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 1px 5px; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 15px; white-space: nowrap; }
.tl-badge > svg { flex: none; }
.tl-badge-modality { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-label-primary); }
.tl-badge-muted { opacity: 0.75; }
.tl-badge-dirty { border-color: transparent; color: var(--dsw-alias-brand-primary); padding: 0 1px; }
.tl-summary { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-model-open .tl-summary { display: none; }
.tl-model-body { display: flex; flex-direction: column; gap: 10px; }
/* The editor is a stack of titled cards. Previously it was one continuous
   column, which is what read as a wall of text. */
.tl-form { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.tl-section { display: flex; flex-direction: column; gap: 10px; padding: 11px 13px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); }
.tl-section-head { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; }
.tl-section-title { display: flex; gap: 6px; align-items: center; margin: 0; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; line-height: 1.4; letter-spacing: 0; }
.tl-section-title > svg { flex: none; color: var(--dsw-alias-label-secondary); }
.tl-modes { display: flex; flex-direction: column; gap: 10px; }
.tl-mode { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 10px; align-items: start; font-size: 13px; cursor: pointer; }
.tl-mode input[type='radio'] { width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--dsw-alias-brand-primary); }
.tl-mode-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tl-mode-label { line-height: 1.4; }
.tl-mode:has(input:checked) .tl-mode-label { font-weight: 600; }
/* Unselected modes recede so the active one carries the weight. */
.tl-mode:not(:has(input:checked)) .tl-mode-help { opacity: 0.8; }
.tl-levels-block { display: flex; flex-direction: column; gap: 6px; }
/* One track definition shared by the header and every level row, so the titles
   sit over the columns they name. The checkbox column is sized to the box. */
.tl-levels-head, .tl-level { display: grid; grid-template-columns: 16px 92px minmax(0, 1fr); gap: 10px; align-items: center; }
.tl-levels-head { padding: 0 10px; color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.tl-presets { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-weight: 400; }
.tl-presets-label { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.tl-levels { display: flex; flex-direction: column; gap: 2px; }
/* Rows are separated by a hairline instead of a gap alone, so the eye can
   track a label across to its wire value. */
.tl-level { min-height: 30px; padding: 0 8px; border-radius: 6px; font-size: 13px; }
.tl-level + .tl-level { border-top: 1px solid var(--dsw-alias-border-l1); border-top-left-radius: 0; border-top-right-radius: 0; }
.tl-level:hover { background: var(--dsw-alias-bg-base); }
.tl-level-on { background: var(--dsw-alias-bg-base); }
.tl-level input[type='checkbox'] { width: 16px; height: 16px; margin: 0; accent-color: var(--dsw-alias-brand-primary); }
.tl-label { color: var(--dsw-alias-label-secondary); }
.tl-level-on .tl-label { color: var(--dsw-alias-label-primary); font-weight: 600; }
.tl-wire { width: 100%; min-width: 0; box-sizing: border-box; min-height: 30px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 5px 9px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 16px; }
.tl-level-hint { grid-column: 3; padding-bottom: 6px; font-size: 12px; }
.tl-modalities { display: flex; flex-wrap: wrap; gap: 14px; }
.tl-modality { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; cursor: pointer; }
.tl-modality input[type='checkbox'] { width: 16px; height: 16px; margin: 0; accent-color: var(--dsw-alias-brand-primary); }
.tl-preview { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); }
.tl-preview-title { font-size: 12px; font-weight: 600; }
/* Identifies which build is actually loaded — the question "did my install
   take effect?" is otherwise unanswerable from inside the page. */
.tl-footer { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.5; }
.tl-version { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.tl-build { opacity: 0.85; }
.tl-preview-body { display: flex; flex-direction: column; gap: 2px; }
.tl-success, .tl-error { margin: 0; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.tl-success { color: var(--dsw-alias-state-success-primary); }
.tl-error { color: var(--dsw-alias-state-error-primary); }
@media (max-width: 560px) {
  .tl-model { padding: 10px; }
  /* No room for a three-column table: the header goes away and each row stacks
     its label above its wire input. */
  .tl-levels-head { display: none; }
  .tl-level { grid-template-columns: 16px minmax(0, 1fr); }
  .tl-wire, .tl-unavailable, .tl-level-hint { grid-column: 2; }
}
`

/**
 * Client plugin apply: register the settings.section contribution, cleaned up
 * on fiber unload.
 */
export function apply(ctx: any): void {
  // One runtime-probed channel shared by every mount of this section; holders
  // are re-read on each call, so a service that arrives after activation is
  // still found.
  const wire = resolveSettingsWire([ctx])

  // Mounted-body invalidation. The subscriber set and the disposer sink live at
  // apply scope — not inside the effect below — because the locale dictionary can
  // become readable both before and after the slot mounts, and both paths must
  // reach the same listeners.
  const listeners = new Set<() => void>()
  const notify = (): void => {
    for (const listener of [...listeners]) listener()
  }
  const disposers: Array<() => void> = []
  const keep = (value: unknown): void => {
    if (typeof value === "function") disposers.push(value as () => void)
  }

  // Locale is probed, never required: the platform translator is preferred so
  // the page follows the language preference, and the bundled Chinese copy is
  // the fallback so a DSH without the locale service still renders readable
  // text instead of raw keys.
  const localeHolder = (): any => {
    try {
      const service: unknown = typeof ctx.get === "function" ? ctx.get("locale") : undefined
      return isRecord(service) || typeof service === "object" ? service : undefined
    } catch {
      return undefined
    }
  }
  /** The platform translator for this namespace, unvalidated. */
  const platformCopy = (): Translate | undefined => {
    const service = localeHolder()
    if (service === undefined || typeof service.bind !== "function") return undefined
    try {
      return (service.bind as (ns: string) => Translate)(LOCALE_NS)
    } catch {
      return undefined
    }
  }
  /**
   * The platform translator, but only once this namespace is actually readable.
   * The locale service answers a missing dictionary with the raw key, so
   * translating one known key is the only reliable readiness test; it also comes
   * out true when an identical copy of this page (a re-activation, or the old
   * bundle still resident) owns the registration instead of this instance.
   */
  const READINESS_KEY = "section.label"
  const readyTranslator = (): Translate | undefined => {
    const fn = platformCopy()
    if (fn === undefined) return undefined
    try {
      return fn(READINESS_KEY) === READINESS_KEY ? undefined : fn
    } catch {
      return undefined
    }
  }

  // Registration is retried, never a one-shot probe. The locale plugin injects
  // `["slots","remote","settingsScope"]` and this page only needs `slots`, so the
  // service legitimately appears *after* this plugin activates; an apply-time
  // probe that gave up is exactly what left the page rendering raw keys such as
  // `page.title` and `filter.all` instead of text. `registered` therefore only
  // records that the attempt happened.
  let registered = false
  let subscribed = false
  let announced = false
  let pending = false
  const ensureLocale = (): void => {
    const service = localeHolder()
    if (service === undefined) return
    if (!registered && typeof service.register === "function") {
      // One attempt only: `register` throws on a duplicate namespace+locale,
      // which means a byte-equal copy of this dictionary already owns the
      // namespace, so retrying could never succeed.
      registered = true
      try {
        keep((service.register as (ns: string, dicts: unknown) => unknown)(LOCALE_NS, DICTIONARIES))
      } catch {
        /* a sibling copy of this page owns the namespace; same dictionary either way */
      }
    }
    if (registered && !subscribed) {
      subscribed = true
      try {
        // Locale switches and dictionary registrations both bump the revision,
        // so one snapshot subscription covers every language change. The service
        // deliberately keeps dictionary registrations off `locale/change`, hence
        // the snapshot subscription rather than an event.
        if (typeof service.subscribe === "function") {
          keep((service.subscribe as (fn: () => void) => unknown)(notify))
        } else if (typeof ctx.on === "function") {
          keep(ctx.on("locale/change", notify))
        }
      } catch {
        /* no live language refresh; a reopen still picks the new language */
      }
    }
    // A dictionary that just became readable must repaint what is already
    // mounted: the bundled fallback cannot know which language the host resolved
    // to, so mounted text would otherwise stay Chinese until the next remount.
    if (!announced && readyTranslator() !== undefined) {
      announced = true
      notify()
    }
  }
  const translate = (key: string, params?: Record<string, unknown>): string => {
    const platform = readyTranslator()
    if (platform !== undefined) {
      try {
        return platform(key, params)
      } catch {
        /* an incompatible service must not take the page down */
      }
    }
    if (!registered && !pending) {
      // Deferred, never inline: `register` publishes a revision and notifies
      // subscribers, which must not happen while React renders. One queued
      // attempt at a time keeps this bounded — a host without the locale service
      // costs a single microtask per render, and the service-arrival event or the
      // next mount normally gets there first.
      pending = true
      queueMicrotask(() => {
        pending = false
        ensureLocale()
      })
    }
    return fallbackTranslate(key, params)
  }

  // The service-arrival listener is registered first, in its own effect so its
  // lifetime is the plugin's rather than the slot effect's (which may re-run):
  // the locale plugin resolves later than this page, and `internal/service` is
  // the only signal that a service this plugin never declared has appeared.
  // `global` because the provider sits on a sibling fiber, not under ours.
  ctx.effect(() => {
    if (typeof ctx.on !== "function") return
    try {
      const off = ctx.on("internal/service", (name: unknown) => {
        if (name === "locale") ensureLocale()
      }, { global: true })
      return () => {
        try {
          ;(off as () => void)()
        } catch {
          /* a stale disposer is harmless */
        }
      }
    } catch {
      /* without the signal, the deferred retry in translate() still recovers */
    }
  }, "thinking-levels: locale service arrival")

  ctx.effect(() => {
    const style = document.createElement("style")
    style.dataset.plugin = "dsh-thinking-levels-settings"
    style.textContent = CSS
    document.head.appendChild(style)

    // Pick up a service that is already up (the common case) before the first
    // render reads a label.
    ensureLocale()

    // Pushed refresh: prefer the Remote event bus, fall back to the local
    // event bus; both are optional enhancements, never requirements.
    try {
      const remote: unknown = typeof ctx.get === "function" ? ctx.get("remote") : undefined
      if (isRecord(remote) && typeof remote.$on === "function") {
        keep((remote.$on as (event: string, listener: () => void) => unknown)("settings/document-updated", notify))
      }
    } catch {
      /* no pushed invalidation — the page still reloads on open and on retry */
    }
    try {
      if (typeof ctx.on === "function") keep(ctx.on("connection/reset", notify))
    } catch {
      /* same */
    }

    const subscribe = (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }

    const disposeSlot = ctx.slots.inject("settings.section", () =>
      ctx.slots.register(
        {
          name: "settings.section",
          id: "thinking-levels",
          order: 11,
          // A function, not a string: the settings shell re-reads slot labels
          // whenever the locale revision changes (resolveSlotLabel), so the tab
          // text follows the active language without re-registering.
          label: () => translate("section.label"),
        },
        () => React.createElement(ThinkingLevelsSection, { wire, subscribe, t: translate }),
      ),
    )
    return () => {
      disposeSlot()
      for (const dispose of disposers.reverse()) {
        try {
          dispose()
        } catch {
          /* a stale disposer is harmless */
        }
      }
      disposers.length = 0
      listeners.clear()
      announced = false
      style.remove()
    }
  }, "thinking-levels: settings section")
}

/** Hard service dependency: without the slot system there is nothing to register. Everything else is probed. */
export const inject = ["slots"]
