import { useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Popover shell for custom selects inside modals.
 * Closes on outside mousedown and Escape.
 */
export default function FormSelectPopover({
  label,
  triggerId,
  open,
  onOpenChange,
  triggerContent,
  children,
  disabled = false,
  /** Override root wrapper spacing (e.g. `mb-0` when nested in another panel). */
  rootClassName = 'mb-4',
}) {
  const rootRef = useRef(null);

  const handleOutside = useCallback(
    (e) => {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    },
    [open, onOpenChange]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('mousedown', handleOutside);
    const onKey = (e) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, handleOutside, onOpenChange]);

  return (
    <div className={rootClassName} ref={rootRef}>
      {label && (
        <label htmlFor={triggerId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={triggerId}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => !disabled && onOpenChange(!open)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-left
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:border-gray-400 transition-colors"
        >
          <span className="min-w-0 flex items-center">{triggerContent}</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute z-[60] mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            {children}
          </ul>
        )}
      </div>
    </div>
  );
}
