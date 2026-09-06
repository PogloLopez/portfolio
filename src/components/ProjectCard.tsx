import Link from "next/link";
import type { Project } from "@/content/projects";
import { Arrow, Chip } from "@/components/ui";

/**
 * `featured` widens the card across both grid columns. It exists so the fifth
 * case study does not sit alone on a half-width row — and it lands on Cortana,
 * which is the intended closer of the sequence anyway.
 */
export function ProjectCard({
  project,
  index,
  featured = false,
}: {
  project: Project;
  index: number;
  featured?: boolean;
}) {
  return (
    <li className={featured ? "md:col-span-2" : undefined}>
      <Link
        href={`/projects/${project.slug}`}
        className={`group relative flex h-full overflow-hidden rounded-xl border border-line bg-surface/70 p-6 transition-colors hover:border-iris/45 sm:p-7 ${
          featured ? "flex-col gap-8 lg:flex-row lg:items-center lg:gap-14" : "flex-col"
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-glow/0 blur-3xl transition-colors duration-500 group-hover:bg-glow/25"
        />

        <div className={featured ? "lg:flex-1" : "contents"}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-mono text-xs text-fg-3">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-xs text-fg-3">{project.kicker}</span>
          </div>

          <h3 className="mt-5 text-xl font-semibold tracking-[-0.015em] text-fg">
            {project.title}
          </h3>

          <p className="mt-1.5 font-mono text-xs text-iris">{project.repo}</p>

          <p className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-fg-2">{project.hook}</p>
        </div>

        <div className={featured ? "lg:w-80 lg:shrink-0" : "contents"}>
          <ul className={`flex flex-wrap gap-2 ${featured ? "" : "mt-6"}`}>
            {project.stack.slice(0, featured ? 6 : 4).map((s) => (
              <li key={s}>
                <Chip>{s}</Chip>
              </li>
            ))}
            {project.stack.length > (featured ? 6 : 4) && (
              <li>
                <Chip>+{project.stack.length - (featured ? 6 : 4)}</Chip>
              </li>
            )}
          </ul>

          <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-fg-2 transition-colors group-hover:text-iris">
            Read the case study
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </li>
  );
}
