"use client";

import { useState } from "react";

const OTHER = "__OTHER__";

interface Props {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  /** Placeholder shown in the empty "เลือก…" option. */
  emptyLabel: string;
  /** Placeholder for the free-text input shown when "อื่นๆ" is picked. */
  otherPlaceholder?: string;
  disabled?: boolean;
}

/**
 * Dropdown + opt-in free-text fallback. Persists a single string value:
 * either an item from `options`, or anything the user types after picking
 * "อื่นๆ". The select renders the OTHER sentinel only as a UI affordance
 * — it is never stored.
 *
 * `value` lying outside `options` (e.g. existing data created before the
 * dropdown shipped) is treated as "other mode" on first render so the
 * tutor sees the input pre-filled instead of an unexplained empty select.
 */
export function SelectWithOther({
  value,
  onChange,
  options,
  emptyLabel,
  otherPlaceholder,
  disabled,
}: Props) {
  const valueInList = options.includes(value);
  const [otherSelected, setOtherSelected] = useState(
    value !== "" && !valueInList,
  );
  const isOther = otherSelected || (value !== "" && !valueInList);

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="space-y-2">
      <select
        value={isOther ? OTHER : value}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTHER) {
            setOtherSelected(true);
            onChange("");
          } else {
            setOtherSelected(false);
            onChange(next);
          }
        }}
        className={inputClass}
      >
        <option value="" disabled>
          {emptyLabel}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={OTHER}>อื่นๆ (ระบุเอง)</option>
      </select>
      {isOther && (
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={otherPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}
