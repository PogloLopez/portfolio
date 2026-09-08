import Image from "next/image";
import Link from "next/link";
import { headlineStats, site } from "@/lib/site";
import { projects } from "@/content/projects";
import { ProjectCard } from "@/components/ProjectCard";
import { CopyEmail, SectionLink } from "@/components/nav";
import { Arrow, Eyebrow, SectionLabel, Stat } from "@/components/ui";

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------------
          Hero. The artwork is the same flow field used on the GitHub
          profile header and the LinkedIn banner, so someone arriving from
          either one lands on something they recognise.
      --------------------------------------------------------------- */}
      {/*
          The hero is deliberately NOT opaque: the living neural field sits in
          the fixed background layer and has to read through here, so the
          static artwork is a texture over it rather than a lid on top of it.
          The left gradient still buys the headline its contrast.
      */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src="/hero/flow-2400.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[72%_center] opacity-35 mix-blend-screen sm:opacity-55"
          />
          <div className="absolute inset-0 bg-linear-to-r from-ground via-ground/90 to-transparent sm:via-ground/55" />
        </div>

        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
          <Eyebrow>{site.tagline}</Eyebrow>

          <h1 className="mt-6 text-[2.25rem] leading-[0.95] font-extrabold tracking-[-0.035em] uppercase sm:text-6xl lg:text-7xl">
            <span className="block text-fg">Data engineer</span>
            <span className="text-gradient block">AI &amp; automation</span>
          </h1>

          <p className="mt-6 text-base font-medium text-fg-2 sm:text-xl">{site.name}</p>

          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-fg-2 sm:text-lg">
            {site.oneLiner}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SectionLink
              hash="work"
              className="inline-flex items-center gap-2 rounded-lg bg-fg px-5 py-3 text-sm font-semibold text-ground transition-opacity hover:opacity-90"
            >
              See the work
              <Arrow />
            </SectionLink>
            <CopyEmail className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface/70 px-5 py-3 text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg" />
          </div>

          <p className="mt-8 font-mono text-xs text-fg-3">{site.contact.location}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------
          Headline figures. Stat tiles and no chart: these are single
          values with no series behind them, and a chart of one number is
          a number with extra ink.
      --------------------------------------------------------------- */}
      <section className="border-b border-line bg-surface/30">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
          <ul className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-10">
            {headlineStats.map((s, i) => (
              <li key={s.label} data-accent={`a${i + 1}`}>
                <Stat value={s.value} label={s.label} size="lg" accent />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------------- */}
      <section
        className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-16 pb-4 sm:px-8 sm:pt-20"
        id="work"
      >
        <SectionLabel>Selected work</SectionLabel>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-fg-2">
          Five systems I designed, built and operate. Four run at Mercaldas, a retail grocery
          chain in Colombia. The fifth is my own infrastructure. Every one has a working demo
          you can click.
        </p>
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} index={i} />
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
        <SectionLabel>About</SectionLabel>
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4 text-base leading-relaxed text-fg-2">
            <p>{site.intro[0]}</p>
            <p>{site.intro[2]}</p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 pt-1 text-sm font-semibold text-iris underline-offset-4 transition-colors hover:text-violet hover:underline"
            >
              More about how I work
              <Arrow />
            </Link>
          </div>

          <div
            id="contact"
            className="scroll-mt-24 rounded-xl border border-line-strong bg-surface/80 p-6 sm:p-7"
          >
            <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
              Get in touch
            </p>
            <div className="mt-5 space-y-2.5">
              <CopyEmail
                className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
                style={{ background: "var(--color-a1)", color: "var(--color-ground)" }}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={site.contact.linkedin}
                  className="rounded-lg border border-line-strong px-4 py-2.5 text-center text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
                >
                  LinkedIn
                </a>
                <a
                  href={site.contact.github}
                  className="rounded-lg border border-line-strong px-4 py-2.5 text-center text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
                >
                  GitHub
                </a>
                <a
                  href={site.cv.en}
                  className="rounded-lg border border-line-strong px-4 py-2.5 text-center text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
                >
                  CV English
                </a>
                <a
                  href={site.cv.es}
                  className="rounded-lg border border-line-strong px-4 py-2.5 text-center text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
                >
                  CV Español
                </a>
              </div>
            </div>
            <p className="mt-5 font-mono text-xs text-fg-3">{site.contact.location}</p>
          </div>
        </div>
      </section>
    </>
  );
}
