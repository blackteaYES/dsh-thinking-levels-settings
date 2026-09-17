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
import * as React from "react"
import { IconCaretDown, IconCheck } from "./icons"

/** One entry in the menu. */
export interface MenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  /**
   * Present makes the item a radio choice: it reports `aria-checked` and draws
   * a check when set. Use `false` rather than omitting it for plain actions.
   */
  selected?: boolean
  /** Draw a divider above this item, to group unrelated contents. */
  separatorBefore?: boolean
  onSelect: () => void
}

interface OverflowMenuProps {
  /** Trigger text, e.g. 「更多」. */
  label: string
  /** Optional leading glyph; the caret is always appended. */
  triggerIcon?: React.ReactNode
  /** Marks the trigger when one of its choices is in effect. */
  active?: boolean
  items: readonly MenuItem[]
}

/** Trigger button plus a popup list, dismissed by Escape or an outside click. */
export function OverflowMenu({ label, triggerIcon, active, items }: OverflowMenuProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const root = React.useRef<HTMLSpanElement | null>(null)

  React.useEffect(() => {
    if (!open) return undefined
    // Read `document` off the global at effect time: the page must keep working
    // in any host where it is absent or partial, and the test harness supplies
    // only what the page actually uses.
    const doc: Document | undefined = typeof document === "undefined" ? undefined : document
    if (doc === undefined || typeof doc.addEventListener !== "function") return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointerDown = (event: MouseEvent): void => {
      const node = root.current
      const target = event.target
      if (node !== null && target !== null && typeof node.contains === "function" && !node.contains(target as Node)) {
        setOpen(false)
      }
    }
    doc.addEventListener("keydown", onKeyDown)
    doc.addEventListener("mousedown", onPointerDown)
    return () => {
      doc.removeEventListener("keydown", onKeyDown)
      doc.removeEventListener("mousedown", onPointerDown)
    }
  }, [open])

  return React.createElement("span", { className: "tl-more", ref: root },
    React.createElement("button", {
      type: "button",
      className: active === true ? "tl-secondary tl-more-trigger tl-more-active" : "tl-secondary tl-more-trigger",
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-label": label,
      onClick: () => setOpen(!open),
    }, triggerIcon, React.createElement("span", null, label),
      React.createElement(IconCaretDown, { size: 12 })),
    open
      ? React.createElement("div", { className: "tl-menu", role: "menu", "aria-label": label },
          ...items.map((item) =>
            React.createElement("button", {
              key: item.key,
              type: "button",
              role: item.selected === undefined ? "menuitem" : "menuitemradio",
              ...(item.selected === undefined ? {} : { "aria-checked": item.selected }),
              className: [
                "tl-menu-item",
                item.selected === undefined ? "" : "tl-menu-item-choice",
                item.selected === true ? "tl-menu-item-selected" : "",
                item.separatorBefore === true ? "tl-menu-item-sep" : "",
              ].filter((name) => name.length > 0).join(" "),
              disabled: item.disabled === true,
              onClick: () => {
                setOpen(false)
                item.onSelect()
              },
            },
              item.icon,
              React.createElement("span", { className: "tl-menu-label" }, item.label),
              // The check reserves its own space so labels stay aligned.
              React.createElement("span", { className: "tl-menu-check", "aria-hidden": "true" },
                React.createElement(IconCheck, { size: 12 }))),
          ),
        )
      : null,
  )
}
