import { useState } from 'react';
import FormSelectPopover from './FormSelectPopover';
import StatusBadge from './StatusBadge';
import { STATUS_OPTIONS } from '../constants/statusStyles';

export default function TaskFormStatusField({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const alternatives = STATUS_OPTIONS.filter((s) => s !== value);

  return (
    <FormSelectPopover
      label="Status"
      triggerId="task-form-status-trigger"
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      triggerContent={<StatusBadge status={value} />}
    >
      {alternatives.map((s) => (
        <li key={s} role="presentation">
          <button
            type="button"
            role="option"
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center"
            onClick={() => {
              onChange(s);
              setOpen(false);
            }}
          >
            <StatusBadge status={s} />
          </button>
        </li>
      ))}
    </FormSelectPopover>
  );
}
