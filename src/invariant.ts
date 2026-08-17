/**
 * Package-owned invariant companion for `dsh-thinking-levels-settings`.
 * @module dsh-thinking-levels-settings/invariant
 */

const PACKAGE_NAME = "dsh-thinking-levels-settings"

/** Cordis companion plugin name. */
export const name = "thinking-levels-settings-invariant"

/** Service required before the companion can reserve package ownership. */
export const inject = ["invariants"]

/**
 * No runtime invariant: the plugin is a pure settings.section contribution
 * projecting the `llm-pi-ai` namespace through the settings domain's own wire
 * contract; slot declaration/registration conflicts and settings schema
 * failures already fail loud at load or write time.
 */
const install = (): void => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: any): Promise<unknown> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))