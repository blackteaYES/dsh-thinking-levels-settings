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
export declare const LOCALE_NS = "dsh-thinking-levels-settings";
declare const zh: {
    readonly "section.label": "思考级别";
    readonly "page.title": "思考级别";
    readonly "page.intro": "配置每个自定义模型可以使用的思考档位与输入能力。保存会直接写入 ~/.dsh/settings.yaml。";
    readonly "page.help.edit": "编辑和查看：设置 -> 思考级别（本页）。";
    readonly "page.help.use": "实际选用：对话组装器左下角模型菜单。";
    readonly "page.help.wire": "openai-responses 会把协议值发送为 reasoning.effort；Off 可填 none 或留空。";
    readonly "page.version": "插件版本 v{version}";
    readonly "page.build": "{count} 个提供方 · {levels} 个档位";
    readonly "page.loading": "正在读取自定义模型配置...";
    readonly "page.retry": "重试";
    readonly "page.readonly": "当前设置来源为只读，无法保存。";
    readonly "page.empty": "没有发现自定义提供方模型。请先在 设置 -> 模型 中添加模型。";
    readonly "page.error.namespace": "未找到可编辑的提供方设置命名空间（期望 {expected}，当前：{seen}）";
    readonly "page.error.channel": "（settings 通道：{source}）";
    readonly "toolbar.search": "搜索模型或提供方";
    readonly "toolbar.searchClear": "清除搜索";
    readonly "toolbar.expandAll": "展开全部";
    readonly "toolbar.collapseAll": "折叠全部";
    readonly "toolbar.more": "更多";
    readonly "toolbar.moreWith": "更多 · {name}";
    readonly "toolbar.dirtyCount": "{count} 个模型有未保存的修改";
    readonly "toolbar.saveProvider": "保存此提供方（{count}）";
    readonly "toolbar.saveAll": "保存全部（{count}）";
    readonly "toolbar.saving": "保存中...";
    readonly "toolbar.discard": "放弃修改";
    readonly "toolbar.export": "导出 JSON";
    readonly "toolbar.import": "导入 JSON";
    readonly "toolbar.importPlaceholder": "粘贴此前导出的 JSON";
    readonly "toolbar.importApply": "应用到草稿";
    readonly "toolbar.importCancel": "取消";
    readonly "filter.all": "全部";
    readonly "filter.configured": "已配置";
    readonly "filter.unconfigured": "未配置";
    readonly "filter.nonreasoning": "非推理";
    readonly "filter.image": "支持图片";
    readonly "filter.dirty": "未保存";
    readonly "provider.modelCount": "{count} 个模型";
    readonly "provider.configuredCount": "已配置 {done}/{total}";
    readonly "provider.expand": "展开";
    readonly "provider.collapse": "折叠";
    readonly "model.id": "ID：{id}";
    readonly "model.currently": "当前：{summary}";
    readonly "model.draft": "草稿：{summary}";
    readonly "model.modified": "有未保存修改";
    readonly "model.expand": "展开 {name}";
    readonly "model.collapse": "折叠 {name}";
    readonly "model.reset": "恢复为此前的配置";
    readonly "mode.legend": "推理模式";
    readonly "mode.inherit": "继承目录";
    readonly "mode.inheritHelp": "不写这个字段（reasoningEfforts 缺失），沿用内置目录对该模型的能力声明。";
    readonly "mode.false": "非推理";
    readonly "mode.falseHelp": "写入 reasoningEfforts: false，模型菜单不提供任何思考档位。";
    readonly "mode.map": "启用档位";
    readonly "mode.mapHelp": "逐档声明发送的协议值，至少需要一个 Off 之外的档位。";
    readonly "levels.header": "档位";
    readonly "levels.wireHeader": "协议值（发送时的拼写）";
    readonly "levels.presets": "预设";
    readonly "levels.preset.deepseek": "DeepSeek";
    readonly "levels.preset.openai": "OpenAI";
    readonly "levels.preset.grok": "Grok";
    readonly "levels.placeholder": "发送的字符串";
    readonly "levels.offPlaceholder": "none 或留空";
    readonly "levels.unavailable": "不提供";
    readonly "levels.offHint": "留空表示「支持但不发送参数」";
    readonly "input.legend": "输入能力";
    readonly "input.text": "文本";
    readonly "input.image": "图片";
    readonly "input.note": "这是对端点的断言，不是检查；端点不接受的输入会被提供方拒绝。两个都不勾选则省略该字段，沿用目录。";
    readonly "preview.title": "最终效果";
    readonly "preview.map": "模型菜单将提供：{levels}";
    readonly "preview.mapOffNothing": "（Off 不发送参数）";
    readonly "preview.false": "模型菜单不提供思考档位（非推理模型）。";
    readonly "preview.inherit": "未声明档位；模型菜单是否提供取决于内置目录，本页无法确定。";
    readonly "preview.inputText": "输入能力：{modalities}";
    readonly "preview.inputInherit": "输入能力：未声明，沿用目录";
    readonly "save.saved": "已保存到 settings.yaml";
    readonly "save.partial": "已保存 {done} 个模型，{failed} 个失败：{detail}";
    readonly "save.conflict": "设置已在其他位置更新，已重新读取最新值，请确认后再次保存";
    readonly "save.nothing": "没有需要保存的修改";
    readonly "save.removed": "模型列表已被移除，请刷新页面";
    readonly "export.done": "已生成导出内容";
    readonly "export.copy": "复制";
    readonly "export.copied": "已复制到剪贴板";
    readonly "export.copyFailed": "复制失败，请手动选择文本";
    readonly "import.applied": "已应用 {count} 个模型的配置到草稿，请确认后保存";
    readonly "import.noneMatched": "导入内容与当前提供方/模型没有匹配项";
    readonly "error.needLevel": "请至少启用一个档位，或改成「非推理」。";
    readonly "error.needWire": "{level} 的协议值不能为空（只有 Off 可以留空）。";
    readonly "error.offOnly": "只声明 Off 是无效配置；请添加一个 Off 之外的档位，或改成「非推理」。";
    readonly "error.importJson": "导入内容不是合法的 JSON。";
    readonly "error.importShape": "导入内容的形状不符合预期。";
    readonly "error.importFormat": "导入内容格式不匹配（期望 {format}）。";
    readonly "error.importEmpty": "导入内容没有包含任何模型。";
    readonly "error.modelMissing": "{model} 已不在当前配置中。";
};
/** The dictionary pair handed to `ctx.locale.register`. */
export declare const DICTIONARIES: {
    readonly zh: {
        readonly "section.label": "思考级别";
        readonly "page.title": "思考级别";
        readonly "page.intro": "配置每个自定义模型可以使用的思考档位与输入能力。保存会直接写入 ~/.dsh/settings.yaml。";
        readonly "page.help.edit": "编辑和查看：设置 -> 思考级别（本页）。";
        readonly "page.help.use": "实际选用：对话组装器左下角模型菜单。";
        readonly "page.help.wire": "openai-responses 会把协议值发送为 reasoning.effort；Off 可填 none 或留空。";
        readonly "page.version": "插件版本 v{version}";
        readonly "page.build": "{count} 个提供方 · {levels} 个档位";
        readonly "page.loading": "正在读取自定义模型配置...";
        readonly "page.retry": "重试";
        readonly "page.readonly": "当前设置来源为只读，无法保存。";
        readonly "page.empty": "没有发现自定义提供方模型。请先在 设置 -> 模型 中添加模型。";
        readonly "page.error.namespace": "未找到可编辑的提供方设置命名空间（期望 {expected}，当前：{seen}）";
        readonly "page.error.channel": "（settings 通道：{source}）";
        readonly "toolbar.search": "搜索模型或提供方";
        readonly "toolbar.searchClear": "清除搜索";
        readonly "toolbar.expandAll": "展开全部";
        readonly "toolbar.collapseAll": "折叠全部";
        readonly "toolbar.more": "更多";
        readonly "toolbar.moreWith": "更多 · {name}";
        readonly "toolbar.dirtyCount": "{count} 个模型有未保存的修改";
        readonly "toolbar.saveProvider": "保存此提供方（{count}）";
        readonly "toolbar.saveAll": "保存全部（{count}）";
        readonly "toolbar.saving": "保存中...";
        readonly "toolbar.discard": "放弃修改";
        readonly "toolbar.export": "导出 JSON";
        readonly "toolbar.import": "导入 JSON";
        readonly "toolbar.importPlaceholder": "粘贴此前导出的 JSON";
        readonly "toolbar.importApply": "应用到草稿";
        readonly "toolbar.importCancel": "取消";
        readonly "filter.all": "全部";
        readonly "filter.configured": "已配置";
        readonly "filter.unconfigured": "未配置";
        readonly "filter.nonreasoning": "非推理";
        readonly "filter.image": "支持图片";
        readonly "filter.dirty": "未保存";
        readonly "provider.modelCount": "{count} 个模型";
        readonly "provider.configuredCount": "已配置 {done}/{total}";
        readonly "provider.expand": "展开";
        readonly "provider.collapse": "折叠";
        readonly "model.id": "ID：{id}";
        readonly "model.currently": "当前：{summary}";
        readonly "model.draft": "草稿：{summary}";
        readonly "model.modified": "有未保存修改";
        readonly "model.expand": "展开 {name}";
        readonly "model.collapse": "折叠 {name}";
        readonly "model.reset": "恢复为此前的配置";
        readonly "mode.legend": "推理模式";
        readonly "mode.inherit": "继承目录";
        readonly "mode.inheritHelp": "不写这个字段（reasoningEfforts 缺失），沿用内置目录对该模型的能力声明。";
        readonly "mode.false": "非推理";
        readonly "mode.falseHelp": "写入 reasoningEfforts: false，模型菜单不提供任何思考档位。";
        readonly "mode.map": "启用档位";
        readonly "mode.mapHelp": "逐档声明发送的协议值，至少需要一个 Off 之外的档位。";
        readonly "levels.header": "档位";
        readonly "levels.wireHeader": "协议值（发送时的拼写）";
        readonly "levels.presets": "预设";
        readonly "levels.preset.deepseek": "DeepSeek";
        readonly "levels.preset.openai": "OpenAI";
        readonly "levels.preset.grok": "Grok";
        readonly "levels.placeholder": "发送的字符串";
        readonly "levels.offPlaceholder": "none 或留空";
        readonly "levels.unavailable": "不提供";
        readonly "levels.offHint": "留空表示「支持但不发送参数」";
        readonly "input.legend": "输入能力";
        readonly "input.text": "文本";
        readonly "input.image": "图片";
        readonly "input.note": "这是对端点的断言，不是检查；端点不接受的输入会被提供方拒绝。两个都不勾选则省略该字段，沿用目录。";
        readonly "preview.title": "最终效果";
        readonly "preview.map": "模型菜单将提供：{levels}";
        readonly "preview.mapOffNothing": "（Off 不发送参数）";
        readonly "preview.false": "模型菜单不提供思考档位（非推理模型）。";
        readonly "preview.inherit": "未声明档位；模型菜单是否提供取决于内置目录，本页无法确定。";
        readonly "preview.inputText": "输入能力：{modalities}";
        readonly "preview.inputInherit": "输入能力：未声明，沿用目录";
        readonly "save.saved": "已保存到 settings.yaml";
        readonly "save.partial": "已保存 {done} 个模型，{failed} 个失败：{detail}";
        readonly "save.conflict": "设置已在其他位置更新，已重新读取最新值，请确认后再次保存";
        readonly "save.nothing": "没有需要保存的修改";
        readonly "save.removed": "模型列表已被移除，请刷新页面";
        readonly "export.done": "已生成导出内容";
        readonly "export.copy": "复制";
        readonly "export.copied": "已复制到剪贴板";
        readonly "export.copyFailed": "复制失败，请手动选择文本";
        readonly "import.applied": "已应用 {count} 个模型的配置到草稿，请确认后保存";
        readonly "import.noneMatched": "导入内容与当前提供方/模型没有匹配项";
        readonly "error.needLevel": "请至少启用一个档位，或改成「非推理」。";
        readonly "error.needWire": "{level} 的协议值不能为空（只有 Off 可以留空）。";
        readonly "error.offOnly": "只声明 Off 是无效配置；请添加一个 Off 之外的档位，或改成「非推理」。";
        readonly "error.importJson": "导入内容不是合法的 JSON。";
        readonly "error.importShape": "导入内容的形状不符合预期。";
        readonly "error.importFormat": "导入内容格式不匹配（期望 {format}）。";
        readonly "error.importEmpty": "导入内容没有包含任何模型。";
        readonly "error.modelMissing": "{model} 已不在当前配置中。";
    };
    readonly en: Record<"section.label" | "page.title" | "page.intro" | "page.help.edit" | "page.help.use" | "page.help.wire" | "page.version" | "page.build" | "page.loading" | "page.retry" | "page.readonly" | "page.empty" | "page.error.namespace" | "page.error.channel" | "toolbar.search" | "toolbar.searchClear" | "toolbar.expandAll" | "toolbar.collapseAll" | "toolbar.more" | "toolbar.moreWith" | "toolbar.dirtyCount" | "toolbar.saveProvider" | "toolbar.saveAll" | "toolbar.saving" | "toolbar.discard" | "toolbar.export" | "toolbar.import" | "toolbar.importPlaceholder" | "toolbar.importApply" | "toolbar.importCancel" | "filter.all" | "filter.configured" | "filter.unconfigured" | "filter.nonreasoning" | "filter.image" | "filter.dirty" | "provider.modelCount" | "provider.configuredCount" | "provider.expand" | "provider.collapse" | "model.id" | "model.currently" | "model.draft" | "model.modified" | "model.expand" | "model.collapse" | "model.reset" | "mode.legend" | "mode.inherit" | "mode.inheritHelp" | "mode.false" | "mode.falseHelp" | "mode.map" | "mode.mapHelp" | "levels.header" | "levels.wireHeader" | "levels.presets" | "levels.preset.deepseek" | "levels.preset.openai" | "levels.preset.grok" | "levels.placeholder" | "levels.offPlaceholder" | "levels.unavailable" | "levels.offHint" | "input.legend" | "input.text" | "input.image" | "input.note" | "preview.title" | "preview.map" | "preview.mapOffNothing" | "preview.false" | "preview.inherit" | "preview.inputText" | "preview.inputInherit" | "save.saved" | "save.partial" | "save.conflict" | "save.nothing" | "save.removed" | "export.done" | "export.copy" | "export.copied" | "export.copyFailed" | "import.applied" | "import.noneMatched" | "error.needLevel" | "error.needWire" | "error.offOnly" | "error.importJson" | "error.importShape" | "error.importFormat" | "error.importEmpty" | "error.modelMissing", string>;
};
/** Locale keys this page uses. */
export type CopyKey = keyof typeof zh;
/**
 * A translate function. Loosely keyed because several call sites compose keys
 * (`filter.${id}`), and a mistyped key already degrades safely: the platform
 * translator returns the key itself, and {@link fallbackTranslate} does too.
 */
export type Translate = (key: string, params?: Record<string, unknown>) => string;
/** Substitute `{name}` placeholders, mirroring the platform translator's convention. */
export declare function interpolate(template: string, params: Record<string, unknown> | undefined): string;
/**
 * Dictionary-backed translate used when the locale service is unavailable.
 * The page then renders in Chinese rather than showing raw keys, which keeps a
 * service-less DSH readable instead of broken.
 */
export declare function fallbackTranslate(key: string, params?: Record<string, unknown>): string;
export {};
