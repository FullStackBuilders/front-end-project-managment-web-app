import { useState } from 'react';
import FormSelectPopover from './FormSelectPopover';

/**
 * Sprint picker using the same popover shell as TaskFormAssigneeField / TaskFormPriorityField.
 *
 * @param {object} props
 * @param {string} [props.label] - passed to FormSelectPopover; omit when parent supplies SectionLabel
 * @param {boolean} [props.showLabel=true] - when false, no inner label (use external SectionLabel)
 * @param {{ id: number|string; name: string }[]} props.options
 * @param {number|string|null} props.value - use `SCRUM_BOARD_SPRINT_ALL` for "All active sprints"
 * @param {(id: number|string) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {string} props.triggerId - unique id for a11y / label association
 * @param {string} [props.rootClassName] - passed to FormSelectPopover (default mb-4)
 */
export default function SprintSelectPopoverField({
  label = 'Sprint',
  showLabel = true,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select a sprint',
  triggerId,
  rootClassName,
}) {
  const [open, setOpen] = useState(false);
  const selected =
    value != null && value !== ""
      ? options.find((o) => o.id === value || String(o.id) === String(value))
      : null;

  const triggerContent = selected ? (
    <span className="text-sm text-gray-900 truncate block w-full text-left">
      {selected.name}
    </span>
  ) : (
    <span className="text-sm text-gray-500">{placeholder}</span>
  );

  const noOptions = !options?.length;

  return (
    <FormSelectPopover
      label={showLabel ? label : null}
      triggerId={triggerId}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled || noOptions}
      triggerContent={triggerContent}
      rootClassName={rootClassName}
    >
      {options.map((s) => (
        <li key={s.id} role="presentation">
          <button
            type="button"
            role="option"
            className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              onChange(s.id);
              setOpen(false);
            }}
          >
            {s.name}
          </button>
        </li>
      ))}
    </FormSelectPopover>
  );
}
