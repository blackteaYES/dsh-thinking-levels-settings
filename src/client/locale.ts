/**
 * Locale dictionaries for this page.
 *
 * Registered through the DSH locale service (`ctx.locale.register(ns, {zh, en})`),
 * which the platform's own client bundles use too. Dictionary registration
 * bumps the locale revision, and active-locale switches emit `locale/change`,
 * so subscribing to the locale snapshot is all a component needs to re-render
 * in the new language — this plugin never listens for a language change itself.
 *
 * Keys are stable identifiers rather than Chinese source strings so a copy edit
 * cannot silently break a lookup; the `error.*` family doubles as the message
 * keys returned by the pure logic in `./levels`.
 */

/** Dictionary namespace; namespaced so it cannot collide with platform copy. */
export const LOCALE_NS = "dsh-thinking-levels-settings"

const zh = {
  "section.label": "思考级别",
  "page.title": "思考级别",
  "page.intro": "配置每个自定义模型可以使用的思考档位与输入能力。保存会直接写入 ~/.dsh/settings.yaml。",
  "page.help.edit": "编辑和查看：设置 -> 思考级别（本页）。",
  "page.help.use": "实际选用：对话组装器左下角模型菜单。",
  "page.help.wire": "openai-responses 会把协议值发送为 reasoning.effort；Off 可填 none 或留空。",
  "page.version": "插件版本 v{version}",
  "page.build": "{count} 个提供方 · {levels} 个档位",
  "page.loading": "正在读取自定义模型配置...",
  "page.retry": "重试",
  "page.readonly": "当前设置来源为只读，无法保存。",
  "page.empty": "没有发现自定义提供方模型。请先在 设置 -> 模型 中添加模型。",
  "page.error.namespace": "未找到可编辑的提供方设置命名空间（期望 {expected}，当前：{seen}）",
  "page.error.channel": "（settings 通道：{source}）",

  "toolbar.search": "搜索模型或提供方",
  "toolbar.searchClear": "清除搜索",
  "toolbar.expandAll": "展开全部",
  "toolbar.collapseAll": "折叠全部",
  "toolbar.more": "更多",
  "toolbar.moreWith": "更多 · {name}",
  "toolbar.dirtyCount": "{count} 个模型有未保存的修改",
  "toolbar.saveProvider": "保存此提供方（{count}）",
  "toolbar.saveAll": "保存全部（{count}）",
  "toolbar.saving": "保存中...",
  "toolbar.discard": "放弃修改",
  "toolbar.export": "导出 JSON",
  "toolbar.import": "导入 JSON",
  "toolbar.importPlaceholder": "粘贴此前导出的 JSON",
  "toolbar.importApply": "应用到草稿",
  "toolbar.importCancel": "取消",

  "filter.all": "全部",
  "filter.configured": "已配置",
  "filter.unconfigured": "未配置",
  "filter.nonreasoning": "非推理",
  "filter.image": "支持图片",
  "filter.dirty": "未保存",

  "provider.modelCount": "{count} 个模型",
  "provider.configuredCount": "已配置 {done}/{total}",
  "provider.expand": "展开",
  "provider.collapse": "折叠",

  "model.id": "ID：{id}",
  "model.currently": "当前：{summary}",
  "model.draft": "草稿：{summary}",
  "model.modified": "有未保存修改",
  "model.expand": "展开 {name}",
  "model.collapse": "折叠 {name}",
  "model.reset": "恢复为此前的配置",

  "mode.legend": "推理模式",
  "mode.inherit": "继承目录",
  "mode.inheritHelp": "不写这个字段（reasoningEfforts 缺失），沿用内置目录对该模型的能力声明。",
  "mode.false": "非推理",
  "mode.falseHelp": "写入 reasoningEfforts: false，模型菜单不提供任何思考档位。",
  "mode.map": "启用档位",
  "mode.mapHelp": "逐档声明发送的协议值，至少需要一个 Off 之外的档位。",

  "levels.header": "档位",
  "levels.wireHeader": "协议值（发送时的拼写）",
  "levels.presets": "预设",
  "levels.preset.deepseek": "DeepSeek",
  "levels.preset.openai": "OpenAI",
  "levels.preset.grok": "Grok",
  "levels.placeholder": "发送的字符串",
  "levels.offPlaceholder": "none 或留空",
  "levels.unavailable": "不提供",
  "levels.offHint": "留空表示「支持但不发送参数」",

  "input.legend": "输入能力",
  "input.text": "文本",
  "input.image": "图片",
  "input.note": "这是对端点的断言，不是检查；端点不接受的输入会被提供方拒绝。两个都不勾选则省略该字段，沿用目录。",

  "preview.title": "最终效果",
  "preview.map": "模型菜单将提供：{levels}",
  "preview.mapOffNothing": "（Off 不发送参数）",
  "preview.false": "模型菜单不提供思考档位（非推理模型）。",
  "preview.inherit": "未声明档位；模型菜单是否提供取决于内置目录，本页无法确定。",
  "preview.inputText": "输入能力：{modalities}",
  "preview.inputInherit": "输入能力：未声明，沿用目录",

  "save.saved": "已保存到 settings.yaml",
  "save.partial": "已保存 {done} 个模型，{failed} 个失败：{detail}",
  "save.conflict": "设置已在其他位置更新，已重新读取最新值，请确认后再次保存",
  "save.nothing": "没有需要保存的修改",
  "save.removed": "模型列表已被移除，请刷新页面",

  "export.done": "已生成导出内容",
  "export.copy": "复制",
  "export.copied": "已复制到剪贴板",
  "export.copyFailed": "复制失败，请手动选择文本",
  "import.applied": "已应用 {count} 个模型的配置到草稿，请确认后保存",
  "import.noneMatched": "导入内容与当前提供方/模型没有匹配项",

  "error.needLevel": "请至少启用一个档位，或改成「非推理」。",
  "error.needWire": "{level} 的协议值不能为空（只有 Off 可以留空）。",
  "error.offOnly": "只声明 Off 是无效配置；请添加一个 Off 之外的档位，或改成「非推理」。",
  "error.importJson": "导入内容不是合法的 JSON。",
  "error.importShape": "导入内容的形状不符合预期。",
  "error.importFormat": "导入内容格式不匹配（期望 {format}）。",
  "error.importEmpty": "导入内容没有包含任何模型。",
  "error.modelMissing": "{model} 已不在当前配置中。",
} as const

const en: Record<keyof typeof zh, string> = {
  "section.label": "Thinking levels",
  "page.title": "Thinking levels",
  "page.intro": "Configure the thinking levels and input capabilities of each custom model. Saving writes straight to ~/.dsh/settings.yaml.",
  "page.help.edit": "Edit and review: Settings -> Thinking levels (this page).",
  "page.help.use": "Select them while chatting: the model menu at the composer's bottom-left.",
  "page.help.wire": "openai-responses sends the wire value as reasoning.effort; Off may be none or empty.",
  "page.version": "Plugin v{version}",
  "page.build": "{count} providers · {levels} levels",
  "page.loading": "Reading custom model configuration...",
  "page.retry": "Retry",
  "page.readonly": "The current settings source is read-only; saving is unavailable.",
  "page.empty": "No custom provider models found. Add models under Settings -> Models first.",
  "page.error.namespace": "No editable provider settings namespace found (expected {expected}, present: {seen})",
  "page.error.channel": " (settings channel: {source})",

  "toolbar.search": "Search models or providers",
  "toolbar.searchClear": "Clear search",
  "toolbar.expandAll": "Expand all",
  "toolbar.collapseAll": "Collapse all",
  "toolbar.more": "More",
  "toolbar.moreWith": "More · {name}",
  "toolbar.dirtyCount": "{count} model(s) with unsaved changes",
  "toolbar.saveProvider": "Save provider ({count})",
  "toolbar.saveAll": "Save all ({count})",
  "toolbar.saving": "Saving...",
  "toolbar.discard": "Discard changes",
  "toolbar.export": "Export JSON",
  "toolbar.import": "Import JSON",
  "toolbar.importPlaceholder": "Paste previously exported JSON",
  "toolbar.importApply": "Apply to drafts",
  "toolbar.importCancel": "Cancel",

  "filter.all": "All",
  "filter.configured": "Configured",
  "filter.unconfigured": "Unconfigured",
  "filter.nonreasoning": "Non-reasoning",
  "filter.image": "Image input",
  "filter.dirty": "Unsaved",

  "provider.modelCount": "{count} model(s)",
  "provider.configuredCount": "{done}/{total} configured",
  "provider.expand": "Expand",
  "provider.collapse": "Collapse",

  "model.id": "ID: {id}",
  "model.currently": "Configured: {summary}",
  "model.draft": "Draft: {summary}",
  "model.modified": "Unsaved changes",
  "model.expand": "Expand {name}",
  "model.collapse": "Collapse {name}",
  "model.reset": "Reset to the stored configuration",

  "mode.legend": "Reasoning mode",
  "mode.inherit": "Inherit catalog",
  "mode.inheritHelp": "Omit the field (no reasoningEfforts) and keep the installed catalog's capability for this model.",
  "mode.false": "Non-reasoning",
  "mode.falseHelp": "Write reasoningEfforts: false, so the model menu offers no thinking level.",
  "mode.map": "Declare levels",
  "mode.mapHelp": "Name the wire value sent per level; at least one level beyond Off is required.",

  "levels.header": "Level",
  "levels.wireHeader": "Wire value (what gets sent)",
  "levels.presets": "Presets",
  "levels.preset.deepseek": "DeepSeek",
  "levels.preset.openai": "OpenAI",
  "levels.preset.grok": "Grok",
  "levels.placeholder": "Value to send",
  "levels.offPlaceholder": "none, or empty",
  "levels.unavailable": "Not offered",
  "levels.offHint": "Empty means \"supported, send no parameter\"",

  "input.legend": "Input capabilities",
  "input.text": "Text",
  "input.image": "Image",
  "input.note": "This is an assertion about the endpoint, not a check; input the endpoint rejects is refused by the provider. Leaving both unchecked omits the field and inherits the catalog.",

  "preview.title": "Effective result",
  "preview.map": "The model menu will offer: {levels}",
  "preview.mapOffNothing": " (Off sends no parameter)",
  "preview.false": "The model menu offers no thinking level (non-reasoning model).",
  "preview.inherit": "No levels declared; what the model menu offers depends on the installed catalog and cannot be determined here.",
  "preview.inputText": "Input capabilities: {modalities}",
  "preview.inputInherit": "Input capabilities: undeclared, inherited from the catalog",

  "save.saved": "Saved to settings.yaml",
  "save.partial": "Saved {done} model(s); {failed} failed: {detail}",
  "save.conflict": "These settings changed elsewhere; the latest values were re-read. Review, then save again.",
  "save.nothing": "Nothing to save",
  "save.removed": "The model list was removed; reload the page",

  "export.done": "Export generated",
  "export.copy": "Copy",
  "export.copied": "Copied to clipboard",
  "export.copyFailed": "Copy failed; select the text manually",
  "import.applied": "Applied {count} model configuration(s) to the drafts; review, then save",
  "import.noneMatched": "Nothing in the import matches the current providers/models",

  "error.needLevel": "Enable at least one level, or switch to \"Non-reasoning\".",
  "error.needWire": "{level} needs a wire value (only Off may be empty).",
  "error.offOnly": "Off alone is not a valid configuration; add a level beyond Off, or switch to \"Non-reasoning\".",
  "error.importJson": "The imported text is not valid JSON.",
  "error.importShape": "The imported content has an unexpected shape.",
  "error.importFormat": "The imported content has the wrong format (expected {format}).",
  "error.importEmpty": "The imported content contains no models.",
  "error.modelMissing": "{model} is no longer in the current configuration.",
}

/** The dictionary pair handed to `ctx.locale.register`. */
export const DICTIONARIES = { zh, en } as const

/** Locale keys this page uses. */
export type CopyKey = keyof typeof zh

/**
 * A translate function. Loosely keyed because several call sites compose keys
 * (`filter.${id}`), and a mistyped key already degrades safely: the platform
 * translator returns the key itself, and {@link fallbackTranslate} does too.
 */
export type Translate = (key: string, params?: Record<string, unknown>) => string

/** Substitute `{name}` placeholders, mirroring the platform translator's convention. */
export function interpolate(template: string, params: Record<string, unknown> | undefined): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  )
}

/**
 * Dictionary-backed translate used when the locale service is unavailable.
 * The page then renders in Chinese rather than showing raw keys, which keeps a
 * service-less DSH readable instead of broken.
 */
export function fallbackTranslate(key: string, params?: Record<string, unknown>): string {
  const template = (zh as Record<string, string>)[key] ?? key
  return interpolate(template, params)
}
