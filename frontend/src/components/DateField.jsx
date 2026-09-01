import React from "react";

// The app stores dates as MM/DD/YYYY strings (that is what every existing
// record and the search filter expect), but a native date picker only speaks
// YYYY-MM-DD. This component bridges the two so we get a real calendar popup
// without migrating stored data.

const pad = (n) => String(n).padStart(2, "0");

export const todayDisplay = () => {
  const d = new Date();
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
};

// "09/02/2026" -> "2026-09-02". Returns "" for anything unparseable so the
// picker just shows empty rather than throwing.
export const toInputValue = (display) => {
  if (!display) return "";
  const s = String(display).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${pad(m)}-${pad(d)}`;
  }
  return "";
};

// "2026-09-02" -> "09/02/2026"
export const toDisplayValue = (input) => {
  if (!input) return "";
  const m = String(input).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return input;
  const [, y, mo, d] = m;
  return `${mo}/${d}/${y}`;
};

/**
 * Calendar-picker date input.
 *
 * @param value    stored value, MM/DD/YYYY
 * @param onChange called with the new value, also MM/DD/YYYY
 */
const DateField = ({ value, onChange, className = "", "data-testid": testId, ...rest }) => {
  const inputValue = toInputValue(value);
  const unparseable = value && !inputValue;

  return (
    <>
      <input
        type="date"
        className={`pico-input font-hand ${className}`}
        value={inputValue}
        onChange={(e) => onChange(toDisplayValue(e.target.value))}
        data-testid={testId}
        {...rest}
      />
      {unparseable && (
        <span className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">
          stored as "{value}" — pick a date to replace it
        </span>
      )}
    </>
  );
};

export default DateField;
