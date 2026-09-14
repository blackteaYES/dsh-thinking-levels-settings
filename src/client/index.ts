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
import * as React from "react"
import { resolveSettingsWire, levelVocabularyFromSchema, SettingsCallError } from "./settings-wire"
import type { RawNamespace, RawSettingsDocument, SettingsWire } from "./settings-wire"

/** Settings namespace owning the custom providers. A rename is survived by the {@link pickNamespace} shape scan. */
const NAMESPACE = "llm-pi-ai"

/** Level vocabulary used when the settings schema does not carry a discoverable one. */
const DEFAULT_LEVELS: readonly string[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"]

/** Display spellings for the known levels; anything future-facing falls back to a capitalized id. */
const KNOWN_LABELS: Readonly<Record<string, string>> = {
  off: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
  max: "Max",
}

/** One-click presets for the common vendor vocabularies; levels absent from the active vocabulary are dropped. */
const PRESETS: ReadonlyArray<readonly [string, Record<string, string>]> = [
  ["DeepSeek", { off: "none", high: "high", max: "max" }],
  ["OpenAI", { off: "none", low: "low", medium: "medium", high: "high" }],
  ["Grok", { low: "low", medium: "medium", high: "high" }],
] as const

type Rec = Record<string, unknown>

function isRecord(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cloneJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (Array.isArray(value)) return value.map((item) => cloneJson(item))
  if (!isRecord(value)) return null
  const result: Rec = {}
  for (const key of Object.keys(value)) result[key] = cloneJson(value[key])
  return result
}

function levelLabel(id: string): string {
  return KNOWN_LABELS[id] ?? (id.charAt(0).toUpperCase() + id.slice(1))
}

/** Pick the namespace to edit: exact match first, else one whose schema carries a level vocabulary and a providers section. */
function pickNamespace(document: RawSettingsDocument): string | undefined {
  const namespaces = Array.isArray(document.namespaces) ? (document.namespaces as RawNamespace[]) : []
  if (namespaces.some((item) => isRecord(item) && item.ns === NAMESPACE)) return NAMESPACE
  for (const item of namespaces) {
    if (!isRecord(item) || typeof item.ns !== "string") continue
    const bag = isRecord(item.user) ? item.user : isRecord(item.value) ? item.value : undefined
    if (bag !== undefined && isRecord(bag.providers) && levelVocabularyFromSchema(document, item.ns) !== undefined) return item.ns
  }
  return undefined
}

/** Normalize a model's reasoningEfforts into editable wire values, restricted to the active vocabulary. */
function effortsOf(model: Rec, levels: readonly string[]): unknown {
  if (model.reasoningEfforts === false) return false
  if (!isRecord(model.reasoningEfforts)) return null
  const efforts: Rec = {}
  for (const id of levels) {
    if (!Object.prototype.hasOwnProperty.call(model.reasoningEfforts, id)) continue
    const wire = model.reasoningEfforts[id]
    if (wire === null || typeof wire === "string") efforts[id] = wire
  }
  return Object.keys(efforts).length > 0 ? efforts : null
}

function modelView(model: unknown, levels: readonly string[]): { id: string; name: string; reasoningEfforts: unknown } | null {
  if (!isRecord(model) || typeof model.id !== "string" || model.id.length === 0) return null
  return {
    id: model.id,
    name: typeof model.name === "string" && model.name.length > 0 ? model.name : model.id,
    reasoningEfforts: effortsOf(model, levels),
  }
}

interface ProviderView {
  id: string
  name: string
  api: string
  models: Array<{ id: string; name: string; reasoningEfforts: unknown }>
}

interface PageState {
  namespace: string
  writable: boolean
  revision: number | undefined
  levels: readonly string[]
  rawUser: Rec
  providers: ProviderView[]
}

function pageState(document: RawSettingsDocument, namespace: string, levels: readonly string[]): PageState {
  const namespaces = Array.isArray(document.namespaces) ? (document.namespaces as RawNamespace[]) : []
  const view = namespaces.find((item) => isRecord(item) && item.ns === namespace)
  const user = isRecord(view?.user) ? (view as Rec).user as Rec : {}
  const configuredProviders = isRecord(user.providers) ? (user.providers as Rec) : {}
  const providers: ProviderView[] = []
  for (const id of Object.keys(configuredProviders)) {
    const profile = configuredProviders[id]
    if (!isRecord(profile) || !Array.isArray(profile.models)) continue
    const models = profile.models
      .map((entry) => modelView(entry, levels))
      .filter((entry) => entry !== null) as ProviderView["models"]
    if (models.length === 0) continue
    providers.push({
      id,
      name: typeof profile.displayName === "string" && profile.displayName.length > 0 ? profile.displayName : id,
      api: typeof profile.api === "string" ? profile.api : "",
      models,
    })
  }
  return {
    namespace,
    writable: document.writable === true,
    revision: typeof view?.revision === "number" ? view.revision : undefined,
    levels,
    rawUser: user,
    providers,
  }
}

/** Draft keyed by level id → wire value. */
function draftOf(model: { reasoningEfforts: unknown }, levels: readonly string[]): Rec {
  if (!isRecord(model.reasoningEfforts)) return {}
  const result: Rec = {}
  for (const id of levels) {
    if (!Object.prototype.hasOwnProperty.call(model.reasoningEfforts, id)) continue
    const wire = model.reasoningEfforts[id]
    result[id] = wire === null ? "" : String(wire)
  }
  return result
}

/** Serialize a draft back to the wire shape: `false` (thinking off) or a wire map. */
function serializedEfforts(draft: Rec, levels: readonly string[]): { value: unknown } | { error: string } {
  const enabled = Object.keys(draft)
  if (enabled.length === 0) return { value: false }
  const result: Rec = {}
  let hasThinking = false
  for (const id of levels) {
    if (!Object.prototype.hasOwnProperty.call(draft, id)) continue
    const wire = String(draft[id]).trim()
    if (id === "off" && wire.length === 0) {
      result.off = null
      continue
    }
    if (wire.length === 0) return { error: `${id} 的协议值不能为空` }
    result[id] = wire
    if (id !== "off") hasThinking = true
  }
  if (!hasThinking) return { error: "除 Off 外至少启用一个档位，或者选择“关闭思考”" }
  return { value: result }
}

function summaryOf(efforts: unknown, levels: readonly string[]): string {
  if (efforts === false) return "已关闭思考"
  if (!isRecord(efforts)) return "未配置（组装器不会显示思考档位）"
  const parts: string[] = []
  for (const id of levels) {
    if (!Object.prototype.hasOwnProperty.call(efforts, id)) continue
    const wire = efforts[id]
    parts.push(`${levelLabel(id)} -> ${wire === null ? "不发送参数" : String(wire)}`)
  }
  return parts.length > 0 ? parts.join("，") : "未配置"
}

interface SectionProps {
  /** Runtime-probed settings channel, resolved once per plugin activation. */
  wire: SettingsWire
  /** Subscribe to pushed settings changes; returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void
}

/** The Settings page body registered into the `settings.section` slot. */
export function ThinkingLevelsSection({ wire, subscribe }: SectionProps): React.ReactElement {
  const [state, setState] = React.useState<PageState | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async (silent = false) => {
    if (!silent) {
      setStatus("loading")
      setError(null)
    }
    try {
      const document = await wire.describe()
      const namespace = pickNamespace(document)
      if (namespace === undefined) {
        const seen = (Array.isArray(document.namespaces) ? (document.namespaces as RawNamespace[]) : [])
          .map((item) => (isRecord(item) && typeof item.ns === "string" ? item.ns : "?"))
          .join("、") || "无"
        throw new Error(`未找到可编辑的提供方设置命名空间（期望 "${NAMESPACE}"，当前：${seen}）`)
      }
      const levels = levelVocabularyFromSchema(document, namespace) ?? [...DEFAULT_LEVELS]
      setState(pageState(document, namespace, levels))
      setStatus("ready")
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      setError(`${detail}（settings 通道：${wire.source() ?? "未识别"}）`)
      setStatus("error")
    }
  }, [wire])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => subscribe(() => void load(true)), [subscribe, load])

  if (status === "loading") {
    return React.createElement("p", { className: "tl-muted" }, "正在读取自定义模型配置...")
  }
  if (status === "error") {
    return React.createElement("div", { className: "tl-page" },
      React.createElement("p", { className: "tl-error" }, error),
      React.createElement("button", { type: "button", className: "tl-primary", onClick: () => void load() }, "重试"))
  }
  if (!state) return React.createElement(React.Fragment, null)

  const intro = React.createElement("header", { className: "tl-intro" },
    React.createElement("h2", { className: "tl-title" }, "思考级别"),
    React.createElement("p", { className: "tl-muted" }, "在这里配置每个自定义模型可以使用的思考档位。保存会直接写入 ~/.dsh/settings.yaml。"),
    React.createElement("ul", { className: "tl-help" },
      React.createElement("li", null, "编辑和查看：设置 -> 思考级别（本页）。"),
      React.createElement("li", null, "实际选用：对话组装器左下角模型菜单。"),
      React.createElement("li", null, "openai-responses 会将右侧协议值发送为 reasoning.effort；Off 可填 none 或留空。"),
    ),
  )

  let body: React.ReactElement
  if (state.providers.length === 0) {
    body = React.createElement("p", { className: "tl-muted" }, "没有发现自定义提供方模型。请先在 设置 -> 模型 中添加模型。")
  } else {
    body = React.createElement(React.Fragment, null,
      ...state.providers.map((provider) =>
        React.createElement("section", { key: provider.id, className: "tl-provider" },
          React.createElement("h3", { className: "tl-provider-title" }, provider.name,
            React.createElement("span", { className: "tl-provider-meta" }, provider.id + (provider.api ? ` · ${provider.api}` : ""))),
          ...provider.models.map((model) =>
            React.createElement(ModelEditor, {
              key: `${provider.id}:${model.id}`,
              wire,
              state,
              provider,
              model,
              onSaved: () => void load(true),
            })),
        )),
    )
  }

  return React.createElement("div", { className: "tl-page" }, intro, body)
}

interface ModelEditorProps {
  wire: SettingsWire
  state: PageState
  provider: ProviderView
  model: { id: string; name: string; reasoningEfforts: unknown }
  onSaved: () => void
}

function ModelEditor({ wire, state, provider, model, onSaved }: ModelEditorProps): React.ReactElement {
  const [draft, setDraft] = React.useState<Rec>(() => draftOf(model, state.levels))
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  React.useEffect(() => {
    setDraft(draftOf(model, state.levels))
    setNotice(null)
  }, [model.id, JSON.stringify(model.reasoningEfforts)])

  const setWire = (id: string, value: string) => {
    setDraft((current) => Object.assign({}, current, { [id]: value }))
    setNotice(null)
  }

  const toggle = (id: string) => {
    setDraft((current) => {
      const next = Object.assign({}, current)
      if (Object.prototype.hasOwnProperty.call(next, id)) delete next[id]
      else next[id] = id === "off" ? "none" : id
      return next
    })
    setNotice(null)
  }

  const save = async (nextDraft: Rec) => {
    const prepared = serializedEfforts(nextDraft, state.levels)
    if (prepared && "error" in prepared) {
      setNotice({ type: "error", text: prepared.error })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const profile = (state.rawUser.providers as Rec | undefined)?.[provider.id]
      if (!isRecord(profile) || !Array.isArray(profile.models)) throw new Error("模型列表已被移除，请刷新页面")
      const models = (profile.models as unknown[]).map((entry) => {
        const copy = cloneJson(entry)
        if (isRecord(copy) && copy.id === model.id) copy.reasoningEfforts = prepared.value
        return copy
      })
      await wire.mutate(state.namespace, [{ op: "set", path: ["providers", provider.id, "models"], value: models }], state.revision)
      setNotice({ type: "success", text: "已保存到 settings.yaml" })
      onSaved()
    } catch (cause) {
      if (cause instanceof SettingsCallError && cause.conflict) {
        setNotice({ type: "error", text: "设置已在其他位置更新，已重新读取最新值，请确认后再次保存" })
        onSaved()
      } else {
        setNotice({ type: "error", text: cause instanceof Error ? cause.message : String(cause) })
      }
    } finally {
      setBusy(false)
    }
  }

  const applyPreset = (efforts: Record<string, string>) => {
    const next: Rec = {}
    for (const id of state.levels) {
      if (Object.prototype.hasOwnProperty.call(efforts, id)) next[id] = efforts[id]
    }
    setDraft(next)
    void save(next)
  }

  return React.createElement("article", { className: "tl-model" },
    React.createElement("header", { className: "tl-model-header" },
      React.createElement("div", null,
        React.createElement("div", { className: "tl-model-name" }, model.name),
        model.name !== model.id ? React.createElement("div", { className: "tl-model-id" }, model.id) : null,
        React.createElement("div", { className: "tl-current" }, `当前配置：${summaryOf(model.reasoningEfforts, state.levels)}`),
      ),
      React.createElement("div", { className: "tl-presets" },
        ...PRESETS.map(([label, efforts]) =>
          React.createElement("button", { key: label, type: "button", className: "tl-secondary", disabled: busy || !state.writable, onClick: () => applyPreset(efforts) }, label)),
        React.createElement("button", {
          type: "button",
          className: "tl-secondary",
          disabled: busy || !state.writable,
          onClick: () => { setDraft({}); void save({}) },
        }, "关闭思考"),
      ),
    ),
    React.createElement("div", { className: "tl-levels" },
      ...state.levels.map((id) => {
        const checked = Object.prototype.hasOwnProperty.call(draft, id)
        return React.createElement("label", { key: id, className: checked ? "tl-level tl-level-on" : "tl-level" },
          React.createElement("input", {
            type: "checkbox",
            checked,
            disabled: busy || !state.writable,
            onChange: () => toggle(id),
          }),
          React.createElement("span", { className: "tl-label" }, levelLabel(id)),
          checked
            ? React.createElement("input", {
                className: "tl-wire",
                value: typeof draft[id] === "string" ? draft[id] as string : "",
                disabled: busy || !state.writable,
                placeholder: id === "off" ? "none 或留空" : id,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => setWire(id, event.target.value),
              })
            : React.createElement("span", { className: "tl-unavailable" }, "不提供"),
        )
      }),
    ),
    React.createElement("footer", { className: "tl-model-footer" },
      React.createElement("button", {
        type: "button",
        className: "tl-primary",
        disabled: busy || !state.writable,
        onClick: () => void save(draft),
      }, busy ? "保存中..." : "保存此模型"),
      notice ? React.createElement("span", { className: notice.type === "success" ? "tl-success" : "tl-error" }, notice.text) : null,
    ),
  )
}

const CSS = `
.tl-page { display: flex; flex-direction: column; gap: 20px; min-width: 0; padding: 4px 0 28px; color: var(--dsw-alias-label-primary); }
.tl-intro { display: flex; flex-direction: column; gap: 8px; }
.tl-title, .tl-provider-title { margin: 0; letter-spacing: 0; }
.tl-title { font-size: 18px; line-height: 1.35; font-weight: 600; }
.tl-muted, .tl-help, .tl-model-id, .tl-current, .tl-provider-meta, .tl-unavailable { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.5; }
.tl-muted, .tl-current { margin: 0; }
.tl-help { display: grid; gap: 3px; margin: 0; padding-left: 18px; }
.tl-provider { display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 0; border: 0; background: transparent; }
.tl-provider-title { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; font-size: 14px; font-weight: 600; }
.tl-provider-meta { font-weight: 400; }
.tl-model { display: flex; flex-direction: column; gap: 14px; min-width: 0; padding: 14px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }
.tl-model-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: flex-start; }
.tl-model-name { font-size: 14px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.tl-model-id, .tl-current { margin-top: 3px; overflow-wrap: anywhere; }
.tl-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.tl-secondary, .tl-primary { min-height: 28px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 5px 9px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 16px; cursor: pointer; }
.tl-primary { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }
.tl-secondary:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.tl-secondary:disabled, .tl-primary:disabled { cursor: not-allowed; opacity: 0.5; }
.tl-secondary:focus-visible, .tl-primary:focus-visible, .tl-wire:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.tl-levels { display: grid; gap: 7px; }
.tl-level { display: grid; grid-template-columns: 18px 78px minmax(0, 1fr); gap: 8px; align-items: center; min-height: 30px; font-size: 13px; }
.tl-level input[type='checkbox'] { width: 16px; height: 16px; margin: 0; accent-color: var(--dsw-alias-brand-primary); }
.tl-label { color: var(--dsw-alias-label-secondary); }
.tl-level-on .tl-label { color: var(--dsw-alias-label-primary); font-weight: 600; }
.tl-wire { width: 100%; min-width: 0; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 5px 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 16px; }
.tl-model-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 28px; }
.tl-success, .tl-error { font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
.tl-success { color: var(--dsw-alias-state-success-primary); }
.tl-error { color: var(--dsw-alias-state-error-primary); }
@media (max-width: 560px) { .tl-model { padding: 12px; } .tl-level { grid-template-columns: 18px 1fr; } .tl-wire, .tl-unavailable { grid-column: 2; } }
`

/** Client plugin apply: register the settings.section contribution, cleaned up on fiber unload. */
export function apply(ctx: any): void {
  // One runtime-probed channel shared by every mount of this section; holders
  // are re-read on each call, so a service that arrives after activation is
  // still found.
  const wire = resolveSettingsWire([ctx])
  ctx.effect(() => {
    const style = document.createElement("style")
    style.dataset.plugin = "dsh-thinking-levels-settings"
    style.textContent = CSS
    document.head.appendChild(style)

    // Pushed refresh: prefer the Remote event bus, fall back to the local
    // event bus; both are optional enhancements, never requirements.
    const listeners = new Set<() => void>()
    const notify = () => {
      for (const listener of [...listeners]) listener()
    }
    const disposers: Array<() => void> = []
    try {
      const remote: unknown = typeof ctx.get === "function" ? ctx.get("remote") : undefined
      const remoteOn = isRecord(remote) && typeof remote.$on === "function" ? (remote.$on as (event: string, listener: () => void) => unknown) : undefined
      if (remoteOn !== undefined) {
        const dispose = remoteOn("settings/document-updated", notify)
        if (typeof dispose === "function") disposers.push(dispose as () => void)
      }
    } catch {
      /* no pushed invalidation — the page still reloads on open and on retry */
    }
    try {
      if (typeof ctx.on === "function") {
        const dispose = ctx.on("connection/reset", notify)
        if (typeof dispose === "function") disposers.push(dispose as () => void)
      }
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
          label: "思考级别",
        },
        () => React.createElement(ThinkingLevelsSection, { wire, subscribe }),
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
      listeners.clear()
      style.remove()
    }
  }, "thinking-levels: settings section")
}

/** Hard service dependency: without the slot system there is nothing to register. Everything else is probed. */
export const inject = ["slots"]
