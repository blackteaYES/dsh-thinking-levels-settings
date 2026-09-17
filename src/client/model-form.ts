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
import * as React from "react"
import { MODALITIES, PRESETS, levelLabel, modalityLabel, presetEdit, summarize } from "./levels"
import type { ModelEdit, ReasoningMode } from "./levels"
import type { Translate } from "./locale"
import { IconLevels, IconMode, IconText } from "./icons"

interface ModelFormProps {
  /** The draft being edited; the parent owns it so dirty state can be diffed. */
  edit: ModelEdit
  /** Level vocabulary, discovered from the settings schema. */
  levels: readonly string[]
  disabled: boolean
  onChange: (next: ModelEdit) => void
  t: Translate
}

/** Human-facing label key for each mode, paired with its explanatory help. */
const MODES: ReadonlyArray<{ mode: ReasoningMode; label: string; help: string }> = [
  { mode: "inherit", label: "mode.inherit", help: "mode.inheritHelp" },
  { mode: "false", label: "mode.false", help: "mode.falseHelp" },
  { mode: "map", label: "mode.map", help: "mode.mapHelp" },
]

/** The expanded model editor. */
export function ModelForm({ edit, levels, disabled, onChange, t }: ModelFormProps): React.ReactElement {
  const setMode = (mode: ReasoningMode) => {
    if (mode === "map") {
      // Seed a usable default so switching to this mode is not immediately invalid.
      const seeded = Object.keys(edit.efforts).length > 0 ? edit.efforts : presetEdit(PRESETS[0], levels).efforts
      onChange({ ...edit, mode, efforts: seeded })
      return
    }
    onChange({ ...edit, mode })
  }

  const toggleLevel = (id: string) => {
    const efforts = { ...edit.efforts }
    if (Object.prototype.hasOwnProperty.call(efforts, id)) delete efforts[id]
    else efforts[id] = id === "off" ? "" : id
    onChange({ ...edit, efforts })
  }

  const setWire = (id: string, value: string) => {
    onChange({ ...edit, efforts: { ...edit.efforts, [id]: value } })
  }

  const toggleModality = (id: string) => {
    const current = edit.input ?? []
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    // Keep declaration order stable and drop anything unknown.
    const ordered = MODALITIES.filter((modality) => next.includes(modality))
    // No modality selected means "no opinion": omit the field so it inherits.
    onChange({ ...edit, input: ordered.length > 0 ? ordered : undefined })
  }

  const summary = summarize(edit, levels)

  // Each concern is its own card with its own title. One long undifferentiated
  // column was what made the editor read as a wall of text.
  return React.createElement("div", { className: "tl-form" },
    React.createElement("section", { className: "tl-section" },
      React.createElement("h4", { className: "tl-section-title" },
        React.createElement(IconMode, { size: 14 }),
        React.createElement("span", null, t("mode.legend")),
      ),
      React.createElement("div", { className: "tl-modes" },
        ...MODES.map(({ mode, label, help }) =>
          React.createElement("label", { key: mode, className: "tl-mode" },
            React.createElement("input", {
              type: "radio",
              name: "tl-reasoning-mode",
              checked: edit.mode === mode,
              disabled,
              onChange: () => setMode(mode),
            }),
            React.createElement("span", { className: "tl-mode-body" },
              React.createElement("span", { className: "tl-mode-label" }, t(label)),
              React.createElement("span", { className: "tl-mode-help" }, t(help)),
            ),
          )),
      ),
    ),

    edit.mode === "map"
      ? React.createElement("section", { className: "tl-section" },
          React.createElement("div", { className: "tl-section-head" },
            React.createElement("h4", { className: "tl-section-title" },
              React.createElement(IconLevels, { size: 14 }),
              React.createElement("span", null, t("levels.header")),
            ),
            // Presets belong with the title, not inside the table's header row:
            // sharing that row pushed the column titles out of their columns.
            React.createElement("div", { className: "tl-presets" },
              React.createElement("span", { className: "tl-presets-label" }, t("levels.presets")),
              ...PRESETS.map((preset) =>
                React.createElement("button", {
                  key: preset.id,
                  type: "button",
                  className: "tl-chip",
                  disabled,
                  onClick: () => onChange({ ...edit, mode: "map", efforts: presetEdit(preset, levels).efforts }),
                }, t(`levels.preset.${preset.id}`))),
            ),
          ),
          React.createElement("div", { className: "tl-levels-block" },
            // The header shares the rows' exact three-column track, so the
            // titles sit over the column they name.
            React.createElement("div", { className: "tl-levels-head" },
              React.createElement("span", null, null),
              React.createElement("span", null, t("levels.header")),
              React.createElement("span", null, t("levels.wireHeader")),
            ),
            React.createElement("div", { className: "tl-levels" },
              ...levels.map((id) => {
                const checked = Object.prototype.hasOwnProperty.call(edit.efforts, id)
                const isOff = id === "off"
                return React.createElement("label", { key: id, className: checked ? "tl-level tl-level-on" : "tl-level" },
                  React.createElement("input", {
                    type: "checkbox",
                    checked,
                    disabled,
                    onChange: () => toggleLevel(id),
                  }),
                  React.createElement("span", { className: "tl-label" }, levelLabel(id)),
                  checked
                    ? React.createElement("input", {
                        className: "tl-wire",
                        value: edit.efforts[id] ?? "",
                        disabled,
                        placeholder: isOff ? t("levels.offPlaceholder") : t("levels.placeholder"),
                        "aria-label": `${levelLabel(id)} ${t("levels.wireHeader")}`,
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setWire(id, event.target.value),
                      })
                    : React.createElement("span", { className: "tl-unavailable" }, t("levels.unavailable")),
                  checked && isOff
                    ? React.createElement("span", { className: "tl-level-hint" }, t("levels.offHint"))
                    : null,
                )
              }),
            ),
          ),
        )
      : null,

    React.createElement("section", { className: "tl-section" },
      React.createElement("h4", { className: "tl-section-title" },
        React.createElement(IconText, { size: 14 }),
        React.createElement("span", null, t("input.legend")),
      ),
      React.createElement("div", { className: "tl-modalities" },
        ...MODALITIES.map((id) =>
          React.createElement("label", { key: id, className: "tl-modality" },
            React.createElement("input", {
              type: "checkbox",
              checked: (edit.input ?? []).includes(id),
              disabled,
              onChange: () => toggleModality(id),
            }),
            React.createElement("span", null, t(`input.${id}`)),
          )),
      ),
      React.createElement("p", { className: "tl-note" }, t("input.note")),
    ),

    React.createElement("div", { className: "tl-preview" },
      React.createElement("div", { className: "tl-preview-title" }, t("preview.title")),
      React.createElement("div", { className: "tl-preview-body" }, renderPreview(summary, t)),
    ),
  )
}

/**
 * Preview the effective result. It describes **what this page declares** and
 * says so when that is not the whole story: the installed catalog can also
 * grant a model reasoning levels, and that catalog is not readable from a
 * settings page, so claiming otherwise would be a lie (see `preview.inherit`).
 */
function renderPreview(summary: ReturnType<typeof summarize>, t: Translate): React.ReactElement {
  if (summary.mode === "inherit") {
    return React.createElement("span", { className: "tl-preview-inherit" }, t("preview.inherit"))
  }
  const thinking = summary.thinking.map((id) => levelLabel(id)).join(" · ")
  const levels = summary.mode === "false" ? "" : thinking
  return React.createElement(React.Fragment, null,
    React.createElement("div", null,
      summary.mode === "false"
        ? t("preview.false")
        : t("preview.map", { levels }) + (summary.offSendsNothing && summary.levels.includes("off") ? t("preview.mapOffNothing") : ""),
    ),
    React.createElement("div", { className: "tl-preview-input" },
      summary.modalities.length > 0
        ? t("preview.inputText", { modalities: summary.modalities.map((id) => modalityLabel(id)).join(" · ") })
        : t("preview.inputInherit"),
    ),
  )
}
