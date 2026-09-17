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
import * as React from "react";
/** One entry in the menu. */
export interface MenuItem {
    key: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    /**
     * Present makes the item a radio choice: it reports `aria-checked` and draws
     * a check when set. Use `false` rather than omitting it for plain actions.
     */
    selected?: boolean;
    /** Draw a divider above this item, to group unrelated contents. */
    separatorBefore?: boolean;
    onSelect: () => void;
}
interface OverflowMenuProps {
    /** Trigger text, e.g. 「更多」. */
    label: string;
    /** Optional leading glyph; the caret is always appended. */
    triggerIcon?: React.ReactNode;
    /** Marks the trigger when one of its choices is in effect. */
    active?: boolean;
    items: readonly MenuItem[];
}
/** Trigger button plus a popup list, dismissed by Escape or an outside click. */
export declare function OverflowMenu({ label, triggerIcon, active, items }: OverflowMenuProps): React.ReactElement;
export {};
