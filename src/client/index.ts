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
import * as React from "react"
import type { IApiClient, SettingsNamespaceView } from "@deepseek-ai/dsh-api-remotes/client"
import type { RpcResponse } from "@deepseek-ai/dsh-host-apiproxy/api"

/** Settings wire face consumed by the section: the shared API client's settings domain. */
type SettingsApi = IApiClient

/** Settings namespace owned by the custom-provider settings domain. */
const NAMESPACE = "llm-pi-ai"

/** Canonical thinking-effort levels, in display order (wire keys match the Composer selector). */
const LEVELS: ReadonlyArray<readonly [string, string]> = [
  ["off", "Off"],
  ["minimal", "Minimal"],
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["xhigh", "XHigh"],
  ["max", "Max"],
] as const

/** One-click presets for the common vendor vocabularies. */
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

interface DescribeResponseValue {
  writable: boolean
  hasDocument: boolean
  namespaces: SettingsNamespaceView[]
}

/** Narrow the describe() response to the llm-pi-ai namespace view. */
function namespaceView(response: RpcResponse<DescribeResponseValue>): (SettingsNamespaceView & { writable: boolean }) | undefined {
  if (!response || response.result.ok !== true) {
    throw new Error(response.result.ok === false ? response.result.error.message : "读取设置失败")
  }
  const { namespaces, writable } = response.result.value
  if (!Array.isArray(namespaces)) throw new Error("设置响应缺少命名空间列表")
  const view = namespaces.find((item) => item && item.ns === NAMESPACE)
  if (!view) return undefined
  return Object.assign({}, view, { writable: writable === true })
}

/** Normalize a model's reasoningEfforts into editable wire values. */
function effortsOf(model: Rec): unknown {
  if (model.reasoningEfforts === false) return false
  if (!isRecord(model.reasoningEfforts)) return null
  const efforts: Rec = {}
  for (const [id] of LEVELS) {
    if (!Object.prototype.hasOwnProperty.call(model.reasoningEfforts, id)) continue
    const wire = model.reasoningEfforts[id]
    if (wire === null || typeof wire === "string") efforts[id] = wire
  }
  return Object.keys(efforts).length > 0 ? efforts : null
}

function modelView(model: unknown): { id: string; name: string; reasoningEfforts: unknown } | null {
  if (!isRecord(model) || typeof model.id !== "string" || model.id.length === 0) return null
  return {
    id: model.id,
    name: typeof model.name === "string" && model.name.length > 0 ? model.name : model.id,
    reasoningEfforts: effortsOf(model),
  }
}

interface ProviderView {
  id: string
  name: string
  api: string
  models: Array<{ id: string; name: string; reasoningEfforts: unknown }>
}

interface PageState {
  writable: boolean
  revision: number | undefined
  rawUser: Rec
  providers: ProviderView[]
}

function pageState(view: SettingsNamespaceView & { writable: boolean }): PageState {
  const user = isRecord(view.user) ? view.user : {}
  const configuredProviders = isRecord(user.providers) ? (user.providers as Rec) : {}
  const providers: ProviderView[] = []
  for (const id of Object.keys(configuredProviders)) {
    const profile = configuredProviders[id]
    if (!isRecord(profile) || !Array.isArray(profile.models)) continue
    const models = profile.models.map((entry) => modelView(entry)).filter((entry) => entry !== null) as Array<{ id: string; name: string; reasoningEfforts: unknown }>
    if (models.length === 0) continue
    providers.push({
      id,
      name: typeof profile.displayName === "string" && profile.displayName.length > 0 ? profile.displayName : id,
      api: typeof profile.api === "string" ? profile.api : "",
      models,
    })
  }
  return {
    writable: view.writable === true,
    revision: typeof view.revision === "number" ? view.revision : undefined,
    rawUser: user,
    providers,
  }
}

/** Draft keyed by LEVELS id → wire value. */
function draftOf(model: { reasoningEfforts: unknown }): Rec {
  if (!isRecord(model.reasoningEfforts)) return {}
  const result: Rec = {}
  for (const [id] of LEVELS) {
    if (!Object.prototype.hasOwnProperty.call(model.reasoningEfforts, id)) continue
    const wire = model.reasoningEfforts[id]
    result[id] = wire === null ? "" : String(wire)
  }
  return result
}

/** Serialize a draft back to the wire shape: `false` (thinking off) or a wire map. */
function serializedEfforts(draft: Rec): { value: unknown } | { error: string } {
  const enabled = Object.keys(draft)
  if (enabled.length === 0) return { value: false }
  const result: Rec = {}
  let hasThinking = false
  for (const [id] of LEVELS) {
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

function summaryOf(efforts: unknown): string {
  if (efforts === false) return "已关闭思考"
  if (!isRecord(efforts)) return "未配置（组装器不会显示思考档位）"
  const parts: string[] = []
  for (const [id, label] of LEVELS) {
    if (!Object.prototype.hasOwnProperty.call(efforts, id)) continue
    const wire = efforts[id]
    parts.push(`${label} -> ${wire === null ? "不发送参数" : String(wire)}`)
  }
  return parts.length > 0 ? parts.join("，") : "未配置"
}

interface SectionProps {
  /** Settings wire face from the connection inject. */
  api: SettingsApi
}

/** The Settings page body registered into the `settings.section` slot. */
export function ThinkingLevelsSection({ api }: SectionProps): React.ReactElement {
  const [state, setState] = React.useState<PageState | null>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setStatus("loading")
    setError(null)
    try {
      const view = namespaceView(await api.settings.describe({}))
      if (!view) throw new Error("llm-pi-ai 设置尚未加载")
      setState(pageState(view))
      setStatus("ready")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus("error")
    }
  }, [api])

  React.useEffect(() => {
    void load()
  }, [load])

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
            React.createElement(ModelEditor, { key: `${provider.id}:${model.id}`, api, state, provider, model, onCommitted: setState })),
        )),
    )
  }

  return React.createElement("div", { className: "tl-page" }, intro, body)
}

interface ModelEditorProps {
  api: SettingsApi
  state: PageState
  provider: ProviderView
  model: { id: string; name: string; reasoningEfforts: unknown }
  onCommitted: (next: PageState) => void
}

function ModelEditor({ api, state, provider, model, onCommitted }: ModelEditorProps): React.ReactElement {
  const [draft, setDraft] = React.useState<Rec>(() => draftOf(model))
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  React.useEffect(() => {
    setDraft(draftOf(model))
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
    const prepared = serializedEfforts(nextDraft)
    if (prepared && "error" in prepared) {
      setNotice({ type: "error", text: (prepared as { error: string }).error })
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
      const response = await api.settings.mutate({
        ns: NAMESPACE,
        ops: [{ op: "set", path: ["providers", provider.id, "models"], value: models }],
        expectedRevision: state.revision,
      })
      if (!response.result.ok) {
        if (response.result.error.code === "settings-conflict") {
          throw new Error("设置已在其他位置更新，请刷新后重试")
        }
        throw new Error(response.result.error.message)
      }
      const nextState = pageState(Object.assign({}, response.result.value, { writable: state.writable }))
      onCommitted(nextState)
      setNotice({ type: "success", text: "已保存到 settings.yaml" })
    } catch (cause) {
      setNotice({ type: "error", text: cause instanceof Error ? cause.message : String(cause) })
    } finally {
      setBusy(false)
    }
  }

  const applyPreset = (efforts: Record<string, string>) => {
    const next: Rec = {}
    for (const [id] of LEVELS) {
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
        React.createElement("div", { className: "tl-current" }, `当前配置：${summaryOf(model.reasoningEfforts)}`),
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
      ...LEVELS.map(([id, label]) => {
        const checked = Object.prototype.hasOwnProperty.call(draft, id)
        return React.createElement("label", { key: id, className: checked ? "tl-level tl-level-on" : "tl-level" },
          React.createElement("input", {
            type: "checkbox",
            checked,
            disabled: busy || !state.writable,
            onChange: () => toggle(id),
          }),
          React.createElement("span", { className: "tl-label" }, label),
          checked
            ? React.createElement("input", {
                className: "tl-wire",
                value: typeof draft[id] === "string" ? draft[id] as string : "",
                disabled: busy || !state.writable,
                placeholder: id === "off" ? "none 或留空" : id,
                onChange: (event) => setWire(id, event.target.value),
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
  ctx.effect(() => {
    const style = document.createElement("style")
    style.dataset.plugin = "dsh-thinking-levels-settings"
    style.textContent = CSS
    document.head.appendChild(style)
    const disposeSlot = ctx.slots.inject("settings.section", () =>
      ctx.slots.register(
        {
          name: "settings.section",
          id: "thinking-levels",
          order: 11,
          label: "思考级别",
        },
        () => React.createElement(ThinkingLevelsSection, { api: ctx.connection.api }),
      ),
    )
    return () => {
      disposeSlot()
      style.remove()
    }
  }, "thinking-levels: settings section")
}

/** Required services: the connection (settings wire) and the slot system. */
export const inject = ["connection", "slots"]