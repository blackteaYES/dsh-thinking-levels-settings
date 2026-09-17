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
import * as React from "react";
import type { ModelEdit } from "./levels";
import type { Translate } from "./locale";
interface ModelFormProps {
    /** The draft being edited; the parent owns it so dirty state can be diffed. */
    edit: ModelEdit;
    /** Level vocabulary, discovered from the settings schema. */
    levels: readonly string[];
    disabled: boolean;
    onChange: (next: ModelEdit) => void;
    t: Translate;
}
/** The expanded model editor. */
export declare function ModelForm({ edit, levels, disabled, onChange, t }: ModelFormProps): React.ReactElement;
export {};
