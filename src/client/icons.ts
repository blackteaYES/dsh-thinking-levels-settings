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
import * as React from "react"

/** The host's icon geometry: a 16px box with a stroked outline. */
const BOX = "0 0 16 16"

interface IconProps {
  /** Rendered box size in px; defaults to the host's 16. */
  size?: number
  className?: string
}

/**
 * Shared `<svg>` builder, so every glyph carries identical attributes.
 *
 * Takes its parts as separate arguments rather than destructuring `props`:
 * `props` deliberately omits `children`, which leaves React's overloads unable
 * to infer the wrapper's element type.
 */
function svg(props: IconProps, ...children: React.ReactNode[]): React.ReactElement {
  return React.createElement("svg", {
    width: props.size ?? 16,
    height: props.size ?? 16,
    className: props.className,
    viewBox: BOX,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
    focusable: "false",
  }, ...children)
}

/** Stroke attributes shared by every path, matching the host's line weight. */
const LINE = { stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

/** A layered "levels" glyph: three stacked bars of decreasing width. */
export function IconLevels(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M2.5 4.5h11", ...LINE }),
    React.createElement("path", { d: "M2.5 8h7.5", ...LINE }),
    React.createElement("path", { d: "M2.5 11.5h4.5", ...LINE }),
  )
}

/** A branch/decision glyph, for the reasoning mode. */
export function IconMode(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M8 2.5v3", ...LINE }),
    React.createElement("path", { d: "M4 5.5h8", ...LINE }),
    React.createElement("path", { d: "M4 5.5v2.2M12 5.5v2.2", ...LINE }),
    React.createElement("circle", { cx: 4, cy: 10.4, r: 1.6, ...LINE }),
    React.createElement("circle", { cx: 12, cy: 10.4, r: 1.6, ...LINE }),
  )
}

/** A picture glyph, for the image-input badge. */
export function IconImage(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("rect", { x: 2, y: 3, width: 12, height: 10, rx: 1.6, ...LINE }),
    React.createElement("circle", { cx: 5.8, cy: 6.4, r: 1, ...LINE }),
    React.createElement("path", { d: "M2.4 11.4l3.1-2.6 2.4 2 2.1-1.8 3.6 3", ...LINE }),
  )
}

/** A text/document glyph, for the text-input badge. */
export function IconText(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M3.5 3.5h9", ...LINE }),
    React.createElement("path", { d: "M3.5 6.5h9", ...LINE }),
    React.createElement("path", { d: "M3.5 9.5h6", ...LINE }),
  )
}

/** A slashed circle, for "not reasoning". */
export function IconNoReasoning(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("circle", { cx: 8, cy: 8, r: 5.6, ...LINE }),
    React.createElement("path", { d: "M4.4 4.4l7.2 7.2", ...LINE }),
  )
}

/** A dotted circle, for "decided by the installed catalog". */
export function IconInherit(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("circle", { cx: 8, cy: 8, r: 5.6, ...LINE, strokeDasharray: "2.2 2" }),
    React.createElement("path", { d: "M8 5.4v5.2", ...LINE }),
  )
}

/** A right-pointing chevron; the CSS rotates it when a row is open. */
export function IconChevron(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M6.5 3.5L10.5 8l-4 4.5", ...LINE }),
  )
}

/** A magnifier, for the search field. */
export function IconSearch(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("circle", { cx: 7.2, cy: 7.2, r: 4.4, ...LINE }),
    React.createElement("path", { d: "M10.6 10.6l2.6 2.6", ...LINE }),
  )
}

/** A check, for the save action. */
export function IconSave(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M3.5 8.4l3 3 6-6.8", ...LINE }),
  )
}

/** A counter-clockwise arrow, for discarding drafts. */
export function IconDiscard(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M3 6.2h6.2a3.4 3.4 0 0 1 0 6.8H5.2", ...LINE }),
    React.createElement("path", { d: "M5.2 3.4L2.6 6.2l2.6 2.6", ...LINE }),
  )
}

/** Chevrons pointing apart, for "expand all". */
export function IconExpandAll(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M8 6.4L5.6 4M8 6.4L10.4 4", ...LINE }),
    React.createElement("path", { d: "M8 9.6l-2.4 2.4M8 9.6l2.4 2.4", ...LINE }),
  )
}

/** Chevrons pointing together, for "collapse all". */
export function IconCollapseAll(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M5.6 2.6L8 5l2.4-2.4", ...LINE }),
    React.createElement("path", { d: "M5.6 13.4L8 11l2.4 2.4", ...LINE }),
    React.createElement("path", { d: "M2.5 8h11", ...LINE }),
  )
}

/** A down arrow into a tray, for export. */
export function IconDownload(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M8 2.6v7.2", ...LINE }),
    React.createElement("path", { d: "M5 7l3 3 3-3", ...LINE }),
    React.createElement("path", { d: "M3 13.2h10", ...LINE }),
  )
}

/** An up arrow out of a tray, for import. */
export function IconUpload(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M8 10.4V3.2", ...LINE }),
    React.createElement("path", { d: "M5 6.2l3-3 3 3", ...LINE }),
    React.createElement("path", { d: "M3 13.2h10", ...LINE }),
  )
}

/** A tick, for the chosen entry in a menu of choices. */
export function IconCheck(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M3.4 8.4l2.7 2.7 6.5-6.6", ...LINE }),
  )
}

/** A downward chevron, for an overflow-menu trigger. */
export function IconCaretDown(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("path", { d: "M3.5 6l4.5 4.5L12.5 6", ...LINE }),
  )
}

/** A pencil dot, for unsaved changes. */
export function IconDirty(props: IconProps): React.ReactElement {
  return svg(props,
    React.createElement("circle", { cx: 8, cy: 8, r: 3.2, fill: "currentColor" }),
  )
}
