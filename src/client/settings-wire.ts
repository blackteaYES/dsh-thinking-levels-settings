/**
 * Version-tolerant settings wire for the thinking-levels page.
 *
 * Why this file exists: every previous breakage of this plugin was a *pinned*
 * platform contract — a package name in `dsh.client.inject`, one service key
 * (`ctx.connection.api`), one response envelope (`response.result.ok`). DSH
 * renamed all three within one minor line. Nothing here names a package, a
 * service key, or an envelope as canonical: capabilities are **probed at
 * runtime** across a preference-ordered set of candidate surfaces, and every
 * response is normalized through one structural reader. What stays pinned is
 * only this plugin's own domain data (the `llm-pi-ai` namespace shape), whose
 * format is stable by design.
 *
 * Contract tiers, in order of trustworthiness:
 *   1. Capability probing — a candidate is accepted only when calling it
 *      returns a namespace-bearing settings document. A wrong-shaped method
 *      cannot fake that result.
 *   2. Envelope normalization — `{ok, value|error}`, `{result: {…}}`,
 *      `{success, data|value|result, error|message}`, or the bare document.
 *      Covers the envelopes DSH has used so far without pinning any one.
 *   3. Argument-shape fallback — positional-first (current DSH), then the
 *      single-object form (the previous DSH), across every candidate method
 *      name. Retried **only** on an assembly fault (arity, unknown name,
 *      missing function) so a business failure can never cause a double write.
 *
 * Pure logic, no DOM: importable and unit-testable without a page.
 * @module dsh-thinking-levels-settings/client/settings-wire
 */

type Rec = Record<string, unknown>

/** Wire shape of one settings namespace, as carried by every envelope we normalize. */
export interface RawNamespace {
  ns?: unknown
  schema?: unknown
  value?: unknown
  base?: unknown
  user?: unknown
  applies?: unknown
  secrets?: unknown
  revision?: unknown
}

export interface RawSettingsDocument {
  writable?: unknown
  hasDocument?: unknown
  namespaces?: unknown
}

/** Thrown by a failing settings call; carries a best-effort conflict signal. */
export class SettingsCallError extends Error {
  /** True when the Host reported a revision conflict (stale editor), not a plain failure. */
  readonly conflict: boolean
  constructor(message: string, conflict = false) {
    super(message)
    this.name = "SettingsCallError"
    this.conflict = conflict
  }
}

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
const READ_NAMES = ["describe", "getSettings", "get", "read"] as const
const WRITE_NAMES = ["mutate", "mutateSettings", "applySettings"] as const

/**
 * Candidate holder paths probed on each runtime surface, preference-ordered:
 * the current Remote face first, then the historical apiproxy faces. One list
 * covering every shape DSH has used so far is what lets this module name no
 * single one as canonical.
 */
const HOLDER_PATHS = ["remote.settings", "api.settings", "settings", "connection.api.settings", "root.remote.settings"] as const

function isRecord(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * True when a value looks like a callable function. Class constructors are
 * rejected: they have a non-writable `prototype` and throw when called without
 * `new`, so a stray constructor in a surface must not be probed.
 */
function callable(value: unknown): value is (...args: unknown[]) => unknown {
  if (typeof value !== "function") return false
  const proto = (value as { prototype?: unknown }).prototype
  if (proto === void 0) return true // arrow or bound function — always callable
  try {
    // A plain function's `prototype` is writable; a class's is not.
    return Object.getOwnPropertyDescriptor(value, "prototype")?.writable === true
  } catch {
    return true
  }
}

/** Read a dotted path without throwing: a missing segment, a non-object hop, or a throwing getter yields `undefined`. */
function readPath(root: unknown, path: readonly string[]): unknown {
  let current = root
  for (const segment of path) {
    if (!isRecord(current)) return undefined
    try {
      current = (current as Rec)[segment]
    } catch {
      // A ctx proxy throwing for an undeclared service, or an uninitialized
      // lazy face, is simply a candidate that does not apply here.
      return undefined
    }
    if (current === undefined || current === null) return undefined
  }
  return current
}

/**
 * Read a dotted holder path off a surface in every style a DSH runtime may
 * expose it: cordis `surface.get("a.b")` (the documented optional read), the
 * full dotted key as ONE bracket access (a real Context proxy answers
 * `ctx["remote.settings"]` but has no nested `ctx.remote` object), and a
 * stepwise property walk (plain holder objects, e.g. `connection.api`).
 */
function readHolder(surface: Rec, path: string): unknown {
  try {
    const getter = (surface as Rec).get
    if (typeof getter === "function") {
      const viaGet = (getter as (key: string) => unknown).call(surface, path)
      if (viaGet !== undefined && viaGet !== null) return viaGet
    }
  } catch {
    /* a guarded ctx may throw for keys this fiber did not declare */
  }
  try {
    const flat = (surface as Rec)[path]
    if (flat !== undefined && flat !== null) return flat
  } catch {
    /* same */
  }
  return readPath(surface, path.split("."))
}

type Envelope = { ok: true; value: unknown } | { ok: false; message: string; code: string | undefined }

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
export function normalizeEnvelope(response: unknown): Envelope {
  const unwrap = (value: unknown, depth: number): Envelope | undefined => {
    if (depth > 4 || !isRecord(value)) return undefined
    if (value.ok === true) return { ok: true, value: value.value ?? value.data ?? value.result }
    if (value.ok === false) return failureOf(value)
    if (value.success === true) return { ok: true, value: value.data ?? value.value ?? value.result }
    if (value.success === false) return failureOf(value)
    if (value.result !== undefined) return unwrap(value.result, depth + 1)
    return undefined
  }
  const nested = unwrap(response, 0)
  if (nested !== undefined) return nested
  if (isRecord(response) && (Array.isArray(response.namespaces) || (typeof response.writable === "boolean" && response.namespaces === undefined))) {
    return { ok: true, value: response }
  }
  if (response === undefined || response === null) return { ok: false, message: "设置调用没有返回结果", code: undefined }
  return { ok: false, message: "无法识别的设置响应格式", code: undefined }
}

function failureOf(envelope: Rec): Extract<Envelope, { ok: false }> {
  const err = envelope.error
  const message =
    typeof err === "string" ? err
      : isRecord(err) && typeof err.message === "string" ? err.message
        : typeof envelope.message === "string" ? envelope.message
          : "设置调用失败"
  const code =
    typeof envelope.code === "string" ? envelope.code
      : isRecord(err) && typeof err.code === "string" ? err.code
        : undefined
  return { ok: false, message, code }
}

/** Whether the Host signalled a stale-revision conflict rather than a plain failure. */
function isConflict(code: string | undefined, message: string): boolean {
  return `${code ?? ""} ${message}`.toLowerCase().includes("conflict")
    || `${code ?? ""} ${message}`.toLowerCase().includes("revision")
}

/**
 * Assembly-fault probe: did this call *shape* fail before reaching the Host?
 * Business failures (validation, conflicts) must never trigger a shape retry,
 * or a single user click could write twice. A message naming a wire parameter
 * counts as an assembly fault; a business validation error names the settings
 * field it rejected instead, so it never matches.
 */
export function looksLikeAssemblyFault(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase()
  return /expected \d+ arguments|too few arguments|too many arguments|is not a function|undefined is not|cannot read propert|cannot set propert|cannot destructure|invalid argu|required argu|unexpected argu|unknown (method|endpoint|domain|namespace|path)|no (method|endpoint|namespace) (named|found)|is not a valid|missing required parameter/.test(message)
}

interface Candidate {
  /** Probed holder path, e.g. `remote.settings` — used for diagnostics. */
  source: string
  name: string
  fn: (...args: unknown[]) => unknown
}

/** The first candidate endpoint name a holder actually owns. */
function pickMethods(holder: unknown, source: string, names: readonly string[]): Candidate[] {
  const picked: Candidate[] = []
  if (!isRecord(holder)) return picked
  for (const name of names) {
    const fn = (holder as Rec)[name]
    if (callable(fn)) picked.push({ source, name, fn })
  }
  return picked
}

/** Collect every candidate endpoint across all surfaces and holder paths. */
function collectCandidates(surfaces: readonly unknown[], paths: readonly string[], names: readonly string[]): Candidate[] {
  const found: Candidate[] = []
  const seen = new Set<string>()
  for (const surface of surfaces) {
    if (!isRecord(surface)) continue
    for (const path of paths) {
      for (const candidate of pickMethods(readHolder(surface, path), path, names)) {
        const key = `${path}.${candidate.name}`
        if (seen.has(key)) continue
        seen.add(key)
        found.push(candidate)
      }
    }
  }
  return found
}

/** A gateway/business error's code field, if it carries one. */
function errorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined
  const code = (error as Rec).code
  return typeof code === "string" ? code : undefined
}

/**
 * A business failure that proves the Host **refused before executing**: the
 * request never parsed (bad request, unknown namespace, missing parameter).
 * Such a failure is shape-agnostic — the next argument shape must still be
 * tried, or an object-form legacy surface would look broken under the
 * positional-first order. A conflict or validation rejection is NOT this: the
 * call was understood and refused, so retrying another shape could double-write.
 */
function refusedBeforeExecution(code: string | undefined, message: string): boolean {
  const text = `${code ?? ""} ${message}`.toLowerCase()
  return text.includes("bad-request") || text.includes("bad request")
    || text.includes("required") || text.includes("invalid argu")
    || text.includes("unknown namespace") || text.includes("no namespace")
    || text.includes("undefined")
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
async function attempt<T>(
  candidates: readonly Candidate[],
  build: (candidate: Candidate, shape: number) => unknown[],
  shapeCount: number,
  validate: (value: unknown) => value is T,
  invalidMessage: string,
  shapeRetryOn?: (code: string | undefined, message: string) => boolean,
): Promise<{ ok: true; candidate: Candidate; value: T } | { ok: false; message: string; code?: string }> {
  let lastMessage: string | undefined
  let lastCode: string | undefined
  for (const candidate of candidates) {
    let executed = false
    for (let shape = 0; shape < shapeCount; shape += 1) {
      if (executed) break // the Host understood this candidate under some earlier shape
      let value: unknown
      try {
        value = await candidate.fn(...build(candidate, shape))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "")
        if (!looksLikeAssemblyFault(error) && !(shapeRetryOn?.(errorCode(error), message) ?? false)) {
          lastMessage = message
          executed = true // the call ran and threw business-side — stop reshaping
          continue
        }
        lastMessage = message
        continue // wrong shape for this candidate — try the next shape
      }
      const envelope = normalizeEnvelope(value)
      if (envelope.ok !== true) {
        lastMessage = envelope.message
        lastCode = envelope.code
        executed = !(shapeRetryOn?.(envelope.code, envelope.message) ?? false)
        continue
      }
      if (!validate(envelope.value)) {
        lastMessage ??= invalidMessage
        continue
      }
      return { ok: true, candidate, value: envelope.value }
    }
  }
  return { ok: false, message: lastMessage ?? invalidMessage, code: lastCode }
}

function isSettingsDocument(value: unknown): value is RawSettingsDocument {
  return isRecord(value) && Array.isArray((value as RawSettingsDocument).namespaces)
}

/** The document shape the page consumes; `undefined` namespaces never reach here. */
export interface WriteResult {
  writable: boolean
  revision: number | undefined
  namespaces: RawNamespace[]
}

/** A probed settings surface. */
export interface SettingsWire {
  /** `describe`-answering holder path once resolved, for the UI's diagnostic line. */
  source(): string | undefined
  describe(): Promise<RawSettingsDocument>
  mutate(namespace: string, operations: readonly unknown[], expectedRevision?: number): Promise<WriteResult>
}

/** Best-effort revision lookup, so a write still carries one if page state is stale. */
function revisionOf(document: RawSettingsDocument | undefined, namespace: string): number | undefined {
  if (!Array.isArray(document?.namespaces)) return undefined
  for (const entry of document.namespaces as RawNamespace[]) {
    if (isRecord(entry) && entry.ns === namespace && typeof entry.revision === "number") return entry.revision
  }
  return undefined
}

/**
 * Probe the runtime for a working settings channel.
 *
 * @param surfaces - holder roots in preference order; the call site passes
 *   `ctx`, `ctx.connection`, `ctx.root`. Passing several is what frees this
 *   module from knowing which face DSH currently hangs the wire on.
 * @param extraPaths - additional holder paths appended to the built-in list.
 */
export function resolveSettingsWire(surfaces: readonly unknown[], extraPaths: readonly string[] = []): SettingsWire {
  const paths = [...new Set([...HOLDER_PATHS, ...extraPaths])]
  let resolvedSource: string | undefined
  let lastMessage = "当前 DSH 运行时没有暴露可读写的 settings 通道"

  const describe = async (): Promise<RawSettingsDocument> => {
    const candidates = collectCandidates(surfaces, paths, READ_NAMES)
    if (candidates.length === 0) throw new SettingsCallError(lastMessage)
    // Shape 0 = no args (current DSH); shape 1 = an empty options object (an
    // older face that required a request parameter).
    const outcome = await attempt(
      candidates,
      (_candidate, shape) => (shape === 0 ? [] : [{}]),
      2,
      isSettingsDocument,
      "settings describe 未返回命名空间列表",
    )
    if (outcome.ok !== true) {
      lastMessage = outcome.message
      throw new SettingsCallError(outcome.message, isConflict(outcome.code, outcome.message))
    }
    resolvedSource = `${outcome.candidate.source}.${outcome.candidate.name}`
    return outcome.value
  }

  const mutate = async (namespace: string, operations: readonly unknown[], expectedRevision?: number): Promise<WriteResult> => {
    // Resolve the write surface through a describe: the holder that answered the
    // read is where the write lives, and revision falls back to the live value.
    const document = await describe().catch(() => undefined)
    const revision = expectedRevision ?? revisionOf(document, namespace)
    const ops = operations.map((op) => (isRecord(op) ? { ...op } : op))
    const candidates = collectCandidates(surfaces, paths, WRITE_NAMES)
    if (candidates.length === 0) throw new SettingsCallError("当前 settings 通道不支持写入")
    const shapes = [
      // Current DSH: mutate(ns, ops, expectedRevision)
      () => [namespace, ops, revision],
      // Previous DSH: mutate({ ns, ops, expectedRevision })
      () => [{ ns: namespace, namespace, ops, operations: ops, expectedRevision: revision }],
    ]
    const outcome = await attempt(
      candidates,
      (_candidate, shape) => shapes[shape](),
      shapes.length,
      // A success envelope is a completed write; every real settings endpoint
      // answers one with the namespace view, and requiring the view's shape
      // here would only re-introduce a pinned contract.
      (value: unknown): value is unknown => true,
      "保存失败",
      refusedBeforeExecution,
    )
    if (outcome.ok !== true) throw new SettingsCallError(outcome.message, isConflict(outcome.code, outcome.message))
    const record = (isRecord(outcome.value) ? outcome.value : {}) as Rec
    const namespaces = Array.isArray(record.namespaces) ? (record.namespaces as RawNamespace[]) : []
    return {
      writable: record.writable === true,
      revision: typeof record.revision === "number" ? record.revision : revision,
      namespaces,
    }
  }

  return { source: () => resolvedSource, describe, mutate }
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
export function levelVocabularyFromSchema(document: RawSettingsDocument, namespace: string): string[] | undefined {
  if (!Array.isArray(document.namespaces)) return undefined
  for (const entry of document.namespaces as RawNamespace[]) {
    if (!isRecord(entry) || entry.ns !== namespace || !isRecord(entry.schema)) continue
    const byUid = schemaNodeTable(entry.schema)
    for (const node of byUid.values()) {
      const fields = isRecord(node.dict) ? (node.dict as Rec) : isRecord(node.fields) ? (node.fields as Rec) : undefined
      if (fields === undefined) continue
      for (const key of Object.keys(fields)) {
        if (!key.toLowerCase().includes("effort")) continue
        const vocabulary = vocabularyUnder(byUid, fields[key], 0)
        if (vocabulary !== undefined) return vocabulary
      }
    }
  }
  return undefined
}

/** Every schema node reachable in a serialized schema, indexed by its uid (and refs-table keys). */
function schemaNodeTable(schema: Rec): Map<string, Rec> {
  const table = new Map<string, Rec>()
  const register = (value: unknown, key?: unknown): void => {
    if (!isRecord(value)) return
    // A node identifies itself with `uid`/`id`; a refs-table entry also knows
    // the lookup key its parent points it by.
    for (const id of [key, value.uid, value.id]) {
      if (typeof id === "number" || typeof id === "string") table.set(String(id), value)
    }
  }
  const visit = (value: unknown, depth: number): void => {
    if (depth > 14) return
    if (Array.isArray(value)) {
      for (const item of value) {
        register(item)
        visit(item, depth + 1)
      }
      return
    }
    if (!isRecord(value)) return
    for (const [key, child] of Object.entries(value)) {
      if (isRecord(child) && (key === "refs" || key === "nodes" || key === "table")) {
        // A named ref table: its children are nodes keyed by their lookup id.
        for (const [refId, node] of Object.entries(child)) {
          register(node, refId)
          visit(node, depth + 1)
        }
        continue
      }
      register(child)
      visit(child, depth + 1)
    }
  }
  register(schema)
  visit(schema, 0)
  return table
}

/** Resolve one schema reference (a node object or a uid into the node table). */
function resolveRef(table: Map<string, Rec>, ref: unknown): Rec | undefined {
  if (isRecord(ref)) return ref
  if (typeof ref === "number" || typeof ref === "string") return table.get(String(ref))
  return undefined
}

/** Walk field → union → dict → key union; return the first string-const vocabulary found. */
function vocabularyUnder(table: Map<string, Rec>, ref: unknown, depth: number): string[] | undefined {
  if (depth > 8) return undefined
  const node = resolveRef(table, ref)
  if (node === undefined) return undefined
  const direct = constStringsIn(table, node)
  if (direct !== undefined) return direct
  if (Array.isArray(node.list)) {
    // A union may carry the vocabulary as one of its members (e.g.
    // `false | dict-of-levels`); try each in declaration order.
    for (const member of node.list) {
      const found = vocabularyUnder(table, member, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (node.inner !== undefined || node.sKey !== undefined || node.key !== undefined) {
    // A dict's key node is the level vocabulary; its value node is not.
    for (const bag of [node.sKey, node.key]) {
      const found = vocabularyUnder(table, bag, depth + 1)
      if (found !== undefined) return found
    }
  }
  return undefined
}

/** The node's own string-const vocabulary, when it *is* a union of >=2 distinct short consts. */
function constStringsIn(table: Map<string, Rec>, node: Rec): string[] | undefined {
  if (!Array.isArray(node.list) || node.list.length < 2) return undefined
  const values: string[] = []
  for (const member of node.list) {
    const resolved = resolveRef(table, member)
    if (resolved === undefined || typeof resolved.value !== "string") return undefined
    if (!values.includes(resolved.value)) values.push(resolved.value)
  }
  if (values.length < 2) return undefined
  // Sanity: level ids are short lowercase words. Anything else is a different
  // union that merely sits under an `*effort*` field name.
  if (!values.every((value) => /^[a-z][a-z0-9_-]{0,15}$/.test(value))) return undefined
  return values
}
