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
import * as React from "react"
import { editFromModel, levelLabel, modalityLabel, summarize } from "./levels"
import type { ModelEdit, ModelEntry, ProviderEntry } from "./levels"
import type { Translate } from "./locale"
import { IconChevron, IconDirty, IconImage, IconInherit, IconNoReasoning, IconText } from "./icons"
import { ModelForm } from "./model-form"

/** Longest level chain a collapsed row renders before it is elided. */
const MAX_SUMMARY_LEVELS = 4

/** Stable row key for one provider/model pair. */
export function keyOf(providerId: string, modelId: string): string {
  return `${providerId}\u0000${modelId}`
}

interface ProviderGroupProps {
  provider: ProviderEntry
  /** Level vocabulary, discovered from the settings schema. */
  levels: readonly string[]
  /** Model ids to render; search and filters narrow the list this way. */
  visibleModelIds: ReadonlySet<string>
  /** Collapsed state of the provider group. */
  open: boolean
  onToggleProvider: () => void
  /** Model keys that are expanded. */
  openModels: ReadonlySet<string>
  onToggleModel: (key: string) => void
  /** Draft for one model; when absent the stored configuration stands. */
  editOf: (key: string) => ModelEdit
  onChange: (key: string, next: ModelEdit) => void
  dirtyKeys: ReadonlySet<string>
  disabled: boolean
  t: Translate
}

/** One provider and its models. */
export function ProviderGroup(props: ProviderGroupProps): React.ReactElement {
  const { provider, levels, visibleModelIds, open, onToggleProvider, openModels, onToggleModel, editOf, onChange, dirtyKeys, disabled, t } = props

  // Only the models that survived search/filtering render; the provider header
  // keeps counting the whole set, so the totals stay honest.
  const models = provider.models.filter((model) => visibleModelIds.has(model.id))

  const configured = provider.models.filter((model) => {
    const edit = editOf(keyOf(provider.id, model.id))
    return edit.mode !== "inherit" || edit.input !== undefined
  }).length

  return React.createElement("section", { className: "tl-provider" },
    React.createElement("h3", { className: "tl-provider-head" },
      React.createElement("button", {
        type: "button",
        className: "tl-toggle",
        "aria-expanded": open,
        "aria-label": t(open ? "provider.collapse" : "provider.expand"),
        onClick: onToggleProvider,
      }, React.createElement("span", { className: open ? "tl-chevron tl-chevron-open" : "tl-chevron" },
        React.createElement(IconChevron, { size: 12 }),
      )),
      React.createElement("span", { className: "tl-provider-name" }, provider.name),
      React.createElement("span", { className: "tl-provider-meta" }, provider.id + (provider.api ? ` · ${provider.api}` : "")),
      React.createElement("span", { className: "tl-provider-counts" }, t("provider.configuredCount", { done: configured, total: provider.models.length })),
    ),
    open
      ? React.createElement("div", { className: "tl-models" },
          ...models.map((model) => {
            const key = keyOf(provider.id, model.id)
            const edit = editOf(key)
            return React.createElement(ModelRow, {
              key,
              model,
              edit,
              levels,
              expanded: openModels.has(key),
              dirty: dirtyKeys.has(key),
              disabled,
              onToggle: () => onToggleModel(key),
              onChange: (next: ModelEdit) => onChange(key, next),
              t,
            })
          }),
        )
      : null,
  )
}

interface ModelRowProps {
  model: ModelEntry
  edit: ModelEdit
  levels: readonly string[]
  expanded: boolean
  dirty: boolean
  disabled: boolean
  onToggle: () => void
  onChange: (next: ModelEdit) => void
  t: Translate
}

/** One model: a single dense line that expands into the full editor.
 *
 * Collapsed, a row is one line — name, current state, badges — so a screen
 * fits a dozen models. It deliberately keeps the state inline instead of on a
 * second line: the earlier card layout spent two lines of vertical space per
 * model restating what one line can carry, which is what made the list read as
 * both dense and wasteful at once.
 */
function ModelRow(props: ModelRowProps): React.ReactElement {
  const { model, edit, levels, expanded, dirty, disabled, onToggle, onChange, t } = props
  const summary = summarize(edit, levels)
  return React.createElement("article", { className: expanded ? "tl-model tl-model-open" : "tl-model" },
    React.createElement("header", { className: "tl-model-head" },
      React.createElement("button", {
        type: "button",
        className: "tl-toggle",
        "aria-expanded": expanded,
        "aria-label": t(expanded ? "model.collapse" : "model.expand", { name: model.name }),
        onClick: onToggle,
      }, React.createElement("span", { className: expanded ? "tl-chevron tl-chevron-open" : "tl-chevron" },
        React.createElement(IconChevron, { size: 12 }),
      )),
      React.createElement("span", { className: "tl-model-title" },
        React.createElement("span", { className: "tl-model-name" }, model.name),
        model.name !== model.id ? React.createElement("span", { className: "tl-model-id" }, model.id) : null,
      ),
      // The state text is the row's whole answer, so it sits on the name line
      // rather than under it. `title` keeps the untruncated form reachable.
      React.createElement("span", { className: "tl-summary", title: t(dirty ? "model.draft" : "model.currently", { summary: fullSummary(summary, t) }) },
        summaryText(summary, t),
      ),
      React.createElement("span", { className: "tl-badges" },
        ...renderBadges(summary, t),
        dirty ? React.createElement("span", { className: "tl-badge tl-badge-dirty", title: t("model.modified") },
          React.createElement(IconDirty, { size: 12 }),
        ) : null,
      ),
    ),
    expanded
      ? React.createElement("div", { className: "tl-model-body" },
          React.createElement(ModelForm, { edit, levels, disabled, onChange, t }),
          dirty
            ? React.createElement("button", {
                type: "button",
                className: "tl-secondary",
                disabled,
                onClick: () => onChange(editFromModel(model.raw, levels)),
              }, t("model.reset"))
            : null,
        )
      : null,
  )
}

/** Modality badges plus a state badge, so a collapsed row still answers "what is this?". */
function renderBadges(summary: ReturnType<typeof summarize>, t: Translate): React.ReactElement[] {
  const badges: React.ReactElement[] = []
  for (const modality of summary.modalities) {
    badges.push(React.createElement("span", { key: modality, className: "tl-badge tl-badge-modality" },
      modality === "image" ? React.createElement(IconImage, { size: 12 }) : React.createElement(IconText, { size: 12 }),
      React.createElement("span", null, modalityLabel(modality)),
    ))
  }
  if (summary.mode === "false") {
    badges.push(React.createElement("span", { key: "none", className: "tl-badge" },
      React.createElement(IconNoReasoning, { size: 12 }),
      React.createElement("span", null, t("filter.nonreasoning")),
    ))
  } else if (summary.mode === "inherit") {
    badges.push(React.createElement("span", { key: "inherit", className: "tl-badge tl-badge-muted" },
      React.createElement(IconInherit, { size: 12 }),
      React.createElement("span", null, t("filter.unconfigured")),
    ))
  }
  return badges
}

/** Compress the level chain so a seven-level model does not overflow the row. */
function summaryText(summary: ReturnType<typeof summarize>, t: Translate): string {
  if (summary.mode === "inherit") return t("mode.inherit")
  if (summary.mode === "false") return t("mode.false")
  const labels = summary.levels.map((id) => levelLabel(id))
  if (labels.length === 0) return t("filter.unconfigured")
  if (labels.length <= MAX_SUMMARY_LEVELS) return labels.join(" · ")
  return [...labels.slice(0, 2), "\u2026", labels[labels.length - 1]].join(" · ")
}

/** The untruncated state text, used for the row's hover title. */
function fullSummary(summary: ReturnType<typeof summarize>, t: Translate): string {
  if (summary.mode === "inherit") return t("mode.inherit")
  if (summary.mode === "false") return t("mode.false")
  const labels = summary.levels.map((id) => levelLabel(id))
  return labels.length === 0 ? t("filter.unconfigured") : labels.join(" · ")
}
