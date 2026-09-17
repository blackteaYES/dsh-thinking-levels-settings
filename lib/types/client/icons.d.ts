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
import * as React from "react";
interface IconProps {
    /** Rendered box size in px; defaults to the host's 16. */
    size?: number;
    className?: string;
}
/** A layered "levels" glyph: three stacked bars of decreasing width. */
export declare function IconLevels(props: IconProps): React.ReactElement;
/** A branch/decision glyph, for the reasoning mode. */
export declare function IconMode(props: IconProps): React.ReactElement;
/** A picture glyph, for the image-input badge. */
export declare function IconImage(props: IconProps): React.ReactElement;
/** A text/document glyph, for the text-input badge. */
export declare function IconText(props: IconProps): React.ReactElement;
/** A slashed circle, for "not reasoning". */
export declare function IconNoReasoning(props: IconProps): React.ReactElement;
/** A dotted circle, for "decided by the installed catalog". */
export declare function IconInherit(props: IconProps): React.ReactElement;
/** A right-pointing chevron; the CSS rotates it when a row is open. */
export declare function IconChevron(props: IconProps): React.ReactElement;
/** A magnifier, for the search field. */
export declare function IconSearch(props: IconProps): React.ReactElement;
/** A check, for the save action. */
export declare function IconSave(props: IconProps): React.ReactElement;
/** A counter-clockwise arrow, for discarding drafts. */
export declare function IconDiscard(props: IconProps): React.ReactElement;
/** Chevrons pointing apart, for "expand all". */
export declare function IconExpandAll(props: IconProps): React.ReactElement;
/** Chevrons pointing together, for "collapse all". */
export declare function IconCollapseAll(props: IconProps): React.ReactElement;
/** A down arrow into a tray, for export. */
export declare function IconDownload(props: IconProps): React.ReactElement;
/** An up arrow out of a tray, for import. */
export declare function IconUpload(props: IconProps): React.ReactElement;
/** A tick, for the chosen entry in a menu of choices. */
export declare function IconCheck(props: IconProps): React.ReactElement;
/** A downward chevron, for an overflow-menu trigger. */
export declare function IconCaretDown(props: IconProps): React.ReactElement;
/** A pencil dot, for unsaved changes. */
export declare function IconDirty(props: IconProps): React.ReactElement;
export {};
