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
		function revisionOf(document, namespace) {
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
				const revision = expectedRevision ?? revisionOf(document, namespace);
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
		//#region src/client/index.ts
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
		/** Settings namespace owning the custom providers. A rename is survived by the {@link pickNamespace} shape scan. */
		const NAMESPACE = "llm-pi-ai";
		/** Level vocabulary used when the settings schema does not carry a discoverable one. */
		const DEFAULT_LEVELS = [
			"off",
			"minimal",
			"low",
			"medium",
			"high",
			"xhigh",
			"max"
		];
		/** Display spellings for the known levels; anything future-facing falls back to a capitalized id. */
		const KNOWN_LABELS = {
			off: "Off",
			minimal: "Minimal",
			low: "Low",
			medium: "Medium",
			high: "High",
			xhigh: "XHigh",
			max: "Max"
		};
		/** One-click presets for the common vendor vocabularies; levels absent from the active vocabulary are dropped. */
		const PRESETS = [
			["DeepSeek", {
				off: "none",
				high: "high",
				max: "max"
			}],
			["OpenAI", {
				off: "none",
				low: "low",
				medium: "medium",
				high: "high"
			}],
			["Grok", {
				low: "low",
				medium: "medium",
				high: "high"
			}]
		];
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function cloneJson(value) {
			if (value === null || typeof value === "string" || typeof value === "boolean") return value;
			if (typeof value === "number") return Number.isFinite(value) ? value : null;
			if (Array.isArray(value)) return value.map((item) => cloneJson(item));
			if (!isRecord(value)) return null;
			const result = {};
			for (const key of Object.keys(value)) result[key] = cloneJson(value[key]);
			return result;
		}
		function levelLabel(id) {
			return KNOWN_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
		}
		/** Pick the namespace to edit: exact match first, else one whose schema carries a level vocabulary and a providers section. */
		function pickNamespace(document) {
			const namespaces = Array.isArray(document.namespaces) ? document.namespaces : [];
			if (namespaces.some((item) => isRecord(item) && item.ns === NAMESPACE)) return NAMESPACE;
			for (const item of namespaces) {
				if (!isRecord(item) || typeof item.ns !== "string") continue;
				const bag = isRecord(item.user) ? item.user : isRecord(item.value) ? item.value : void 0;
				if (bag !== void 0 && isRecord(bag.providers) && levelVocabularyFromSchema(document, item.ns) !== void 0) return item.ns;
			}
		}
		/** Normalize a model's reasoningEfforts into editable wire values, restricted to the active vocabulary. */
		function effortsOf(model, levels) {
			if (model.reasoningEfforts === false) return false;
			if (!isRecord(model.reasoningEfforts)) return null;
			const efforts = {};
			for (const id of levels) {
				if (!Object.prototype.hasOwnProperty.call(model.reasoningEfforts, id)) continue;
				const wire = model.reasoningEfforts[id];
				if (wire === null || typeof wire === "string") efforts[id] = wire;
			}
			return Object.keys(efforts).length > 0 ? efforts : null;
		}
		function modelView(model, levels) {
			if (!isRecord(model) || typeof model.id !== "string" || model.id.length === 0) return null;
			return {
				id: model.id,
				name: typeof model.name === "string" && model.name.length > 0 ? model.name : model.id,
				reasoningEfforts: effortsOf(model, levels)
			};
		}
		function pageState(document, namespace, levels) {
			const view = (Array.isArray(document.namespaces) ? document.namespaces : []).find((item) => isRecord(item) && item.ns === namespace);
			const user = isRecord(view?.user) ? view.user : {};
			const configuredProviders = isRecord(user.providers) ? user.providers : {};
			const providers = [];
			for (const id of Object.keys(configuredProviders)) {
				const profile = configuredProviders[id];
				if (!isRecord(profile) || !Array.isArray(profile.models)) continue;
				const models = profile.models.map((entry) => modelView(entry, levels)).filter((entry) => entry !== null);
				if (models.length === 0) continue;
				providers.push({
					id,
					name: typeof profile.displayName === "string" && profile.displayName.length > 0 ? profile.displayName : id,
					api: typeof profile.api === "string" ? profile.api : "",
					models
				});
			}
			return {
				namespace,
				writable: document.writable === true,
				revision: typeof view?.revision === "number" ? view.revision : void 0,
				levels,
				rawUser: user,
				providers
			};
		}
		/** Draft keyed by level id → wire value. */
		function draftOf(model, levels) {
			if (!isRecord(model.reasoningEfforts)) return {};
			const result = {};
			for (const id of levels) {
				if (!Object.prototype.hasOwnProperty.call(model.reasoningEfforts, id)) continue;
				const wire = model.reasoningEfforts[id];
				result[id] = wire === null ? "" : String(wire);
			}
			return result;
		}
		/** Serialize a draft back to the wire shape: `false` (thinking off) or a wire map. */
		function serializedEfforts(draft, levels) {
			if (Object.keys(draft).length === 0) return { value: false };
			const result = {};
			let hasThinking = false;
			for (const id of levels) {
				if (!Object.prototype.hasOwnProperty.call(draft, id)) continue;
				const wire = String(draft[id]).trim();
				if (id === "off" && wire.length === 0) {
					result.off = null;
					continue;
				}
				if (wire.length === 0) return { error: `${id} 的协议值不能为空` };
				result[id] = wire;
				if (id !== "off") hasThinking = true;
			}
			if (!hasThinking) return { error: "除 Off 外至少启用一个档位，或者选择“关闭思考”" };
			return { value: result };
		}
		function summaryOf(efforts, levels) {
			if (efforts === false) return "已关闭思考";
			if (!isRecord(efforts)) return "未配置（组装器不会显示思考档位）";
			const parts = [];
			for (const id of levels) {
				if (!Object.prototype.hasOwnProperty.call(efforts, id)) continue;
				const wire = efforts[id];
				parts.push(`${levelLabel(id)} -> ${wire === null ? "不发送参数" : String(wire)}`);
			}
			return parts.length > 0 ? parts.join("，") : "未配置";
		}
		/** The Settings page body registered into the `settings.section` slot. */
		function ThinkingLevelsSection({ wire, subscribe }) {
			const [state, setState] = react.useState(null);
			const [status, setStatus] = react.useState("loading");
			const [error, setError] = react.useState(null);
			const load = react.useCallback(async (silent = false) => {
				if (!silent) {
					setStatus("loading");
					setError(null);
				}
				try {
					const document = await wire.describe();
					const namespace = pickNamespace(document);
					if (namespace === void 0) {
						const seen = (Array.isArray(document.namespaces) ? document.namespaces : []).map((item) => isRecord(item) && typeof item.ns === "string" ? item.ns : "?").join("、") || "无";
						throw new Error(`未找到可编辑的提供方设置命名空间（期望 "${NAMESPACE}"，当前：${seen}）`);
					}
					const levels = levelVocabularyFromSchema(document, namespace) ?? [...DEFAULT_LEVELS];
					setState(pageState(document, namespace, levels));
					setStatus("ready");
				} catch (cause) {
					const detail = cause instanceof Error ? cause.message : String(cause);
					setError(`${detail}（settings 通道：${wire.source() ?? "未识别"}）`);
					setStatus("error");
				}
			}, [wire]);
			react.useEffect(() => {
				load();
			}, [load]);
			react.useEffect(() => subscribe(() => void load(true)), [subscribe, load]);
			if (status === "loading") return react.createElement("p", { className: "tl-muted" }, "正在读取自定义模型配置...");
			if (status === "error") return react.createElement("div", { className: "tl-page" }, react.createElement("p", { className: "tl-error" }, error), react.createElement("button", {
				type: "button",
				className: "tl-primary",
				onClick: () => void load()
			}, "重试"));
			if (!state) return react.createElement(react.Fragment, null);
			const intro = react.createElement("header", { className: "tl-intro" }, react.createElement("h2", { className: "tl-title" }, "思考级别"), react.createElement("p", { className: "tl-muted" }, "在这里配置每个自定义模型可以使用的思考档位。保存会直接写入 ~/.dsh/settings.yaml。"), react.createElement("ul", { className: "tl-help" }, react.createElement("li", null, "编辑和查看：设置 -> 思考级别（本页）。"), react.createElement("li", null, "实际选用：对话组装器左下角模型菜单。"), react.createElement("li", null, "openai-responses 会将右侧协议值发送为 reasoning.effort；Off 可填 none 或留空。")));
			let body;
			if (state.providers.length === 0) body = react.createElement("p", { className: "tl-muted" }, "没有发现自定义提供方模型。请先在 设置 -> 模型 中添加模型。");
			else body = react.createElement(react.Fragment, null, ...state.providers.map((provider) => react.createElement("section", {
				key: provider.id,
				className: "tl-provider"
			}, react.createElement("h3", { className: "tl-provider-title" }, provider.name, react.createElement("span", { className: "tl-provider-meta" }, provider.id + (provider.api ? ` · ${provider.api}` : ""))), ...provider.models.map((model) => react.createElement(ModelEditor, {
				key: `${provider.id}:${model.id}`,
				wire,
				state,
				provider,
				model,
				onSaved: () => void load(true)
			})))));
			return react.createElement("div", { className: "tl-page" }, intro, body);
		}
		function ModelEditor({ wire, state, provider, model, onSaved }) {
			const [draft, setDraft] = react.useState(() => draftOf(model, state.levels));
			const [busy, setBusy] = react.useState(false);
			const [notice, setNotice] = react.useState(null);
			react.useEffect(() => {
				setDraft(draftOf(model, state.levels));
				setNotice(null);
			}, [model.id, JSON.stringify(model.reasoningEfforts)]);
			const setWire = (id, value) => {
				setDraft((current) => Object.assign({}, current, { [id]: value }));
				setNotice(null);
			};
			const toggle = (id) => {
				setDraft((current) => {
					const next = Object.assign({}, current);
					if (Object.prototype.hasOwnProperty.call(next, id)) delete next[id];
					else next[id] = id === "off" ? "none" : id;
					return next;
				});
				setNotice(null);
			};
			const save = async (nextDraft) => {
				const prepared = serializedEfforts(nextDraft, state.levels);
				if (prepared && "error" in prepared) {
					setNotice({
						type: "error",
						text: prepared.error
					});
					return;
				}
				setBusy(true);
				setNotice(null);
				try {
					const profile = state.rawUser.providers?.[provider.id];
					if (!isRecord(profile) || !Array.isArray(profile.models)) throw new Error("模型列表已被移除，请刷新页面");
					const models = profile.models.map((entry) => {
						const copy = cloneJson(entry);
						if (isRecord(copy) && copy.id === model.id) copy.reasoningEfforts = prepared.value;
						return copy;
					});
					await wire.mutate(state.namespace, [{
						op: "set",
						path: [
							"providers",
							provider.id,
							"models"
						],
						value: models
					}], state.revision);
					setNotice({
						type: "success",
						text: "已保存到 settings.yaml"
					});
					onSaved();
				} catch (cause) {
					if (cause instanceof SettingsCallError && cause.conflict) {
						setNotice({
							type: "error",
							text: "设置已在其他位置更新，已重新读取最新值，请确认后再次保存"
						});
						onSaved();
					} else setNotice({
						type: "error",
						text: cause instanceof Error ? cause.message : String(cause)
					});
				} finally {
					setBusy(false);
				}
			};
			const applyPreset = (efforts) => {
				const next = {};
				for (const id of state.levels) if (Object.prototype.hasOwnProperty.call(efforts, id)) next[id] = efforts[id];
				setDraft(next);
				save(next);
			};
			return react.createElement("article", { className: "tl-model" }, react.createElement("header", { className: "tl-model-header" }, react.createElement("div", null, react.createElement("div", { className: "tl-model-name" }, model.name), model.name !== model.id ? react.createElement("div", { className: "tl-model-id" }, model.id) : null, react.createElement("div", { className: "tl-current" }, `当前配置：${summaryOf(model.reasoningEfforts, state.levels)}`)), react.createElement("div", { className: "tl-presets" }, ...PRESETS.map(([label, efforts]) => react.createElement("button", {
				key: label,
				type: "button",
				className: "tl-secondary",
				disabled: busy || !state.writable,
				onClick: () => applyPreset(efforts)
			}, label)), react.createElement("button", {
				type: "button",
				className: "tl-secondary",
				disabled: busy || !state.writable,
				onClick: () => {
					setDraft({});
					save({});
				}
			}, "关闭思考"))), react.createElement("div", { className: "tl-levels" }, ...state.levels.map((id) => {
				const checked = Object.prototype.hasOwnProperty.call(draft, id);
				return react.createElement("label", {
					key: id,
					className: checked ? "tl-level tl-level-on" : "tl-level"
				}, react.createElement("input", {
					type: "checkbox",
					checked,
					disabled: busy || !state.writable,
					onChange: () => toggle(id)
				}), react.createElement("span", { className: "tl-label" }, levelLabel(id)), checked ? react.createElement("input", {
					className: "tl-wire",
					value: typeof draft[id] === "string" ? draft[id] : "",
					disabled: busy || !state.writable,
					placeholder: id === "off" ? "none 或留空" : id,
					onChange: (event) => setWire(id, event.target.value)
				}) : react.createElement("span", { className: "tl-unavailable" }, "不提供"));
			})), react.createElement("footer", { className: "tl-model-footer" }, react.createElement("button", {
				type: "button",
				className: "tl-primary",
				disabled: busy || !state.writable,
				onClick: () => void save(draft)
			}, busy ? "保存中..." : "保存此模型"), notice ? react.createElement("span", { className: notice.type === "success" ? "tl-success" : "tl-error" }, notice.text) : null));
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
`;
		/** Client plugin apply: register the settings.section contribution, cleaned up on fiber unload. */
		function apply(ctx) {
			const wire = resolveSettingsWire([ctx]);
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "dsh-thinking-levels-settings";
				style.textContent = CSS;
				document.head.appendChild(style);
				const listeners = /* @__PURE__ */ new Set();
				const notify = () => {
					for (const listener of [...listeners]) listener();
				};
				const disposers = [];
				try {
					const remote = typeof ctx.get === "function" ? ctx.get("remote") : void 0;
					const remoteOn = isRecord(remote) && typeof remote.$on === "function" ? remote.$on : void 0;
					if (remoteOn !== void 0) {
						const dispose = remoteOn("settings/document-updated", notify);
						if (typeof dispose === "function") disposers.push(dispose);
					}
				} catch {}
				try {
					if (typeof ctx.on === "function") {
						const dispose = ctx.on("connection/reset", notify);
						if (typeof dispose === "function") disposers.push(dispose);
					}
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
					label: "思考级别"
				}, () => react.createElement(ThinkingLevelsSection, {
					wire,
					subscribe
				})));
				return () => {
					disposeSlot();
					for (const dispose of disposers.reverse()) try {
						dispose();
					} catch {}
					listeners.clear();
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