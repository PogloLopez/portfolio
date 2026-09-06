import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects, projectBySlug } from "@/content/projects";
import { tocFor } from "@/lib/toc";
import { Arrow, ChipRow, Eyebrow, SectionLabel, Stat } from "@/components/ui";
import { DemoSlot } from "@/components/demos/DemoSlot";
import { hasDemo } from "@/components/demos/registry";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.oneLiner,
    openGraph: { title: project.title, description: project.oneLiner },
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();

  const { default: DeepDive } = await import(`@/content/projects/${slug}.mdx`);
  const toc = tocFor(slug);

  const index = projects.findIndex((p) => p.slug === slug);
  const next = projects[(index + 1) % projects.length];

  return (
    <article>
      {/* ------------------------------------------------------------- */}
      <header className="relative isolate overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute -top-40 -right-32 -z-10 h-[26rem] w-[26rem] rounded-full bg-glow/20 blur-[120px]"
        />
        <div className="mx-auto max-w-6xl px-5 pt-10 pb-12 sm:px-8 sm:pt-14 sm:pb-14">
          <Link
            href="/#work"
            className="inline-flex items-center gap-2 rounded-md font-mono text-xs text-fg-3 transition-colors hover:text-iris"
          >
            <Arrow className="rotate-180" />
            All work
          </Link>

          <div className="mt-7">
            <Eyebrow>{project.kicker}</Eyebrow>
            <h1 className="mt-4 max-w-3xl text-[2rem] leading-[1.06] font-bold tracking-[-0.03em] text-fg sm:text-5xl">
              {project.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-2 sm:text-lg">
              {project.oneLiner}
            </p>
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
            <div>
              <dt className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
                Repo
              </dt>
              <dd className="mt-2 font-mono text-sm text-iris">{project.repo}</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
                Context
              </dt>
              <dd className="mt-2 text-sm text-fg-2">{project.org}</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
                Role
              </dt>
              <dd className="mt-2 text-sm text-fg-2">{project.role}</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
                Status
              </dt>
              <dd className="mt-2 text-sm text-fg-2">{project.duration}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* -------------------------------------------------------------
          Layer 1: the summary. Everything a hiring manager needs before
          deciding whether the deep dive below is worth their time.
      ------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div>
            <SectionLabel>The problem</SectionLabel>
            <p className="text-base leading-relaxed text-fg-2 sm:text-[1.0625rem]">
              {project.problem}
            </p>

            <div className="mt-9">
              <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
                Stack
              </p>
              <div className="mt-4">
                <ChipRow items={project.stack} />
              </div>
            </div>
          </div>

          <div>
            <SectionLabel>What it does</SectionLabel>
            <ul className="grid gap-8 sm:grid-cols-2">
              {project.achievements.map((a) => (
                <li key={a.value}>
                  <Stat value={a.value} label={a.label} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          The demo, between the summary and the deep dive: after the
          reader is interested, before they commit to a long read.
      ------------------------------------------------------------- */}
      {hasDemo(slug) && (
        <section className="border-y border-iris/25 bg-iris/[0.04]">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-2xl font-bold tracking-[-0.02em] text-fg">Try it yourself</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-iris/50 bg-iris/12 px-3 py-1 font-mono text-[0.6875rem] tracking-[0.08em] text-iris uppercase">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-iris" />
                Interactive
              </span>
            </div>
            <DemoSlot slug={slug} />
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------
          Layer 2: the technical deep dive. Rendered inline rather than
          collapsed behind a toggle, because it is the part worth reading.
          The index rail stays narrow so the architecture diagrams keep
          the width they need.
      ------------------------------------------------------------- */}
      <div className="border-b border-line bg-surface/35">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-12">
            <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
              <p className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-3 uppercase">
                Deep dive
              </p>
              <ul className="mt-4 space-y-2 border-l border-line pl-3 text-[0.8125rem]">
                {toc.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      className="block leading-snug text-fg-3 transition-colors hover:text-iris"
                    >
                      {entry.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="prose min-w-0 max-w-[70ch]">
              <DeepDive />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionLabel>Technical metrics</SectionLabel>
        <ul className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          {project.technical.map((t) => (
            <li key={t.value + t.label}>
              <Stat value={t.value} label={t.label} />
            </li>
          ))}
        </ul>

        {project.confidential && (
          <p className="mt-10 max-w-2xl border-l-2 border-glow pl-4 text-sm leading-relaxed text-fg-3">
            Mercaldas is named as the employer, but business figures on this page are published as
            ranges, orders of magnitude or relative percentages. Exact revenue, margin and volume
            figures, source code and screenshots of real operating data are not published.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      <nav className="mx-auto max-w-6xl px-5 pb-8 sm:px-8" aria-label="Next case study">
        <Link
          href={`/projects/${next.slug}`}
          className="group flex flex-col gap-4 rounded-xl border border-line-strong bg-surface/80 p-6 transition-colors hover:border-iris/60 sm:flex-row sm:items-center sm:justify-between sm:p-7"
        >
          <span>
            <span className="font-mono text-xs text-fg-3">Next case study</span>
            <span className="mt-1.5 block text-lg font-semibold text-fg">{next.title}</span>
          </span>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-iris/55 bg-iris/12 px-4 py-2 text-sm font-semibold text-iris transition-colors group-hover:border-iris group-hover:bg-iris group-hover:text-ground">
            Read
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </nav>
    </article>
  );
}
