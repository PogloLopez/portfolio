import type { ReactNode } from "react";

/**
 * Chrome shared by every case-study demo.
 *
 * The simulation badge is not decoration and is not optional. These demos
 * reproduce the interface of systems that run on a real company's data, and a
 * visitor must never be able to mistake one for the real thing — that is both
 * the honest position and the confidentiality line the content is written
 * under. Any new demo goes inside this frame.
 */
export function DemoFrame({
  title,
  subtitle,
  note,
  children,
}: {
  title: string;
  subtitle: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="not-prose" aria-label={`${title}, interactive demo`}>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-2/60 px-4 py-3 sm:px-5">
          <span aria-hidden className="hidden gap-1.5 sm:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          </span>

          <span className="order-1 min-w-0 flex-1 basis-full sm:order-none sm:basis-auto">
            <span className="block truncate text-sm font-semibold text-fg">{title}</span>
            <span className="block truncate font-mono text-[0.6875rem] text-fg-3">{subtitle}</span>
          </span>

          <span className="order-2 inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.08em] uppercase sm:order-none"
            style={{
              color: "var(--accent, var(--color-violet))",
              borderColor: "color-mix(in srgb, var(--accent, var(--color-violet)) 45%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--accent, var(--color-violet)) 12%, transparent)",
            }}>
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent, var(--color-violet))" }}
            />
            Simulation · synthetic data
          </span>
        </div>

        <div className="p-4 sm:p-6">{children}</div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg-3">{note}</p>
    </section>
  );
}
