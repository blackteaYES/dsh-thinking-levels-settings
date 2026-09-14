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
/** Wire shape of one settings namespace, as carried by every envelope we normalize. */
export interface RawNamespace {
    ns?: unknown;
    schema?: unknown;
    value?: unknown;
    base?: unknown;
    user?: unknown;
    applies?: unknown;
    secrets?: unknown;
    revision?: unknown;
}
export interface RawSettingsDocument {
    writable?: unknown;
    hasDocument?: unknown;
    namespaces?: unknown;
}
/** Thrown by a failing settings call; carries a best-effort conflict signal. */
export declare class SettingsCallError extends Error {
    /** True when the Host reported a revision conflict (stale editor), not a plain failure. */
    readonly conflict: boolean;
    constructor(message: string, conflict?: boolean);
}
type Envelope = {
    ok: true;
    value: unknown;
} | {
    ok: false;
    message: string;
    code: string | undefined;
};
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
export declare function normalizeEnvelope(response: unknown): Envelope;
/**
 * Assembly-fault probe: did this call *shape* fail before reaching the Host?
 * Business failures (validation, conflicts) must never trigger a shape retry,
 * or a single user click could write twice. A message naming a wire parameter
 * counts as an assembly fault; a business validation error names the settings
 * field it rejected instead, so it never matches.
 */
export declare function looksLikeAssemblyFault(error: unknown): boolean;
/** The document shape the page consumes; `undefined` namespaces never reach here. */
export interface WriteResult {
    writable: boolean;
    revision: number | undefined;
    namespaces: RawNamespace[];
}
/** A probed settings surface. */
export interface SettingsWire {
    /** `describe`-answering holder path once resolved, for the UI's diagnostic line. */
    source(): string | undefined;
    describe(): Promise<RawSettingsDocument>;
    mutate(namespace: string, operations: readonly unknown[], expectedRevision?: number): Promise<WriteResult>;
}
/**
 * Probe the runtime for a working settings channel.
 *
 * @param surfaces - holder roots in preference order; the call site passes
 *   `ctx`, `ctx.connection`, `ctx.root`. Passing several is what frees this
 *   module from knowing which face DSH currently hangs the wire on.
 * @param extraPaths - additional holder paths appended to the built-in list.
 */
export declare function resolveSettingsWire(surfaces: readonly unknown[], extraPaths?: readonly string[]): SettingsWire;
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
export declare function levelVocabularyFromSchema(document: RawSettingsDocument, namespace: string): string[] | undefined;
export {};
