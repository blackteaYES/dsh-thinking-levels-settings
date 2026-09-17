window.__ModuleLoader__.load({
	id: "dsh-thinking-levels-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region src/client/settings-wire.ts
		/** Thrown by a failing settings call; carries a best-effort conflict signal. */
		var SettingsCallError = class extends Error {
			/** True when the Host reported a revision conflict (stale editor), not a plain failure. */
			conflict;
			constructor(message, conflict = false) {
				super(message);
				this.name = "SettingsCallError";
				this.conflict = conflict;
			}
		};
		/**
		* Candidate endpoint names, preference-ordered.
		*
		* Reads are probed broadly: a wrong-semantics read simply fails the namespace
		* shape check and moves on, so breadth costs nothing and buys reach across DSH
		* lines. **Writes are deliberately narrowed to the ops-taking endpoints**
		* (`mutate`). `update` / `replace` also live on the settings face but their
		* second argument is a whole *section patch*, not an ops list — calling one
		* with ops would silently write garbage keys into settings.yaml. A name whose
		* argument semantics this module cannot verify is a name it must not call.
		*/
		const READ_NAMES = [
			"describe",
			"getSettings",
			"get",
			"read"
		];
		const WRITE_NAMES = [
			"mutate",
			"mutateSettings",
			"applySettings"
		];
		/**
		* Candidate holder paths probed on each runtime surface, preference-ordered:
		* the current Remote face first, then the historical apiproxy faces. One list
		* covering every shape DSH has used so far is what lets this module name no
		* single one as canonical.
		*/
		const HOLDER_PATHS = [
			"remote.settings",
			"api.settings",
			"settings",
			"connection.api.settings",
			"root.remote.settings"
		];
		function isRecord$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/**
		* True when a value looks like a callable function. Class constructors are
		* rejected: they have a non-writable `prototype` and throw when called without
		* `new`, so a stray constructor in a surface must not be probed.
		*/
		function callable(value) {
			if (typeof value !== "function") return false;
			if (value.prototype === void 0) return true;
			try {
				return Object.getOwnPropertyDescriptor(value, "prototype")?.writable === true;
			} catch {
				return true;
			}
		}
		/** Read a dotted path without throwing: a missing segment, a non-object hop, or a throwing getter yields `undefined`. */
		function readPath(root, path) {
			let current = root;
			for (const segment of path) {
				if (!isRecord$1(current)) return void 0;
				try {
					current = current[segment];
				} catch {
					return;
				}
				if (current === void 0 || current === null) return void 0;
			}
			return current;
		}
		/**
		* Read a dotted holder path off a surface in every style a DSH runtime may
		* expose it: cordis `surface.get("a.b")` (the documented optional read), the
		* full dotted key as ONE bracket access (a real Context proxy answers
		* `ctx["remote.settings"]` but has no nested `ctx.remote` object), and a
		* stepwise property walk (plain holder objects, e.g. `connection.api`).
		*/
		function readHolder(surface, path) {
			try {
				const getter = surface.get;
				if (typeof getter === "function") {
					const viaGet = getter.call(surface, path);
					if (viaGet !== void 0 && viaGet !== null) return viaGet;
				}
			} catch {}
			try {
				const flat = surface[path];
				if (flat !== void 0 && flat !== null) return flat;
			} catch {}
			return readPath(surface, path.split("."));
		}
		/**
		* Normalize every response envelope DSH has used so far.
		*
		* Structural, not name-based, so neither the old `{result:{ok}}` wrapper nor a
		* plausible `{success,data}` shape can silently slip through as success:
		* - `{ok: true|false, value?, error?}` — the current RemoteResult.
		* - `{result: <envelope>}` — the rc.6 apiproxy wrapper.
		* - `{success: true|false, data|value|result, error|message}`.
		* - a bare namespace-bearing document, checked last so it cannot mask a failure.
		*/
		function normalizeEnvelope(response) {
			const unwrap = (value, depth) => {
				if (depth > 4 || !isRecord$1(value)) return void 0;
				if (value.ok === true) return {
					ok: true,
					value: value.value ?? value.data ?? value.result
				};
				if (value.ok === false) return failureOf(value);
				if (value.success === true) return {
					ok: true,
					value: value.data ?? value.value ?? value.result
				};
				if (value.success === false) return failureOf(value);
				if (value.result !== void 0) return unwrap(value.result, depth + 1);
			};
			const nested = unwrap(response, 0);
			if (nested !== void 0) return nested;
			if (isRecord$1(response) && (Array.isArray(response.namespaces) || typeof response.writable === "boolean" && response.namespaces === void 0)) return {
				ok: true,
				value: response
			};
			if (response === void 0 || response === null) return {
				ok: false,
				message: "设置调用没有返回结果",
				code: void 0
			};
			return {
				ok: false,
				message: "无法识别的设置响应格式",
				code: void 0
			};
		}
		function failureOf(envelope) {
			const err = envelope.error;
			return {
				ok: false,
				message: typeof err === "string" ? err : isRecord$1(err) && typeof err.message === "string" ? err.message : typeof envelope.message === "string" ? envelope.message : "设置调用失败",
				code: typeof envelope.code === "string" ? envelope.code : isRecord$1(err) && typeof err.code === "string" ? err.code : void 0
			};
		}
		/** Whether the Host signalled a stale-revision conflict rather than a plain failure. */
		function isConflict(code, message) {
			return `${code ?? ""} ${message}`.toLowerCase().includes("conflict") || `${code ?? ""} ${message}`.toLowerCase().includes("revision");
		}
		/**
		* Assembly-fault probe: did this call *shape* fail before reaching the Host?
		* Business failures (validation, conflicts) must never trigger a shape retry,
		* or a single user click could write twice. A message naming a wire parameter
		* counts as an assembly fault; a business validation error names the settings
		* field it rejected instead, so it never matches.
		*/
		function looksLikeAssemblyFault(error) {
			const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
			return /expected \d+ arguments|too few arguments|too many arguments|is not a function|undefined is not|cannot read propert|cannot set propert|cannot destructure|invalid argu|required argu|unexpected argu|unknown (method|endpoint|domain|namespace|path)|no (method|endpoint|namespace) (named|found)|is not a valid|missing required parameter/.test(message);
		}
		/** The first candidate endpoint name a holder actually owns. */
		function pickMethods(holder, source, names) {
			const picked = [];
			if (!isRecord$1(holder)) return picked;
			for (const name of names) {
				const fn = holder[name];
				if (callable(fn)) picked.push({
					source,
					name,
					fn
				});
			}
			return picked;
		}
		/** Collect every candidate endpoint across all surfaces and holder paths. */
		function collectCandidates(surfaces, paths, names) {
			const found = [];
			const seen = /* @__PURE__ */ new Set();
			for (const surface of surfaces) {
				if (!isRecord$1(surface)) continue;
				for (const path of paths) for (const candidate of pickMethods(readHolder(surface, path), path, names)) {
					const key = `${path}.${candidate.name}`;
					if (seen.has(key)) continue;
					seen.add(key);
					found.push(candidate);
				}
			}
			return found;
		}
		/** A gateway/business error's code field, if it carries one. */
		function errorCode(error) {
			if (!isRecord$1(error)) return void 0;
			const code = error.code;
			return typeof code === "string" ? code : void 0;
		}
		/**
		* A business failure that proves the Host **refused before executing**: the
		* request never parsed (bad request, unknown namespace, missing parameter).
		* Such a failure is shape-agnostic — the next argument shape must still be
		* tried, or an object-form legacy surface would look broken under the
		* positional-first order. A conflict or validation rejection is NOT this: the
		* call was understood and refused, so retrying another shape could double-write.
		*/
		function refusedBeforeExecution(code, message) {
			const text = `${code ?? ""} ${message}`.toLowerCase();
			return text.includes("bad-request") || text.includes("bad request") || text.includes("required") || text.includes("invalid argu") || text.includes("unknown namespace") || text.includes("no namespace") || text.includes("undefined");
		}
		/**
		* Call `build` (one call) and `validate` the result.
		*
		* @param build - constructs the call's argument list for a given candidate and
		*   shape index; shapes are tried in order, assembly faults moving to the next.
		* @param shapeRetryOn — when set for a write, a refused-before-execution failure
		*   also advances to the next shape (see {@link refusedBeforeExecution}).
		* @returns the accepted `{ candidate, value }` or the last business failure.
		*/
		async function attempt(candidates, build, shapeCount, validate, invalidMessage, shapeRetryOn) {
			let lastMessage;
			let lastCode;
			for (const candidate of candidates) {
				let executed = false;
				for (let shape = 0; shape < shapeCount; shape += 1) {
					if (executed) break;
					let value;
					try {
						value = await candidate.fn(...build(candidate, shape));
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error ?? "");
						if (!looksLikeAssemblyFault(error) && !(shapeRetryOn?.(errorCode(error), message) ?? false)) {
							lastMessage = message;
							executed = true;
							continue;
						}
						lastMessage = message;
						continue;
					}
					const envelope = normalizeEnvelope(value);
					if (envelope.ok !== true) {
						lastMessage = envelope.message;
						lastCode = envelope.code;
						executed = !(shapeRetryOn?.(envelope.code, envelope.message) ?? false);
						continue;
					}
					if (!validate(envelope.value)) {
						lastMessage ??= invalidMessage;
						continue;
					}
					return {
						ok: true,
						candidate,
						value: envelope.value
					};
				}
			}
			return {
				ok: false,
				message: lastMessage ?? invalidMessage,
				code: lastCode
			};
		}
		function isSettingsDocument(value) {
			return isRecord$1(value) && Array.isArray(value.namespaces);
		}
		/** Best-effort revision lookup, so a write still carries one if page state is stale. */
		function revisionOf$1(document, namespace) {
			if (!Array.isArray(document?.namespaces)) return void 0;
			for (const entry of document.namespaces) if (isRecord$1(entry) && entry.ns === namespace && typeof entry.revision === "number") return entry.revision;
		}
		/**
		* Probe the runtime for a working settings channel.
		*
		* @param surfaces - holder roots in preference order; the call site passes
		*   `ctx`, `ctx.connection`, `ctx.root`. Passing several is what frees this
		*   module from knowing which face DSH currently hangs the wire on.
		* @param extraPaths - additional holder paths appended to the built-in list.
		*/
		function resolveSettingsWire(surfaces, extraPaths = []) {
			const paths = [.../* @__PURE__ */ new Set([...HOLDER_PATHS, ...extraPaths])];
			let resolvedSource;
			let lastMessage = "当前 DSH 运行时没有暴露可读写的 settings 通道";
			const describe = async () => {
				const candidates = collectCandidates(surfaces, paths, READ_NAMES);
				if (candidates.length === 0) throw new SettingsCallError(lastMessage);
				const outcome = await attempt(candidates, (_candidate, shape) => shape === 0 ? [] : [{}], 2, isSettingsDocument, "settings describe 未返回命名空间列表");
				if (outcome.ok !== true) {
					lastMessage = outcome.message;
					throw new SettingsCallError(outcome.message, isConflict(outcome.code, outcome.message));
				}
				resolvedSource = `${outcome.candidate.source}.${outcome.candidate.name}`;
				return outcome.value;
			};
			const mutate = async (namespace, operations, expectedRevision) => {
				const document = await describe().catch(() => void 0);
				const revision = expectedRevision ?? revisionOf$1(document, namespace);
				const ops = operations.map((op) => isRecord$1(op) ? { ...op } : op);
				const candidates = collectCandidates(surfaces, paths, WRITE_NAMES);
				if (candidates.length === 0) throw new SettingsCallError("当前 settings 通道不支持写入");
				const shapes = [() => [
					namespace,
					ops,
					revision
				], () => [{
					ns: namespace,
					namespace,
					ops,
					operations: ops,
					expectedRevision: revision
				}]];
				const outcome = await attempt(candidates, (_candidate, shape) => shapes[shape](), shapes.length, (value) => true, "保存失败", refusedBeforeExecution);
				if (outcome.ok !== true) throw new SettingsCallError(outcome.message, isConflict(outcome.code, outcome.message));
				const record = isRecord$1(outcome.value) ? outcome.value : {};
				const namespaces = Array.isArray(record.namespaces) ? record.namespaces : [];
				return {
					writable: record.writable === true,
					revision: typeof record.revision === "number" ? record.revision : revision,
					namespaces
				};
			};
			return {
				source: () => resolvedSource,
				describe,
				mutate
			};
		}
		/**
		* Discover the thinking-level vocabulary from the namespace's serialized schema.
		*
		* DSH serializes schemastery schemas as a node tree whose union members may be
		* embedded nodes or numeric/string refs into a uid-keyed node table (the
		* `refs` shape). This walks that shape generically: find an object field named
		* `*effort*`, follow its value node through unions to a dict, and take the
		* dict's key-node union — a vocabulary is the union of >=2 distinct short
		* string consts. A future DSH that adds or renames a level therefore appears
		* in the UI without a plugin release; on any miss the caller falls back to the
		* built-in list, so discovery is an enhancement, never a contract.
		*/
		function levelVocabularyFromSchema(document, namespace) {
			if (!Array.isArray(document.namespaces)) return void 0;
			for (const entry of document.namespaces) {
				if (!isRecord$1(entry) || entry.ns !== namespace || !isRecord$1(entry.schema)) continue;
				const byUid = schemaNodeTable(entry.schema);
				for (const node of byUid.values()) {
					const fields = isRecord$1(node.dict) ? node.dict : isRecord$1(node.fields) ? node.fields : void 0;
					if (fields === void 0) continue;
					for (const key of Object.keys(fields)) {
						if (!key.toLowerCase().includes("effort")) continue;
						const vocabulary = vocabularyUnder(byUid, fields[key], 0);
						if (vocabulary !== void 0) return vocabulary;
					}
				}
			}
		}
		/** Every schema node reachable in a serialized schema, indexed by its uid (and refs-table keys). */
		function schemaNodeTable(schema) {
			const table = /* @__PURE__ */ new Map();
			const register = (value, key) => {
				if (!isRecord$1(value)) return;
				for (const id of [
					key,
					value.uid,
					value.id
				]) if (typeof id === "number" || typeof id === "string") table.set(String(id), value);
			};
			const visit = (value, depth) => {
				if (depth > 14) return;
				if (Array.isArray(value)) {
					for (const item of value) {
						register(item);
						visit(item, depth + 1);
					}
					return;
				}
				if (!isRecord$1(value)) return;
				for (const [key, child] of Object.entries(value)) {
					if (isRecord$1(child) && (key === "refs" || key === "nodes" || key === "table")) {
						for (const [refId, node] of Object.entries(child)) {
							register(node, refId);
							visit(node, depth + 1);
						}
						continue;
					}
					register(child);
					visit(child, depth + 1);
				}
			};
			register(schema);
			visit(schema, 0);
			return table;
		}
		/** Resolve one schema reference (a node object or a uid into the node table). */
		function resolveRef(table, ref) {
			if (isRecord$1(ref)) return ref;
			if (typeof ref === "number" || typeof ref === "string") return table.get(String(ref));
		}
		/** Walk field → union → dict → key union; return the first string-const vocabulary found. */
		function vocabularyUnder(table, ref, depth) {
			if (depth > 8) return void 0;
			const node = resolveRef(table, ref);
			if (node === void 0) return void 0;
			const direct = constStringsIn(table, node);
			if (direct !== void 0) return direct;
			if (Array.isArray(node.list)) {
				for (const member of node.list) {
					const found = vocabularyUnder(table, member, depth + 1);
					if (found !== void 0) return found;
				}
				return;
			}
			if (node.inner !== void 0 || node.sKey !== void 0 || node.key !== void 0) for (const bag of [node.sKey, node.key]) {
				const found = vocabularyUnder(table, bag, depth + 1);
				if (found !== void 0) return found;
			}
		}
		/** The node's own string-const vocabulary, when it *is* a union of >=2 distinct short consts. */
		function constStringsIn(table, node) {
			if (!Array.isArray(node.list) || node.list.length < 2) return void 0;
			const values = [];
			for (const member of node.list) {
				const resolved = resolveRef(table, member);
				if (resolved === void 0 || typeof resolved.value !== "string") return void 0;
				if (!values.includes(resolved.value)) values.push(resolved.value);
			}
			if (values.length < 2) return void 0;
			if (!values.every((value) => /^[a-z][a-z0-9_-]{0,15}$/.test(value))) return void 0;
			return values;
		}
		//#endregion
		//#region src/client/locale.ts
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
		const LOCALE_NS = "dsh-thinking-levels-settings";
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
			"error.modelMissing": "{model} 已不在当前配置中。"
		};
		/** The dictionary pair handed to `ctx.locale.register`. */
		const DICTIONARIES = {
			zh,
			en: {
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
				"error.modelMissing": "{model} is no longer in the current configuration."
			}
		};
		/** Substitute `{name}` placeholders, mirroring the platform translator's convention. */
		function interpolate(template, params) {
			if (params === void 0) return template;
			return template.replace(/\{(\w+)\}/g, (match, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
		}
		/**
		* Dictionary-backed translate used when the locale service is unavailable.
		* The page then renders in Chinese rather than showing raw keys, which keeps a
		* service-less DSH readable instead of broken.
		*/
		function fallbackTranslate(key, params) {
			return interpolate(zh[key] ?? key, params);
		}
		//#endregion
		//#region src/client/icons.ts
		/**
		* Inline line icons, drawn to match the platform's own set.
		*
		* The host's icons live in `@deepseek-ai/dsh-client-ui-primitives`, which this
		* plugin must not import: a platform package name is a version-pinned contract
		* and was exactly what broke this page once (see the header of ./index.ts, and
		* the build-time purity plugin in tsdown.config.ts that enforces it). So the
		* few glyphs this page needs are drawn here, copying the host's recipe —
		* `viewBox="0 0 16 16"`, `fill="none"`, `stroke="currentColor"` — rather than
		* substituting emoji, which would be colour, multi-platform-inconsistent, and
		* visually foreign next to the host's monochrome line set.
		*
		* Icons are decoration: every one of them is `aria-hidden`, and each sits beside
		* a text label that already carries the meaning.
		*/
		/** The host's icon geometry: a 16px box with a stroked outline. */
		const BOX = "0 0 16 16";
		/**
		* Shared `<svg>` builder, so every glyph carries identical attributes.
		*
		* Takes its parts as separate arguments rather than destructuring `props`:
		* `props` deliberately omits `children`, which leaves React's overloads unable
		* to infer the wrapper's element type.
		*/
		function svg(props, ...children) {
			return react.createElement("svg", {
				width: props.size ?? 16,
				height: props.size ?? 16,
				className: props.className,
				viewBox: BOX,
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				focusable: "false"
			}, ...children);
		}
		/** Stroke attributes shared by every path, matching the host's line weight. */
		const LINE = {
			stroke: "currentColor",
			strokeWidth: 1.2,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		};
		/** A layered "levels" glyph: three stacked bars of decreasing width. */
		function IconLevels(props) {
			return svg(props, react.createElement("path", {
				d: "M2.5 4.5h11",
				...LINE
			}), react.createElement("path", {
				d: "M2.5 8h7.5",
				...LINE
			}), react.createElement("path", {
				d: "M2.5 11.5h4.5",
				...LINE
			}));
		}
		/** A branch/decision glyph, for the reasoning mode. */
		function IconMode(props) {
			return svg(props, react.createElement("path", {
				d: "M8 2.5v3",
				...LINE
			}), react.createElement("path", {
				d: "M4 5.5h8",
				...LINE
			}), react.createElement("path", {
				d: "M4 5.5v2.2M12 5.5v2.2",
				...LINE
			}), react.createElement("circle", {
				cx: 4,
				cy: 10.4,
				r: 1.6,
				...LINE
			}), react.createElement("circle", {
				cx: 12,
				cy: 10.4,
				r: 1.6,
				...LINE
			}));
		}
		/** A picture glyph, for the image-input badge. */
		function IconImage(props) {
			return svg(props, react.createElement("rect", {
				x: 2,
				y: 3,
				width: 12,
				height: 10,
				rx: 1.6,
				...LINE
			}), react.createElement("circle", {
				cx: 5.8,
				cy: 6.4,
				r: 1,
				...LINE
			}), react.createElement("path", {
				d: "M2.4 11.4l3.1-2.6 2.4 2 2.1-1.8 3.6 3",
				...LINE
			}));
		}
		/** A text/document glyph, for the text-input badge. */
		function IconText(props) {
			return svg(props, react.createElement("path", {
				d: "M3.5 3.5h9",
				...LINE
			}), react.createElement("path", {
				d: "M3.5 6.5h9",
				...LINE
			}), react.createElement("path", {
				d: "M3.5 9.5h6",
				...LINE
			}));
		}
		/** A slashed circle, for "not reasoning". */
		function IconNoReasoning(props) {
			return svg(props, react.createElement("circle", {
				cx: 8,
				cy: 8,
				r: 5.6,
				...LINE
			}), react.createElement("path", {
				d: "M4.4 4.4l7.2 7.2",
				...LINE
			}));
		}
		/** A dotted circle, for "decided by the installed catalog". */
		function IconInherit(props) {
			return svg(props, react.createElement("circle", {
				cx: 8,
				cy: 8,
				r: 5.6,
				...LINE,
				strokeDasharray: "2.2 2"
			}), react.createElement("path", {
				d: "M8 5.4v5.2",
				...LINE
			}));
		}
		/** A right-pointing chevron; the CSS rotates it when a row is open. */
		function IconChevron(props) {
			return svg(props, react.createElement("path", {
				d: "M6.5 3.5L10.5 8l-4 4.5",
				...LINE
			}));
		}
		/** A magnifier, for the search field. */
		function IconSearch(props) {
			return svg(props, react.createElement("circle", {
				cx: 7.2,
				cy: 7.2,
				r: 4.4,
				...LINE
			}), react.createElement("path", {
				d: "M10.6 10.6l2.6 2.6",
				...LINE
			}));
		}
		/** A check, for the save action. */
		function IconSave(props) {
			return svg(props, react.createElement("path", {
				d: "M3.5 8.4l3 3 6-6.8",
				...LINE
			}));
		}
		/** A counter-clockwise arrow, for discarding drafts. */
		function IconDiscard(props) {
			return svg(props, react.createElement("path", {
				d: "M3 6.2h6.2a3.4 3.4 0 0 1 0 6.8H5.2",
				...LINE
			}), react.createElement("path", {
				d: "M5.2 3.4L2.6 6.2l2.6 2.6",
				...LINE
			}));
		}
		/** Chevrons pointing apart, for "expand all". */
		function IconExpandAll(props) {
			return svg(props, react.createElement("path", {
				d: "M8 6.4L5.6 4M8 6.4L10.4 4",
				...LINE
			}), react.createElement("path", {
				d: "M8 9.6l-2.4 2.4M8 9.6l2.4 2.4",
				...LINE
			}));
		}
		/** Chevrons pointing together, for "collapse all". */
		function IconCollapseAll(props) {
			return svg(props, react.createElement("path", {
				d: "M5.6 2.6L8 5l2.4-2.4",
				...LINE
			}), react.createElement("path", {
				d: "M5.6 13.4L8 11l2.4 2.4",
				...LINE
			}), react.createElement("path", {
				d: "M2.5 8h11",
				...LINE
			}));
		}
		/** A down arrow into a tray, for export. */
		function IconDownload(props) {
			return svg(props, react.createElement("path", {
				d: "M8 2.6v7.2",
				...LINE
			}), react.createElement("path", {
				d: "M5 7l3 3 3-3",
				...LINE
			}), react.createElement("path", {
				d: "M3 13.2h10",
				...LINE
			}));
		}
		/** An up arrow out of a tray, for import. */
		function IconUpload(props) {
			return svg(props, react.createElement("path", {
				d: "M8 10.4V3.2",
				...LINE
			}), react.createElement("path", {
				d: "M5 6.2l3-3 3 3",
				...LINE
			}), react.createElement("path", {
				d: "M3 13.2h10",
				...LINE
			}));
		}
		/** A tick, for the chosen entry in a menu of choices. */
		function IconCheck(props) {
			return svg(props, react.createElement("path", {
				d: "M3.4 8.4l2.7 2.7 6.5-6.6",
				...LINE
			}));
		}
		/** A downward chevron, for an overflow-menu trigger. */
		function IconCaretDown(props) {
			return svg(props, react.createElement("path", {
				d: "M3.5 6l4.5 4.5L12.5 6",
				...LINE
			}));
		}
		/** A pencil dot, for unsaved changes. */
		function IconDirty(props) {
			return svg(props, react.createElement("circle", {
				cx: 8,
				cy: 8,
				r: 3.2,
				fill: "currentColor"
			}));
		}
		//#endregion
		//#region src/client/menu.ts
		/**
		* A small overflow menu for actions and filters that are real but not needed
		* at all times.
		*
		* The toolbar shows what a user reaches for while editing; the rest lives here
		* so the frequent actions are not competing for attention with the occasional
		* ones. Items are ordinary buttons: the trigger advertises
		* `aria-haspopup`/`aria-expanded`, and an item that represents a choice carries
		* `role="menuitemradio"` with `aria-checked`, so the menu's state is announced
		* rather than only painted.
		*
		* The menu is called 「更多」 rather than named after any one of its contents,
		* because it holds two kinds of thing (extra filters, and JSON transfer). A
		* name like 「高级筛选」 would mislead about where import/export lives.
		*/
		/** Trigger button plus a popup list, dismissed by Escape or an outside click. */
		function OverflowMenu({ label, triggerIcon, active, items }) {
			const [open, setOpen] = react.useState(false);
			const root = react.useRef(null);
			react.useEffect(() => {
				if (!open) return void 0;
				const doc = typeof document === "undefined" ? void 0 : document;
				if (doc === void 0 || typeof doc.addEventListener !== "function") return void 0;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				const onPointerDown = (event) => {
					const node = root.current;
					const target = event.target;
					if (node !== null && target !== null && typeof node.contains === "function" && !node.contains(target)) setOpen(false);
				};
				doc.addEventListener("keydown", onKeyDown);
				doc.addEventListener("mousedown", onPointerDown);
				return () => {
					doc.removeEventListener("keydown", onKeyDown);
					doc.removeEventListener("mousedown", onPointerDown);
				};
			}, [open]);
			return react.createElement("span", {
				className: "tl-more",
				ref: root
			}, react.createElement("button", {
				type: "button",
				className: active === true ? "tl-secondary tl-more-trigger tl-more-active" : "tl-secondary tl-more-trigger",
				"aria-haspopup": "menu",
				"aria-expanded": open,
				"aria-label": label,
				onClick: () => setOpen(!open)
			}, triggerIcon, react.createElement("span", null, label), react.createElement(IconCaretDown, { size: 12 })), open ? react.createElement("div", {
				className: "tl-menu",
				role: "menu",
				"aria-label": label
			}, ...items.map((item) => react.createElement("button", {
				key: item.key,
				type: "button",
				role: item.selected === void 0 ? "menuitem" : "menuitemradio",
				...item.selected === void 0 ? {} : { "aria-checked": item.selected },
				className: [
					"tl-menu-item",
					item.selected === void 0 ? "" : "tl-menu-item-choice",
					item.selected === true ? "tl-menu-item-selected" : "",
					item.separatorBefore === true ? "tl-menu-item-sep" : ""
				].filter((name) => name.length > 0).join(" "),
				disabled: item.disabled === true,
				onClick: () => {
					setOpen(false);
					item.onSelect();
				}
			}, item.icon, react.createElement("span", { className: "tl-menu-label" }, item.label), react.createElement("span", {
				className: "tl-menu-check",
				"aria-hidden": "true"
			}, react.createElement(IconCheck, { size: 12 }))))) : null);
		}
		//#endregion
		//#region src/client/levels.ts
		/** Display spellings for the known levels; a future level falls back to a capitalized id. */
		const LEVEL_LABELS = {
			off: "Off",
			minimal: "Minimal",
			low: "Low",
			medium: "Medium",
			high: "High",
			xhigh: "XHigh",
			max: "Max"
		};
		/** Human-facing name of a level id. Level ids are vendor vocabulary, not UI copy, so they are not translated. */
		function levelLabel(id) {
			return LEVEL_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
		}
		/** Human-facing name of a modality id. */
		function modalityLabel(id) {
			return id.charAt(0).toUpperCase() + id.slice(1);
		}
		/** Settings namespace that owns the custom providers. */
		const NAMESPACE = "llm-pi-ai";
		/** Level vocabulary used when the settings schema carries no discoverable one. */
		const DEFAULT_LEVELS = [
			"off",
			"minimal",
			"low",
			"medium",
			"high",
			"xhigh",
			"max"
		];
		/** Request modalities an `input` declaration may name. */
		const MODALITIES = ["text", "image"];
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/** Structural clone of a JSON value; anything unrepresentable becomes `null`. */
		function cloneJson(value) {
			if (value === null || typeof value === "string" || typeof value === "boolean") return value;
			if (typeof value === "number") return Number.isFinite(value) ? value : null;
			if (Array.isArray(value)) return value.map((item) => cloneJson(item));
			if (!isRecord(value)) return null;
			const result = {};
			for (const key of Object.keys(value)) result[key] = cloneJson(value[key]);
			return result;
		}
		/** Project a stored `models[]` entry into its editable form. */
		function editFromModel(model, levels) {
			const raw = model.reasoningEfforts;
			const efforts = {};
			let mode = "inherit";
			if (raw === false) mode = "false";
			else if (isRecord(raw)) {
				mode = "map";
				for (const id of levels) {
					if (!Object.prototype.hasOwnProperty.call(raw, id)) continue;
					const wire = raw[id];
					if (wire === null) efforts[id] = "";
					else if (typeof wire === "string") efforts[id] = wire;
				}
			}
			const declared = Array.isArray(model.input) ? model.input : [];
			const kept = MODALITIES.filter((modality) => declared.includes(modality));
			return {
				mode,
				efforts,
				input: kept.length > 0 ? kept : void 0
			};
		}
		/** Apply a draft back onto a stored entry, preserving every field it does not own. */
		function applyEdit(model, edit, levels) {
			const cloned = cloneJson(model);
			const copy = isRecord(cloned) ? cloned : {};
			if (edit.mode === "inherit") delete copy.reasoningEfforts;
			else if (edit.mode === "false") copy.reasoningEfforts = false;
			else {
				const map = {};
				for (const id of levels) {
					if (!Object.prototype.hasOwnProperty.call(edit.efforts, id)) continue;
					const wire = edit.efforts[id].trim();
					if (id === "off" && wire.length === 0) map.off = null;
					else map[id] = wire;
				}
				copy.reasoningEfforts = map;
			}
			if (edit.input === void 0) delete copy.input;
			else copy.input = MODALITIES.filter((modality) => edit.input.includes(modality));
			return copy;
		}
		/** Canonical identity of a draft, used for dirty checking and per-provider diffing. */
		function editSignature(edit, levels) {
			const efforts = levels.filter((id) => Object.prototype.hasOwnProperty.call(edit.efforts, id)).map((id) => [id, edit.efforts[id]]);
			return JSON.stringify([
				edit.mode,
				efforts,
				edit.input ?? null
			]);
		}
		/**
		* Reject a draft the schema would refuse, before it reaches the wire. The
		* settings service validates before persisting (so a bad write can never land),
		* but catching it here keeps the diagnostics next to the field at fault.
		*/
		function validateEdit(edit, levels) {
			if (edit.mode !== "map") return void 0;
			const enabled = levels.filter((id) => Object.prototype.hasOwnProperty.call(edit.efforts, id));
			if (enabled.length === 0) return { code: "error.needLevel" };
			for (const id of enabled) {
				if (id === "off") continue;
				if (edit.efforts[id].trim().length === 0) return {
					code: "error.needWire",
					params: { level: id }
				};
			}
			if (!enabled.some((id) => id !== "off")) return { code: "error.offOnly" };
		}
		const PRESETS = [
			{
				id: "deepseek",
				efforts: {
					off: "none",
					high: "high",
					max: "max"
				}
			},
			{
				id: "openai",
				efforts: {
					off: "none",
					low: "low",
					medium: "medium",
					high: "high"
				}
			},
			{
				id: "grok",
				efforts: {
					low: "low",
					medium: "medium",
					high: "high"
				}
			}
		];
		/** Turn a preset into a full draft over the active vocabulary. */
		function presetEdit(preset, levels) {
			const efforts = {};
			for (const id of levels) if (Object.prototype.hasOwnProperty.call(preset.efforts, id)) efforts[id] = preset.efforts[id];
			return {
				mode: "map",
				efforts,
				input: void 0
			};
		}
		function summarize(edit, levels) {
			const enabled = levels.filter((id) => Object.prototype.hasOwnProperty.call(edit.efforts, id));
			return {
				mode: edit.mode,
				levels: enabled,
				thinking: enabled.filter((id) => id !== "off"),
				offSendsNothing: enabled.includes("off") && edit.efforts.off.trim().length === 0,
				modalities: edit.input ?? []
			};
		}
		/** Filters shown as always-visible chips. The rest are offered in 更多. */
		const QUICK_FILTERS = ["all", "image"];
		/** Filters offered inside the 更多 menu. */
		const EXTRA_FILTERS = [
			"configured",
			"unconfigured",
			"nonreasoning",
			"dirty"
		];
		/**
		* Filters read the **stored** declaration rather than the draft, so the chips
		* answer "what is configured" instead of drifting with unsaved typing. The
		* `dirty` chip is the one exception, being about the draft by definition.
		*/
		function matchesFilter(filter, facts) {
			switch (filter) {
				case "all": return true;
				case "configured": return facts.stored.mode !== "inherit" || facts.stored.input !== void 0;
				case "unconfigured": return facts.stored.mode === "inherit" && facts.stored.input === void 0;
				case "nonreasoning": return facts.stored.mode === "false";
				case "image": return (facts.stored.input ?? []).includes("image");
				case "dirty": return facts.dirty;
			}
		}
		/**
		* Pick the namespace to edit: an exact match first, otherwise one whose
		* section holds a `providers` map and whose schema carries a level vocabulary.
		* The shape scan is what survives a namespace rename.
		*/
		function pickNamespace(document, vocabulary) {
			const namespaces = Array.isArray(document.namespaces) ? document.namespaces : [];
			if (namespaces.some((item) => isRecord(item) && item.ns === "llm-pi-ai")) return NAMESPACE;
			for (const item of namespaces) {
				if (!isRecord(item) || typeof item.ns !== "string") continue;
				const bag = isRecord(item.user) ? item.user : isRecord(item.value) ? item.value : void 0;
				if (bag !== void 0 && isRecord(bag.providers) && vocabulary(item.ns) !== void 0) return item.ns;
			}
		}
		/** Namespace names present in a document, for diagnostics. */
		function namespaceNames(document) {
			return (Array.isArray(document.namespaces) ? document.namespaces : []).map((item) => isRecord(item) && typeof item.ns === "string" ? item.ns : "?");
		}
		/** Read the user layer of one namespace, which is the layer this page writes. */
		function userSection(document, namespace) {
			const view = (Array.isArray(document.namespaces) ? document.namespaces : []).find((item) => isRecord(item) && item.ns === namespace);
			return isRecord(view?.user) ? view.user : {};
		}
		/** Revision of one namespace, when the document reports one. */
		function revisionOf(document, namespace) {
			const view = (Array.isArray(document.namespaces) ? document.namespaces : []).find((item) => isRecord(item) && item.ns === namespace);
			return isRecord(view) && typeof view.revision === "number" ? view.revision : void 0;
		}
		/** Project the document's configured providers into page rows. */
		function providerEntries(document, namespace, levels) {
			const user = userSection(document, namespace);
			const configured = isRecord(user.providers) ? user.providers : {};
			const providers = [];
			for (const id of Object.keys(configured)) {
				const profile = configured[id];
				if (!isRecord(profile) || !Array.isArray(profile.models)) continue;
				const models = [];
				for (const entry of profile.models) {
					if (!isRecord(entry) || typeof entry.id !== "string" || entry.id.length === 0) continue;
					const raw = cloneJson(entry);
					const record = isRecord(raw) ? raw : {};
					models.push({
						id: entry.id,
						name: typeof entry.name === "string" && entry.name.length > 0 ? entry.name : entry.id,
						raw: record,
						stored: editFromModel(record, levels)
					});
				}
				if (models.length === 0) continue;
				providers.push({
					id,
					name: typeof profile.displayName === "string" && profile.displayName.length > 0 ? profile.displayName : id,
					api: typeof profile.api === "string" ? profile.api : "",
					models
				});
			}
			return providers;
		}
		/**
		* The **complete** `models` array of one provider, exactly as stored.
		*
		* Saving needs this rather than the page rows: {@link providerEntries} skips
		* entries it cannot render (a malformed row, a missing id), and rebuilding the
		* array from rows alone would silently drop them. Every entry is returned, and
		* only the ones with a draft are rewritten.
		*/
		function rawModelsArray(document, namespace, providerId) {
			const user = userSection(document, namespace);
			const profile = (isRecord(user.providers) ? user.providers : {})[providerId];
			return isRecord(profile) && Array.isArray(profile.models) ? [...profile.models] : void 0;
		}
		/** A stable key for one model row. */
		function modelKey(providerId, modelId) {
			return `${providerId}\u0000${modelId}`;
		}
		/** Interchange format identifier; a mismatched document is refused on import. */
		const EXPORT_FORMAT = "dsh-thinking-levels/v1";
		/**
		* Build the export document from the **drafts**, so what is exported is what
		* the page currently shows — including edits that have not been saved yet.
		*/
		function buildExport(providers, editOf, levels) {
			const out = {
				format: EXPORT_FORMAT,
				providers: {}
			};
			for (const provider of providers) {
				const models = {};
				for (const model of provider.models) {
					const applied = applyEdit(model.raw, editOf(modelKey(provider.id, model.id)), levels);
					const entry = {};
					if (Object.prototype.hasOwnProperty.call(applied, "reasoningEfforts")) entry.reasoningEfforts = applied.reasoningEfforts;
					if (Object.prototype.hasOwnProperty.call(applied, "input")) entry.input = applied.input;
					models[model.id] = entry;
				}
				out.providers[provider.id] = models;
			}
			return out;
		}
		/**
		* Parse an exported document back into drafts. Import never writes: it
		* produces drafts for review, so a mistyped file cannot reach `settings.yaml`
		* unreviewed.
		*/
		function parseImport(text, levels) {
			let parsed;
			try {
				parsed = JSON.parse(text);
			} catch {
				return {
					ok: false,
					code: "error.importJson"
				};
			}
			if (!isRecord(parsed)) return {
				ok: false,
				code: "error.importShape"
			};
			if (parsed.format !== "dsh-thinking-levels/v1") return {
				ok: false,
				code: "error.importFormat",
				params: { format: EXPORT_FORMAT }
			};
			if (!isRecord(parsed.providers)) return {
				ok: false,
				code: "error.importShape"
			};
			const edits = /* @__PURE__ */ new Map();
			for (const [providerId, models] of Object.entries(parsed.providers)) {
				if (!isRecord(models)) return {
					ok: false,
					code: "error.importShape"
				};
				for (const [modelId, entry] of Object.entries(models)) {
					if (!isRecord(entry)) return {
						ok: false,
						code: "error.importShape"
					};
					const edit = editFromModel(entry, levels);
					const failure = validateEdit(edit, levels);
					if (failure !== void 0) return {
						ok: false,
						code: failure.code,
						params: {
							provider: providerId,
							model: modelId,
							...failure.params
						}
					};
					edits.set(modelKey(providerId, modelId), edit);
				}
			}
			if (edits.size === 0) return {
				ok: false,
				code: "error.importEmpty"
			};
			return {
				ok: true,
				edits
			};
		}
		//#endregion
		//#region src/client/model-form.ts
		/**
		* The expanded editor for one model: reasoning mode, per-level wire values and
		* input capabilities.
		*
		* The three reasoning modes are not a stylistic choice — they are the three
		* shapes `reasoningEfforts` accepts upstream:
		*
		*   inherit → the field is absent, so the installed catalog's capability stands
		*   false   → `reasoningEfforts: false`, a non-reasoning model
		*   map     → a non-empty level map; **at least one level beyond `off`** is
		*             required, which is why "off only" cannot be expressed and must be
		*             offered as `false` instead (`dsh-llm-pi-ai/lib/index.js:574`)
		*
		* Presenting modes rather than a bare checkbox set is what makes an illegal
		* combination unwritable, instead of merely rejected after the fact.
		*/
		/** Human-facing label key for each mode, paired with its explanatory help. */
		const MODES = [
			{
				mode: "inherit",
				label: "mode.inherit",
				help: "mode.inheritHelp"
			},
			{
				mode: "false",
				label: "mode.false",
				help: "mode.falseHelp"
			},
			{
				mode: "map",
				label: "mode.map",
				help: "mode.mapHelp"
			}
		];
		/** The expanded model editor. */
		function ModelForm({ edit, levels, disabled, onChange, t }) {
			const setMode = (mode) => {
				if (mode === "map") {
					const seeded = Object.keys(edit.efforts).length > 0 ? edit.efforts : presetEdit(PRESETS[0], levels).efforts;
					onChange({
						...edit,
						mode,
						efforts: seeded
					});
					return;
				}
				onChange({
					...edit,
					mode
				});
			};
			const toggleLevel = (id) => {
				const efforts = { ...edit.efforts };
				if (Object.prototype.hasOwnProperty.call(efforts, id)) delete efforts[id];
				else efforts[id] = id === "off" ? "" : id;
				onChange({
					...edit,
					efforts
				});
			};
			const setWire = (id, value) => {
				onChange({
					...edit,
					efforts: {
						...edit.efforts,
						[id]: value
					}
				});
			};
			const toggleModality = (id) => {
				const current = edit.input ?? [];
				const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
				const ordered = MODALITIES.filter((modality) => next.includes(modality));
				onChange({
					...edit,
					input: ordered.length > 0 ? ordered : void 0
				});
			};
			const summary = summarize(edit, levels);
			return react.createElement("div", { className: "tl-form" }, react.createElement("section", { className: "tl-section" }, react.createElement("h4", { className: "tl-section-title" }, react.createElement(IconMode, { size: 14 }), react.createElement("span", null, t("mode.legend"))), react.createElement("div", { className: "tl-modes" }, ...MODES.map(({ mode, label, help }) => react.createElement("label", {
				key: mode,
				className: "tl-mode"
			}, react.createElement("input", {
				type: "radio",
				name: "tl-reasoning-mode",
				checked: edit.mode === mode,
				disabled,
				onChange: () => setMode(mode)
			}), react.createElement("span", { className: "tl-mode-body" }, react.createElement("span", { className: "tl-mode-label" }, t(label)), react.createElement("span", { className: "tl-mode-help" }, t(help))))))), edit.mode === "map" ? react.createElement("section", { className: "tl-section" }, react.createElement("div", { className: "tl-section-head" }, react.createElement("h4", { className: "tl-section-title" }, react.createElement(IconLevels, { size: 14 }), react.createElement("span", null, t("levels.header"))), react.createElement("div", { className: "tl-presets" }, react.createElement("span", { className: "tl-presets-label" }, t("levels.presets")), ...PRESETS.map((preset) => react.createElement("button", {
				key: preset.id,
				type: "button",
				className: "tl-chip",
				disabled,
				onClick: () => onChange({
					...edit,
					mode: "map",
					efforts: presetEdit(preset, levels).efforts
				})
			}, t(`levels.preset.${preset.id}`))))), react.createElement("div", { className: "tl-levels-block" }, react.createElement("div", { className: "tl-levels-head" }, react.createElement("span", null, null), react.createElement("span", null, t("levels.header")), react.createElement("span", null, t("levels.wireHeader"))), react.createElement("div", { className: "tl-levels" }, ...levels.map((id) => {
				const checked = Object.prototype.hasOwnProperty.call(edit.efforts, id);
				const isOff = id === "off";
				return react.createElement("label", {
					key: id,
					className: checked ? "tl-level tl-level-on" : "tl-level"
				}, react.createElement("input", {
					type: "checkbox",
					checked,
					disabled,
					onChange: () => toggleLevel(id)
				}), react.createElement("span", { className: "tl-label" }, levelLabel(id)), checked ? react.createElement("input", {
					className: "tl-wire",
					value: edit.efforts[id] ?? "",
					disabled,
					placeholder: isOff ? t("levels.offPlaceholder") : t("levels.placeholder"),
					"aria-label": `${levelLabel(id)} ${t("levels.wireHeader")}`,
					onChange: (event) => setWire(id, event.target.value)
				}) : react.createElement("span", { className: "tl-unavailable" }, t("levels.unavailable")), checked && isOff ? react.createElement("span", { className: "tl-level-hint" }, t("levels.offHint")) : null);
			})))) : null, react.createElement("section", { className: "tl-section" }, react.createElement("h4", { className: "tl-section-title" }, react.createElement(IconText, { size: 14 }), react.createElement("span", null, t("input.legend"))), react.createElement("div", { className: "tl-modalities" }, ...MODALITIES.map((id) => react.createElement("label", {
				key: id,
				className: "tl-modality"
			}, react.createElement("input", {
				type: "checkbox",
				checked: (edit.input ?? []).includes(id),
				disabled,
				onChange: () => toggleModality(id)
			}), react.createElement("span", null, t(`input.${id}`))))), react.createElement("p", { className: "tl-note" }, t("input.note"))), react.createElement("div", { className: "tl-preview" }, react.createElement("div", { className: "tl-preview-title" }, t("preview.title")), react.createElement("div", { className: "tl-preview-body" }, renderPreview(summary, t))));
		}
		/**
		* Preview the effective result. It describes **what this page declares** and
		* says so when that is not the whole story: the installed catalog can also
		* grant a model reasoning levels, and that catalog is not readable from a
		* settings page, so claiming otherwise would be a lie (see `preview.inherit`).
		*/
		function renderPreview(summary, t) {
			if (summary.mode === "inherit") return react.createElement("span", { className: "tl-preview-inherit" }, t("preview.inherit"));
			const thinking = summary.thinking.map((id) => levelLabel(id)).join(" · ");
			const levels = summary.mode === "false" ? "" : thinking;
			return react.createElement(react.Fragment, null, react.createElement("div", null, summary.mode === "false" ? t("preview.false") : t("preview.map", { levels }) + (summary.offSendsNothing && summary.levels.includes("off") ? t("preview.mapOffNothing") : "")), react.createElement("div", { className: "tl-preview-input" }, summary.modalities.length > 0 ? t("preview.inputText", { modalities: summary.modalities.map((id) => modalityLabel(id)).join(" · ") }) : t("preview.inputInherit")));
		}
		//#endregion
		//#region src/client/provider-group.ts
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
		/** Longest level chain a collapsed row renders before it is elided. */
		const MAX_SUMMARY_LEVELS = 4;
		/** Stable row key for one provider/model pair. */
		function keyOf(providerId, modelId) {
			return `${providerId}\u0000${modelId}`;
		}
		/** One provider and its models. */
		function ProviderGroup(props) {
			const { provider, levels, visibleModelIds, open, onToggleProvider, openModels, onToggleModel, editOf, onChange, dirtyKeys, disabled, t } = props;
			const models = provider.models.filter((model) => visibleModelIds.has(model.id));
			const configured = provider.models.filter((model) => {
				const edit = editOf(keyOf(provider.id, model.id));
				return edit.mode !== "inherit" || edit.input !== void 0;
			}).length;
			return react.createElement("section", { className: "tl-provider" }, react.createElement("h3", { className: "tl-provider-head" }, react.createElement("button", {
				type: "button",
				className: "tl-toggle",
				"aria-expanded": open,
				"aria-label": t(open ? "provider.collapse" : "provider.expand"),
				onClick: onToggleProvider
			}, react.createElement("span", { className: open ? "tl-chevron tl-chevron-open" : "tl-chevron" }, react.createElement(IconChevron, { size: 12 }))), react.createElement("span", { className: "tl-provider-name" }, provider.name), react.createElement("span", { className: "tl-provider-meta" }, provider.id + (provider.api ? ` · ${provider.api}` : "")), react.createElement("span", { className: "tl-provider-counts" }, t("provider.configuredCount", {
				done: configured,
				total: provider.models.length
			}))), open ? react.createElement("div", { className: "tl-models" }, ...models.map((model) => {
				const key = keyOf(provider.id, model.id);
				const edit = editOf(key);
				return react.createElement(ModelRow, {
					key,
					model,
					edit,
					levels,
					expanded: openModels.has(key),
					dirty: dirtyKeys.has(key),
					disabled,
					onToggle: () => onToggleModel(key),
					onChange: (next) => onChange(key, next),
					t
				});
			})) : null);
		}
		/** One model: a single dense line that expands into the full editor.
		*
		* Collapsed, a row is one line — name, current state, badges — so a screen
		* fits a dozen models. It deliberately keeps the state inline instead of on a
		* second line: the earlier card layout spent two lines of vertical space per
		* model restating what one line can carry, which is what made the list read as
		* both dense and wasteful at once.
		*/
		function ModelRow(props) {
			const { model, edit, levels, expanded, dirty, disabled, onToggle, onChange, t } = props;
			const summary = summarize(edit, levels);
			return react.createElement("article", { className: expanded ? "tl-model tl-model-open" : "tl-model" }, react.createElement("header", { className: "tl-model-head" }, react.createElement("button", {
				type: "button",
				className: "tl-toggle",
				"aria-expanded": expanded,
				"aria-label": t(expanded ? "model.collapse" : "model.expand", { name: model.name }),
				onClick: onToggle
			}, react.createElement("span", { className: expanded ? "tl-chevron tl-chevron-open" : "tl-chevron" }, react.createElement(IconChevron, { size: 12 }))), react.createElement("span", { className: "tl-model-title" }, react.createElement("span", { className: "tl-model-name" }, model.name), model.name !== model.id ? react.createElement("span", { className: "tl-model-id" }, model.id) : null), react.createElement("span", {
				className: "tl-summary",
				title: t(dirty ? "model.draft" : "model.currently", { summary: fullSummary(summary, t) })
			}, summaryText(summary, t)), react.createElement("span", { className: "tl-badges" }, ...renderBadges(summary, t), dirty ? react.createElement("span", {
				className: "tl-badge tl-badge-dirty",
				title: t("model.modified")
			}, react.createElement(IconDirty, { size: 12 })) : null)), expanded ? react.createElement("div", { className: "tl-model-body" }, react.createElement(ModelForm, {
				edit,
				levels,
				disabled,
				onChange,
				t
			}), dirty ? react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				disabled,
				onClick: () => onChange(editFromModel(model.raw, levels))
			}, t("model.reset")) : null) : null);
		}
		/** Modality badges plus a state badge, so a collapsed row still answers "what is this?". */
		function renderBadges(summary, t) {
			const badges = [];
			for (const modality of summary.modalities) badges.push(react.createElement("span", {
				key: modality,
				className: "tl-badge tl-badge-modality"
			}, modality === "image" ? react.createElement(IconImage, { size: 12 }) : react.createElement(IconText, { size: 12 }), react.createElement("span", null, modalityLabel(modality))));
			if (summary.mode === "false") badges.push(react.createElement("span", {
				key: "none",
				className: "tl-badge"
			}, react.createElement(IconNoReasoning, { size: 12 }), react.createElement("span", null, t("filter.nonreasoning"))));
			else if (summary.mode === "inherit") badges.push(react.createElement("span", {
				key: "inherit",
				className: "tl-badge tl-badge-muted"
			}, react.createElement(IconInherit, { size: 12 }), react.createElement("span", null, t("filter.unconfigured"))));
			return badges;
		}
		/** Compress the level chain so a seven-level model does not overflow the row. */
		function summaryText(summary, t) {
			if (summary.mode === "inherit") return t("mode.inherit");
			if (summary.mode === "false") return t("mode.false");
			const labels = summary.levels.map((id) => levelLabel(id));
			if (labels.length === 0) return t("filter.unconfigured");
			if (labels.length <= MAX_SUMMARY_LEVELS) return labels.join(" · ");
			return [
				...labels.slice(0, 2),
				"…",
				labels[labels.length - 1]
			].join(" · ");
		}
		/** The untruncated state text, used for the row's hover title. */
		function fullSummary(summary, t) {
			if (summary.mode === "inherit") return t("mode.inherit");
			if (summary.mode === "false") return t("mode.false");
			const labels = summary.levels.map((id) => levelLabel(id));
			return labels.length === 0 ? t("filter.unconfigured") : labels.join(" · ");
		}
		//#endregion
		//#region src/client/index.ts
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
		/** The running build's version, or undefined when the define did not apply. */
		function pluginVersion() {
			try {
				return "3.0.0";
			} catch {
				return;
			}
		}
		/** Collapse state persistence key. */
		/**
		* Persisted expansion state. The `:v2` suffix is a semantics break, not a
		* cosmetic bump: v1 stored "is collapsed" for providers (which defaulted to
		* open), v2 stores "is opened" for both levels (providers now default to
		* collapsed, like rows). Reusing the v1 key would read old `false` — written
		* when "false" meant collapsed — as "not opened", and resurrect stale choices.
		*/
		const STORAGE_KEY = "dsh-thinking-levels-settings:collapsed:v2";
		/** Shared empty collapse state; never mutated, only replaced. */
		const EMPTY_COLLAPSE = {
			providers: {},
			models: {}
		};
		function readCollapse() {
			try {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				if (raw === null) return {
					providers: {},
					models: {}
				};
				const parsed = JSON.parse(raw);
				if (!isRecord(parsed)) return {
					providers: {},
					models: {}
				};
				return {
					providers: isRecord(parsed.providers) ? parsed.providers : {},
					models: isRecord(parsed.models) ? parsed.models : {}
				};
			} catch {
				return {
					providers: {},
					models: {}
				};
			}
		}
		function writeCollapse(state) {
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			} catch {}
		}
		/** The Settings page body registered into the `settings.section` slot. */
		function ThinkingLevelsSection({ wire, subscribe, t }) {
			const [state, setState] = react.useState(null);
			const [drafts, setDrafts] = react.useState(() => /* @__PURE__ */ new Map());
			const [status, setStatus] = react.useState("loading");
			const [error, setError] = react.useState(null);
			const [query, setQuery] = react.useState("");
			const [filter, setFilter] = react.useState("all");
			const [collapsed, setCollapsed] = react.useState(readCollapse);
			/**
			* Manual collapse overrides for the current search/filter session, layered
			* *above* the automatic "show me the matches" expansion. Values are the
			* effective ones (provider `true` = open, model `true` = expanded), not
			* inverted, so a row the user collapsed while filtering stays collapsed
			* instead of being yanked back open on the next render. Cleared whenever the
			* search text or filter changes, so a new query starts fresh.
			*/
			const [manual, setManual] = react.useState(() => EMPTY_COLLAPSE);
			const [notice, setNotice] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [importOpen, setImportOpen] = react.useState(false);
			const [importText, setImportText] = react.useState("");
			const [exported, setExported] = react.useState(null);
			const load = react.useCallback(async (silent = false) => {
				if (!silent) {
					setStatus("loading");
					setError(null);
				}
				try {
					const document = await wire.describe();
					const namespace = pickNamespace(document, (ns) => levelVocabularyFromSchema(document, ns));
					if (namespace === void 0) throw new Error(t("page.error.namespace", {
						expected: NAMESPACE,
						seen: namespaceNames(document).join("、") || "无"
					}));
					const levels = levelVocabularyFromSchema(document, namespace) ?? [...DEFAULT_LEVELS];
					const providers = providerEntries(document, namespace, levels);
					const stored = /* @__PURE__ */ new Map();
					for (const provider of providers) for (const model of provider.models) stored.set(modelKey(provider.id, model.id), model.stored);
					setState({
						namespace,
						writable: document.writable === true,
						revision: revisionOf(document, namespace),
						levels,
						providers,
						document,
						stored
					});
					setDrafts(/* @__PURE__ */ new Map());
					setStatus("ready");
				} catch (cause) {
					const detail = cause instanceof Error ? cause.message : String(cause);
					setError(detail + t("page.error.channel", { source: wire.source() ?? "?" }));
					setStatus("error");
				}
			}, [wire, t]);
			react.useEffect(() => {
				load();
			}, [load]);
			react.useEffect(() => subscribe(() => void load(true)), [subscribe, load]);
			react.useEffect(() => {
				setManual(EMPTY_COLLAPSE);
			}, [query, filter]);
			const rows = react.useMemo(() => {
				if (state === null) return [];
				const result = [];
				for (const provider of state.providers) for (const model of provider.models) {
					const key = modelKey(provider.id, model.id);
					const stored = state.stored.get(key) ?? editFromModel(model.raw, state.levels);
					const edit = drafts.get(key) ?? stored;
					result.push({
						key,
						providerId: provider.id,
						modelId: model.id,
						stored,
						edit,
						dirty: editSignature(edit, state.levels) !== editSignature(stored, state.levels)
					});
				}
				return result;
			}, [state, drafts]);
			const dirtyKeys = react.useMemo(() => new Set(rows.filter((row) => row.dirty).map((row) => row.key)), [rows]);
			const editOf = react.useCallback((key) => {
				const draft = drafts.get(key);
				if (draft !== void 0) return draft;
				const row = rows.find((item) => item.key === key);
				return row !== void 0 ? row.stored : {
					mode: "inherit",
					efforts: {},
					input: void 0
				};
			}, [drafts, rows]);
			const setEdit = react.useCallback((key, next) => {
				setDrafts((current) => {
					const map = new Map(current);
					map.set(key, next);
					return map;
				});
				setNotice(null);
			}, []);
			/**
			* Open/close one provider. Writes both layers: the durable flag in
			* `collapsed` (so the choice survives reloads) and an override in `manual`
			* (so the change is visible right now, even while a search or filter is
			* auto-opening the matching groups).
			*/
			const setProviderOpen = (providerId, open) => {
				setCollapsed((current) => {
					const next = {
						providers: { ...current.providers },
						models: current.models
					};
					next.providers[providerId] = open;
					writeCollapse(next);
					return next;
				});
				setManual((current) => {
					const next = {
						providers: { ...current.providers },
						models: current.models
					};
					next.providers[providerId] = open;
					return next;
				});
			};
			/**
			* Expand/collapse one model row. Same two-layer write as the provider
			* toggle; both levels persist "is opened".
			*/
			const setModelOpen = (key, open) => {
				setCollapsed((current) => {
					const next = {
						providers: current.providers,
						models: { ...current.models }
					};
					next.models[key] = open;
					writeCollapse(next);
					return next;
				});
				setManual((current) => {
					const next = {
						providers: current.providers,
						models: { ...current.models }
					};
					next.models[key] = open;
					return next;
				});
			};
			const setAllCollapsed = (providersOpen, modelsOpen) => {
				const providers = {};
				const models = {};
				for (const provider of state?.providers ?? []) {
					providers[provider.id] = providersOpen;
					for (const model of provider.models) models[modelKey(provider.id, model.id)] = modelsOpen;
				}
				const next = {
					providers,
					models
				};
				writeCollapse(next);
				setCollapsed(next);
				setManual({
					providers: { ...providers },
					models: { ...models }
				});
			};
			/** Validate every draft, returning the first failure with the row it belongs to. */
			const firstFailure = (keys) => {
				if (state === null) return void 0;
				for (const key of keys) {
					const failure = validateEdit(editOf(key), state.levels);
					if (failure !== void 0) return {
						key,
						failure
					};
				}
			};
			/**
			* Save the dirty rows of one provider, or of every provider when
			* `providerId` is undefined. One provider is one array write, so a provider
			* can never be saved halfway.
			*/
			const save = async (providerId) => {
				if (state === null) return;
				const targets = rows.filter((row) => row.dirty && (providerId === void 0 || row.providerId === providerId));
				if (targets.length === 0) {
					setNotice({
						type: "error",
						text: t("save.nothing")
					});
					return;
				}
				const failure = firstFailure(targets.map((row) => row.key));
				if (failure !== void 0) {
					setNotice({
						type: "error",
						text: failureMessage(failure.failure, t)
					});
					return;
				}
				setBusy(true);
				setNotice(null);
				const byProvider = /* @__PURE__ */ new Map();
				for (const row of targets) {
					const list = byProvider.get(row.providerId);
					if (list === void 0) byProvider.set(row.providerId, [row]);
					else list.push(row);
				}
				let saved = 0;
				const failures = [];
				let conflicted = false;
				for (const [id, group] of byProvider) {
					const array = rawModelsArray(state.document, state.namespace, id);
					if (array === void 0) {
						failures.push(`${id}: ${t("save.removed")}`);
						continue;
					}
					const wanted = new Map(group.map((row) => [row.modelId, row]));
					const models = array.map((entry) => {
						if (!isRecord(entry) || typeof entry.id !== "string") return cloneJson(entry);
						const row = wanted.get(entry.id);
						return row === void 0 ? cloneJson(entry) : applyEdit(entry, row.edit, state.levels);
					});
					try {
						await wire.mutate(state.namespace, [{
							op: "set",
							path: [
								"providers",
								id,
								"models"
							],
							value: models
						}], state.revision);
						saved += group.length;
					} catch (cause) {
						if (cause instanceof SettingsCallError && cause.conflict) {
							conflicted = true;
							failures.push(`${id}: ${t("save.conflict")}`);
						} else failures.push(`${id}: ${cause instanceof Error ? cause.message : String(cause)}`);
					}
				}
				setBusy(false);
				if (conflicted) {
					await load(true);
					setNotice({
						type: "error",
						text: t("save.conflict")
					});
					return;
				}
				if (failures.length === 0) {
					setNotice({
						type: "success",
						text: t("save.saved")
					});
					await load(true);
					return;
				}
				setNotice({
					type: "error",
					text: saved > 0 ? t("save.partial", {
						done: saved,
						failed: failures.length,
						detail: failures.join("; ")
					}) : failures.join("; ")
				});
				await load(true);
			};
			const exportJson = () => {
				if (state === null) return;
				const document = buildExport(state.providers, editOf, state.levels);
				setExported(JSON.stringify(document, null, 2));
				setNotice({
					type: "success",
					text: t("export.done")
				});
			};
			const copyExport = async () => {
				if (exported === null) return;
				try {
					await navigator.clipboard.writeText(exported);
					setNotice({
						type: "success",
						text: t("export.copied")
					});
				} catch {
					setNotice({
						type: "error",
						text: t("export.copyFailed")
					});
				}
			};
			const applyImport = () => {
				if (state === null) return;
				const outcome = parseImport(importText, state.levels);
				if (!outcome.ok) {
					setNotice({
						type: "error",
						text: t(outcome.code, outcome.params)
					});
					return;
				}
				const known = new Set(rows.map((row) => row.key));
				const matched = [...outcome.edits].filter(([key]) => known.has(key));
				setDrafts((current) => {
					const map = new Map(current);
					for (const [key, edit] of matched) map.set(key, edit);
					return map;
				});
				setImportOpen(false);
				setImportText("");
				if (matched.length === 0) setNotice({
					type: "error",
					text: t("import.noneMatched")
				});
				else setNotice({
					type: "success",
					text: t("import.applied", { count: matched.length })
				});
			};
			if (status === "loading") return react.createElement("p", { className: "tl-muted" }, t("page.loading"));
			if (status === "error") return react.createElement("div", { className: "tl-page" }, react.createElement("p", { className: "tl-error" }, error), react.createElement("button", {
				type: "button",
				className: "tl-primary",
				onClick: () => void load()
			}, t("page.retry")));
			if (state === null) return react.createElement(react.Fragment, null);
			const normalized = query.trim().toLowerCase();
			const searching = normalized.length > 0;
			const visible = rows.filter((row) => {
				const model = state.providers.find((item) => item.id === row.providerId)?.models.find((item) => item.id === row.modelId);
				return (!searching || row.modelId.toLowerCase().includes(normalized) || row.providerId.toLowerCase().includes(normalized) || model !== void 0 && model.name.toLowerCase().includes(normalized)) && matchesFilter(filter, {
					stored: row.stored,
					edit: row.edit,
					dirty: row.dirty
				});
			});
			const dirtyCount = dirtyKeys.size;
			const extraFilterActive = EXTRA_FILTERS.includes(filter);
			const moreLabel = extraFilterActive ? t("toolbar.moreWith", { name: t(`filter.${filter}`) }) : t("toolbar.more");
			const toolbar = react.createElement("div", { className: "tl-toolbar" }, react.createElement("div", { className: "tl-toolbar-row" }, react.createElement("span", { className: "tl-search-wrap" }, react.createElement(IconSearch, { size: 14 }), react.createElement("input", {
				className: "tl-search",
				type: "search",
				value: query,
				placeholder: t("toolbar.search"),
				"aria-label": t("toolbar.search"),
				onChange: (event) => setQuery(event.target.value)
			})), react.createElement("span", { className: "tl-toolbar-actions" }, dirtyCount > 0 ? react.createElement("span", { className: "tl-actions-pending" }, react.createElement("button", {
				type: "button",
				className: "tl-primary",
				disabled: busy || !state.writable,
				onClick: () => void save()
			}, react.createElement(IconSave, { size: 14 }), react.createElement("span", null, busy ? t("toolbar.saving") : t("toolbar.saveAll", { count: dirtyCount }))), react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				disabled: busy || !state.writable,
				onClick: () => {
					setDrafts(/* @__PURE__ */ new Map());
					setNotice(null);
				}
			}, react.createElement(IconDiscard, { size: 14 }), react.createElement("span", null, t("toolbar.discard"))), react.createElement("span", {
				className: "tl-sep",
				"aria-hidden": "true"
			})) : null, react.createElement(OverflowMenu, {
				label: moreLabel,
				triggerIcon: null,
				active: extraFilterActive,
				items: [
					...EXTRA_FILTERS.map((id) => ({
						key: `filter-${id}`,
						label: t(`filter.${id}`),
						selected: filter === id,
						onSelect: () => setFilter(id)
					})),
					{
						key: "export",
						label: t("toolbar.export"),
						icon: react.createElement(IconDownload, { size: 14 }),
						separatorBefore: true,
						onSelect: exportJson
					},
					{
						key: "import",
						label: t("toolbar.import"),
						icon: react.createElement(IconUpload, { size: 14 }),
						onSelect: () => {
							setImportOpen(true);
							setExported(null);
						}
					}
				]
			}))), react.createElement("div", { className: "tl-toolbar-row tl-toolbar-row-end" }, react.createElement("span", { className: "tl-chips" }, ...QUICK_FILTERS.map((id) => react.createElement("button", {
				key: id,
				type: "button",
				className: filter === id ? "tl-chip tl-chip-active" : "tl-chip",
				"aria-pressed": filter === id,
				onClick: () => setFilter(id)
			}, t(`filter.${id}`)))), react.createElement("span", { className: "tl-toolbar-end" }, react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				onClick: () => setAllCollapsed(true, false)
			}, react.createElement(IconExpandAll, { size: 14 }), react.createElement("span", null, t("toolbar.expandAll"))), react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				onClick: () => setAllCollapsed(false, false)
			}, react.createElement(IconCollapseAll, { size: 14 }), react.createElement("span", null, t("toolbar.collapseAll"))))), dirtyCount > 0 ? react.createElement("p", {
				className: "tl-dirty-note",
				role: "status",
				"aria-live": "polite"
			}, t("toolbar.dirtyCount", { count: dirtyCount })) : null);
			const narrowing = searching || filter !== "all";
			const visibleProviders = new Set(visible.map((row) => row.providerId));
			/** Effective expansion of one group: manual override, else auto, else stored. */
			const isProviderOpen = (providerId) => {
				const override = manual.providers[providerId];
				if (override !== void 0) return override;
				return narrowing ? true : collapsed.providers[providerId] === true;
			};
			/**
			* Effective expansion of one model row. Narrowing never expands a row: the
			* row already states its configuration on its single line, and opening its
			* editor is a deliberate click.
			*/
			const isModelOpen = (key) => {
				const override = manual.models[key];
				if (override !== void 0) return override;
				return collapsed.models[key] === true;
			};
			const body = state.providers.length === 0 ? react.createElement("p", { className: "tl-muted" }, t("page.empty")) : visible.length === 0 ? react.createElement("p", { className: "tl-muted" }, t("filter.all") + " · 0") : react.createElement(react.Fragment, null, ...state.providers.filter((provider) => visibleProviders.has(provider.id)).map((provider) => react.createElement(ProviderGroup, {
				key: provider.id,
				provider,
				levels: state.levels,
				visibleModelIds: new Set(visible.filter((row) => row.providerId === provider.id).map((row) => row.modelId)),
				open: isProviderOpen(provider.id),
				onToggleProvider: () => setProviderOpen(provider.id, !isProviderOpen(provider.id)),
				openModels: new Set(visible.filter((row) => row.providerId === provider.id).map((row) => row.key).filter(isModelOpen)),
				onToggleModel: (key) => setModelOpen(key, !isModelOpen(key)),
				editOf,
				onChange: setEdit,
				dirtyKeys,
				disabled: busy || !state.writable,
				t
			})));
			return react.createElement("div", { className: "tl-page" }, react.createElement("header", { className: "tl-intro" }, react.createElement("h2", { className: "tl-title" }, t("page.title")), react.createElement("p", { className: "tl-muted" }, t("page.intro")), react.createElement("ul", { className: "tl-help" }, react.createElement("li", null, t("page.help.edit")), react.createElement("li", null, t("page.help.use")), react.createElement("li", null, t("page.help.wire")))), !state.writable ? react.createElement("p", { className: "tl-note" }, t("page.readonly")) : null, toolbar, notice !== null ? react.createElement("p", { className: notice.type === "success" ? "tl-success" : "tl-error" }, notice.text) : null, importOpen ? react.createElement("div", { className: "tl-import" }, react.createElement("textarea", {
				className: "tl-import-text",
				value: importText,
				placeholder: t("toolbar.importPlaceholder"),
				"aria-label": t("toolbar.importPlaceholder"),
				onChange: (event) => setImportText(event.target.value)
			}), react.createElement("div", { className: "tl-toolbar-row" }, react.createElement("button", {
				type: "button",
				className: "tl-primary",
				onClick: applyImport
			}, t("toolbar.importApply")), react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				onClick: () => {
					setImportOpen(false);
					setImportText("");
				}
			}, t("toolbar.importCancel")))) : null, exported !== null ? react.createElement("div", { className: "tl-import" }, react.createElement("textarea", {
				className: "tl-import-text",
				value: exported,
				readOnly: true,
				"aria-label": t("toolbar.export")
			}), react.createElement("div", { className: "tl-toolbar-row" }, react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				onClick: () => void copyExport()
			}, t("export.copy")), react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				onClick: () => setExported(null)
			}, t("toolbar.importCancel")))) : null, body, react.createElement("footer", { className: "tl-footer" }, react.createElement("span", { className: "tl-version" }, t("page.version", { version: pluginVersion() ?? "dev" })), react.createElement("span", { className: "tl-build" }, t("page.build", {
				count: state.providers.length,
				levels: state.levels.length
			}))));
		}
		/** Render a validation failure in the active language. */
		function failureMessage(failure, t) {
			return t(failure.code, failure.params);
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
`;
		/**
		* Client plugin apply: register the settings.section contribution, cleaned up
		* on fiber unload.
		*/
		function apply(ctx) {
			const wire = resolveSettingsWire([ctx]);
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const listener of [...listeners]) listener();
			};
			const disposers = [];
			const keep = (value) => {
				if (typeof value === "function") disposers.push(value);
			};
			const localeHolder = () => {
				try {
					const service = typeof ctx.get === "function" ? ctx.get("locale") : void 0;
					return isRecord(service) || typeof service === "object" ? service : void 0;
				} catch {
					return;
				}
			};
			/** The platform translator for this namespace, unvalidated. */
			const platformCopy = () => {
				const service = localeHolder();
				if (service === void 0 || typeof service.bind !== "function") return void 0;
				try {
					return service.bind(LOCALE_NS);
				} catch {
					return;
				}
			};
			/**
			* The platform translator, but only once this namespace is actually readable.
			* The locale service answers a missing dictionary with the raw key, so
			* translating one known key is the only reliable readiness test; it also comes
			* out true when an identical copy of this page (a re-activation, or the old
			* bundle still resident) owns the registration instead of this instance.
			*/
			const READINESS_KEY = "section.label";
			const readyTranslator = () => {
				const fn = platformCopy();
				if (fn === void 0) return void 0;
				try {
					return fn(READINESS_KEY) === READINESS_KEY ? void 0 : fn;
				} catch {
					return;
				}
			};
			let registered = false;
			let subscribed = false;
			let announced = false;
			let pending = false;
			const ensureLocale = () => {
				const service = localeHolder();
				if (service === void 0) return;
				if (!registered && typeof service.register === "function") {
					registered = true;
					try {
						keep(service.register(LOCALE_NS, DICTIONARIES));
					} catch {}
				}
				if (registered && !subscribed) {
					subscribed = true;
					try {
						if (typeof service.subscribe === "function") keep(service.subscribe(notify));
						else if (typeof ctx.on === "function") keep(ctx.on("locale/change", notify));
					} catch {}
				}
				if (!announced && readyTranslator() !== void 0) {
					announced = true;
					notify();
				}
			};
			const translate = (key, params) => {
				const platform = readyTranslator();
				if (platform !== void 0) try {
					return platform(key, params);
				} catch {}
				if (!registered && !pending) {
					pending = true;
					queueMicrotask(() => {
						pending = false;
						ensureLocale();
					});
				}
				return fallbackTranslate(key, params);
			};
			ctx.effect(() => {
				if (typeof ctx.on !== "function") return;
				try {
					const off = ctx.on("internal/service", (name) => {
						if (name === "locale") ensureLocale();
					}, { global: true });
					return () => {
						try {
							off();
						} catch {}
					};
				} catch {}
			}, "thinking-levels: locale service arrival");
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "dsh-thinking-levels-settings";
				style.textContent = CSS;
				document.head.appendChild(style);
				ensureLocale();
				try {
					const remote = typeof ctx.get === "function" ? ctx.get("remote") : void 0;
					if (isRecord(remote) && typeof remote.$on === "function") keep(remote.$on("settings/document-updated", notify));
				} catch {}
				try {
					if (typeof ctx.on === "function") keep(ctx.on("connection/reset", notify));
				} catch {}
				const subscribe = (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				};
				const disposeSlot = ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "thinking-levels",
					order: 11,
					label: () => translate("section.label")
				}, () => react.createElement(ThinkingLevelsSection, {
					wire,
					subscribe,
					t: translate
				})));
				return () => {
					disposeSlot();
					for (const dispose of disposers.reverse()) try {
						dispose();
					} catch {}
					disposers.length = 0;
					listeners.clear();
					announced = false;
					style.remove();
				};
			}, "thinking-levels: settings section");
		}
		/** Hard service dependency: without the slot system there is nothing to register. Everything else is probed. */
		const inject = ["slots"];
		//#endregion
		exports.ThinkingLevelsSection = ThinkingLevelsSection;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map