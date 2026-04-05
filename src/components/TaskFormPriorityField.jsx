import { useState } from 'react';
import FormSelectPopover from './FormSelectPopover';
import PriorityBadge from './PriorityBadge';

const ALL_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

export default function TaskFormPriorityField({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const alternatives = ALL_PRIORITIES.filter((p) => p !== value);

  return (
    <FormSelectPopover
      label="Priority"
      triggerId="task-form-priority-trigger"
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      triggerContent={<PriorityBadge priority={value} />}
    >
      {alternatives.map((p) => (
        <li key={p} role="presentation">
          <button
            type="button"
            role="option"
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center"
            onClick={() => {
              onChange(p);
              setOpen(false);
            }}
          >
            <PriorityBadge priority={p} />
          </button>
        </li>
      ))}
    </FormSelectPopover>
  );
}
