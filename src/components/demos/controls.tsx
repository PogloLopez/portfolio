"use client";

import type { ReactNode } from "react";

/** Filters sit in one row above the content they scope, per the dataviz rules. */
export function ControlRow({ children }: { children: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end gap-x-5 gap-y-4">{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-fg-3 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-lg border border-line-strong bg-surface-2 py-2.5 pr-9 pl-3 text-sm font-medium text-fg transition-colors hover:border-iris focus:border-iris focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface-2 text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-fg-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" />
      </svg>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
        checked
          ? "border-iris/60 bg-iris/12 text-fg"
          : "border-line-strong bg-surface-2 text-fg-2 hover:border-iris/60 hover:text-fg"
      }`}
    >
      <span
        aria-hidden
        className={`relative block h-4.5 w-8 shrink-0 rounded-full transition-colors ${
          checked ? "bg-iris" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-2.5 w-2.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function Button({
  onClick,
  children,
  variant = "primary",
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-iris text-ground shadow-sm shadow-iris/25 hover:bg-violet",
    ghost:
      "border border-iris/45 bg-iris/8 text-iris hover:border-iris hover:bg-iris/18",
    danger: "border border-line-strong text-fg-2 hover:border-white/45 hover:text-fg",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-line-strong bg-surface-2 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === o.value ? "bg-white/10 text-fg" : "text-fg-3 hover:text-fg-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
