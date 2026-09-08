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
        style={{
          borderColor: "color-mix(in srgb, var(--accent, var(--color-iris)) 45%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--accent, var(--color-iris)) 8%, transparent)",
        }}
        className="w-full appearance-none rounded-lg border py-2.5 pr-9 pl-3 text-sm font-medium text-fg transition-all hover:brightness-125 focus:outline-none"
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
        style={{ color: "var(--accent, var(--color-iris))" }}
        className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2"
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
      style={{
        borderColor: `color-mix(in srgb, var(--accent, var(--color-iris)) ${checked ? 100 : 45}%, transparent)`,
        backgroundColor: `color-mix(in srgb, var(--accent, var(--color-iris)) ${checked ? 18 : 8}%, transparent)`,
      }}
      className={`inline-flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all hover:brightness-125 ${
        checked ? "text-fg" : "text-fg-2"
      }`}
    >
      <span
        aria-hidden
        className={`relative block h-4.5 w-8 shrink-0 rounded-full transition-colors ${
          checked ? "" : "bg-white/25"
        }`}
        style={checked ? { background: "var(--accent, var(--color-iris))" } : undefined}
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
  // Accent-driven rather than fixed, so a demo matches the case study it sits
  // in. Inline styles because `color-mix` on a custom property cannot be
  // expressed as a static utility class.
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: "var(--accent, var(--color-iris))", color: "var(--color-ground)" }
      : variant === "ghost"
        ? {
            color: "var(--accent, var(--color-iris))",
            borderColor: "color-mix(in srgb, var(--accent, var(--color-iris)) 45%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--accent, var(--color-iris)) 8%, transparent)",
          }
        : {};

  const styles = {
    primary: "shadow-sm hover:opacity-90",
    ghost: "border hover:brightness-125",
    danger: "border border-line-strong text-fg-2 hover:border-white/45 hover:text-fg",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={style}
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

/**
 * A timeline the reader drags. Chosen over a "next" button because a track with
 * a handle on it explains itself: people grab it without being told to, and the
 * position of the handle is itself the state readout.
 */
export function Timeline({
  value,
  max,
  onChange,
  label,
  tickLabel,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  tickLabel: (i: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-40" : undefined}>
      <label className="block">
        <span className="mb-3 block text-sm font-medium text-fg-2">{label}</span>
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="demo-range w-full"
          // The filled portion of the track is painted from this, so the
          // handle always has a coloured run behind it.
          style={{ ["--fill" as string]: `${(value / max) * 100}%` }}
        />
      </label>
      <div className="mt-2 flex justify-between">
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i)}
            style={i === value ? { color: "var(--accent, var(--color-iris))" } : undefined}
            className={`min-w-8 rounded px-1 py-1 font-mono text-[0.6875rem] transition-colors ${
              i === value ? "font-semibold" : "text-fg-3 hover:text-fg-2"
            }`}
          >
            {tickLabel(i)}
          </button>
        ))}
      </div>
    </div>
  );
}
