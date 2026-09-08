import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.625rem] tracking-[0.12em] text-iris uppercase sm:text-[0.6875rem] sm:tracking-[0.16em]">{children}</p>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-surface-2/70 px-2.5 py-1 font-mono text-xs text-fg-2">
      {children}
    </span>
  );
}

export function ChipRow({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Chip>{item}</Chip>
        </li>
      ))}
    </ul>
  );
}

/**
 * Stat tile. The value stays in primary ink rather than the accent colour —
 * the violet rule above it carries the identity, so the number keeps the
 * strongest available contrast. Figures are proportional, not tabular:
 * tabular digits make a short standalone number look loose at display size.
 */
export function Stat({
  value,
  label,
  size = "md",
  accent = false,
}: {
  value: string;
  label: string;
  size?: "md" | "lg";
  /** Colours the figure with the inherited accent instead of primary ink. */
  accent?: boolean;
}) {
  return (
    <div className="relative pt-5">
      <span aria-hidden className="rule-accent absolute top-0 left-0 w-9" />
      <p
        className={`font-semibold tracking-[-0.02em] ${accent ? "" : "text-fg"} ${
          size === "lg" ? "text-2xl sm:text-[1.75rem]" : "text-xl"
        }`}
        style={accent ? { color: "var(--accent, var(--color-iris))" } : undefined}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-fg-3">{label}</p>
    </div>
  );
}

export function SectionLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="mb-8 flex items-center gap-4" id={id}>
      <h2 className="text-sm font-semibold tracking-[0.02em] text-fg-2">{children}</h2>
      <span aria-hidden className="rule-accent h-px flex-1 opacity-70" />
    </div>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
