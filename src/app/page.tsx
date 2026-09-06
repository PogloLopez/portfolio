import Image from "next/image";
import Link from "next/link";
import { headlineStats, site } from "@/lib/site";
import { projects } from "@/content/projects";
import { ProjectCard } from "@/components/ProjectCard";
import { Arrow, Eyebrow, SectionLabel, Stat } from "@/components/ui";

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------------
          Hero. The artwork is the same flow field used on the GitHub
          profile header and the LinkedIn banner, so someone arriving from
          either one lands on something they recognise.
      --------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src="/hero/flow-2400.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_center] opacity-70 sm:opacity-100"
          />
          <div className="absolute inset-0 bg-linear-to-r from-ground via-ground/92 to-ground/35 sm:via-ground/78 sm:to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-ground via-transparent to-ground/70" />
        </div>

        <div className="mx-auto max-w-6xl px-5 pt-20 pb-24 sm:px-8 sm:pt-28 sm:pb-32">
          <Eyebrow>{site.tagline}</Eyebrow>

          <h1 className="mt-6 text-[2.75rem] leading-[0.94] font-extrabold tracking-[-0.035em] text-fg uppercase sm:text-6xl lg:text-7xl">
            <span className="block">Data engineer</span>
            <span className="block">AI &amp; automation</span>
          </h1>

          <p className="mt-7 text-lg font-medium text-fg-2 sm:text-xl">{site.name}</p>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-2 sm:text-lg">
            {site.oneLiner}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="#work"
              className="inline-flex items-center gap-2 rounded-lg bg-fg px-5 py-2.5 text-sm font-semibold text-ground transition-opacity hover:opacity-90"
            >
              See the work
              <Arrow />
            </Link>
            <a
              href={`mailto:${site.contact.email}`}
              className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-5 py-2.5 text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
            >
              {site.contact.email}
            </a>
          </div>

          <p className="mt-8 font-mono text-xs text-fg-3">{site.contact.location}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          Headline figures. Four stat tiles and no chart: these are single
          values with no series behind them, and a chart of one number is
          just a number with extra ink.
      --------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {headlineStats.map((s) => (
            <li key={s.label}>
              <Stat value={s.value} label={s.label} size="lg" />
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-4 sm:px-8" id="work">
        <SectionLabel>Selected work</SectionLabel>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-fg-2">
          Five systems I designed, built and operate. Four run at Mercaldas, a retail grocery
          chain in Colombia where I am the only person who writes code; the fifth is my own
          infrastructure. Each one below is a full case study — the problem, the architecture
          decisions and what they cost, and the most interesting thing that went wrong.
        </p>
        <ul className="grid gap-5 md:grid-cols-2">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={i}
              featured={i === projects.length - 1 && projects.length % 2 === 1}
            />
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
        <SectionLabel>About</SectionLabel>
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-5 text-base leading-relaxed text-fg-2">
            <p>{site.intro[0]}</p>
            <p>{site.intro[2]}</p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-sm font-medium text-iris transition-colors hover:text-violet"
            >
              The longer version
              <Arrow />
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-surface/70 p-6 sm:p-7">
            <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
              Get in touch
            </p>
            <ul className="mt-5 space-y-3.5 text-sm">
              <li>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="flex items-center justify-between gap-3 text-fg-2 transition-colors hover:text-iris"
                >
                  <span className="font-mono text-xs text-fg-3">email</span>
                  <span>{site.contact.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={site.contact.linkedin}
                  className="flex items-center justify-between gap-3 text-fg-2 transition-colors hover:text-iris"
                >
                  <span className="font-mono text-xs text-fg-3">linkedin</span>
                  <span>pablo-a-lopez-s</span>
                </a>
              </li>
              <li>
                <a
                  href={site.contact.github}
                  className="flex items-center justify-between gap-3 text-fg-2 transition-colors hover:text-iris"
                >
                  <span className="font-mono text-xs text-fg-3">github</span>
                  <span>PogloLopez</span>
                </a>
              </li>
              <li>
                <a
                  href={site.cv.en}
                  className="flex items-center justify-between gap-3 text-fg-2 transition-colors hover:text-iris"
                >
                  <span className="font-mono text-xs text-fg-3">cv · en</span>
                  <span>English (PDF)</span>
                </a>
              </li>
              <li>
                <a
                  href={site.cv.es}
                  className="flex items-center justify-between gap-3 text-fg-2 transition-colors hover:text-iris"
                >
                  <span className="font-mono text-xs text-fg-3">cv · es</span>
                  <span>Español (PDF)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
