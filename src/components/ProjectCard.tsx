import Link from "next/link";
import type { Project } from "@/content/projects";
import { Arrow, Chip } from "@/components/ui";
import { CardVisual } from "@/components/CardVisual";

/**
 * A home-page card, themed by its project's accent.
 *
 * `data-accent` sets `--accent` for the whole subtree, so the kicker, the
 * visual, the border glow and the call to action all pick up one hue without
 * threading a colour prop through each of them.
 *
 * Ordered for a three-second scan: what it is, the two numbers that matter, a
 * picture of the output, then the one interesting line.
 */
export function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <li data-accent={project.accent}>
      <Link
        href={`/projects/${project.slug}`}
        className="card-accent group relative flex h-full flex-col overflow-hidden rounded-xl border border-line-strong bg-surface/80 p-6 sm:p-7"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full opacity-0 blur-[70px] transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: "var(--accent)" }}
        />

        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-xs text-fg-3">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className="truncate font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
            style={{ color: "var(--accent)" }}
          >
            {project.kicker}
          </span>
        </div>

        <h3 className="mt-4 text-[1.375rem] leading-snug font-semibold tracking-[-0.02em] text-fg">
          {project.title}
        </h3>

        <dl className="mt-5 flex gap-8">
          {project.cardStats.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span
                  className="block text-2xl leading-none font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {s.value}
                </span>
                <span className="mt-1.5 block text-xs text-fg-3">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5">
          <CardVisual spec={project.visual} />
        </div>

        <p className="mt-5 flex-1 text-[0.9375rem] leading-relaxed text-fg-2">{project.hook}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {project.stack.slice(0, 3).map((s) => (
            <li key={s}>
              <Chip>{s}</Chip>
            </li>
          ))}
          {project.stack.length > 3 && (
            <li>
              <Chip>+{project.stack.length - 3}</Chip>
            </li>
          )}
        </ul>

        <span
          className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
          style={{
            color: "var(--accent)",
            borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
          }}
        >
          Open case study
          <Arrow className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}
