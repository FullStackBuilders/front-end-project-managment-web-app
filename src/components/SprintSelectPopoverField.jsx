import { useCallback, useMemo, useState } from 'react';
import FormSelectPopover from './FormSelectPopover';
import { SprintLifecycleBadge } from '@/components/ui/TimelineStyleBadge';

/**
 * Sprint picker: single-select (list) or multi-select (checkboxes in popover).
 *
 * @param {'single'|'multi'} [props.selectionMode='single'] - single for modals; multi for scrum filter
 * @param {object} props
 * @param {string} [props.label]
 * @param {boolean} [props.showLabel=true]
 * @param {{ id: number; name: string; status?: string }[]} props.options
 * --- single mode ---
 * @param {number|string|null} [props.value]
 * @param {(id: number|string|null) => void} [props.onChange]
 * @param {string} [props.placeholder='Select a sprint']
 * --- multi mode ---
 * @param {number[]} [props.value]
 * @param {(ids: number[]) => void} [props.onChange]
 * @param {string} [props.triggerId]
 * @param {string} [props.rootClassName]
 */
export default function SprintSelectPopoverField({
  label = 'Sprint',
  showLabel = true,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select a sprint',
  triggerId = 'sprint-select-trigger',
  rootClassName,
  selectionMode = 'single',
}) {
  const [open, setOpen] = useState(false);

  const noOptions = !options?.length;

  // ── Multi-select (scrum board filter) ─────────────────────────────────────
  if (selectionMode === 'multi') {
    const selectedSet = useMemo(
      () => new Set((value ?? []).map((id) => Number(id))),
      [value],
    );

    const n = selectedSet.size;
    const triggerContent =
      n === 0 ? (
        <span className="text-sm text-gray-500">Select sprints</span>
      ) : (
        <span className="text-sm text-gray-900 truncate block w-full text-left">
          {n} selected
        </span>
      );

    const toggle = useCallback(
      (sprintId, checked) => {
        const id = Number(sprintId);
        const next = new Set(selectedSet);
        if (checked) next.add(id);
        else next.delete(id);
        onChange([...next].sort((a, b) => a - b));
      },
      [onChange, selectedSet],
    );

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
        {options.map((s) => {
          const sid = Number(s.id);
          const inputId = `${triggerId}-opt-${sid}`;
          return (
            <li key={sid} className="list-none">
              <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  id={inputId}
                  checked={selectedSet.has(sid)}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0"
                />
                <label
                  htmlFor={inputId}
                  className="text-sm text-gray-800 flex-1 min-w-0 cursor-pointer select-none flex items-center gap-2 flex-wrap"
                >
                  <span className="truncate">{s.name}</span>
                  {(s.status === 'ACTIVE' || s.status === 'COMPLETED') && (
                    <SprintLifecycleBadge sprintStatus={s.status} />
                  )}
                </label>
              </div>
            </li>
          );
        })}
      </FormSelectPopover>
    );
  }

  // ── Single-select (modals, legacy) ─────────────────────────────────────────
  const selected =
    value != null && value !== ''
      ? options.find((o) => o.id === value || String(o.id) === String(value))
      : null;

  const triggerContent = selected ? (
    <span className="text-sm text-gray-900 truncate block w-full text-left">
      {selected.name}
    </span>
  ) : (
    <span className="text-sm text-gray-500">{placeholder}</span>
  );

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
