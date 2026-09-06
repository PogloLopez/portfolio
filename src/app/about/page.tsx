import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Eyebrow, SectionLabel } from "@/components/ui";
import { CopyEmail } from "@/components/nav";

export const metadata: Metadata = {
  title: "About",
  description: site.intro[0],
};

/**
 * The retail→energy mapping. The target reader works in energy and has to do
 * this translation in their head otherwise; doing it for them is the single
 * most useful thing this page can contain.
 */
const transfers: { from: string; to: string }[] = [
  {
    from: "Weekly forecast of thousands of product×store series with LightGBM and Dagster",
    to: "Multi-series load and demand forecasting at scale",
  },
  {
    from: "Ingesting a state statistics office's weekly bulletins with no API and a drifting format",
    to: "Ingesting regulated market data: system operators, grid operators, meters",
  },
  {
    from: "Medallion architecture on Delta Lake with per-layer assertions",
    to: "A data platform with quality layers and traceable lineage",
  },
  {
    from: "Expected versus actual price, with an automated written reading of each series",
    to: "Deviation of actual versus expected generation, with automated reporting",
  },
  {
    from: "Human-in-the-loop gates and adversarial review of my own AI guardrails",
    to: "Reliability judgment for systems with a model in the loop",
  },
  {
    from: "An audit that caught a silent production failure the job status could not show",
    to: "Operational monitoring that measures the outcome, not the pipeline's own opinion",
  },
];

const principles: { title: string; body: string }[] = [
  {
    title: "Controls live in code, not in habits",
    body: "A rule you have to remember is not a rule. When I need a guarantee I make it structural: one entry point with a test that fails if a second appears, a required CI gate instead of a reminder.",
  },
  {
    title: "Green checkmarks are not evidence",
    body: "The failures that last longest are the ones the reporting does not cover. The useful question is not whether the job succeeded but whether the output is still good, measured independently. That is what caught a silent production failure.",
  },
  {
    title: "Every dependency pays its own weight",
    body: "I run Dagster where orchestration earns it, and a hand-written scheduler where it does not. I built a graph retrieval layer, measured it against plain grep, and deleted it when it did not win. Sophistication that does not measure better is cost.",
  },
  {
    title: "Write down the trade-off",
    body: "Test coverage tracked as debt is a decision. The same gap undocumented is an oversight. Every case study here names what was given up and why.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute -top-48 -right-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-glow/18 blur-[130px]"
        />
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-20">
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-6 max-w-3xl text-3xl leading-[1.1] font-bold tracking-[-0.03em] text-fg sm:text-5xl">
            I build data systems for a retail chain, and I am the person who operates them
            afterwards.
          </h1>
          <div className="mt-9 grid max-w-4xl gap-5 text-base leading-relaxed text-fg-2 sm:text-[1.0625rem]">
            {site.intro.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionLabel>How I work</SectionLabel>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-fg-2">
          One year of professional experience, so I do not sell myself on years. These four habits
          are what the five case studies have in common, and the part I want to be pressed on.
        </p>
        <ul className="grid gap-8 md:grid-cols-2 lg:gap-x-14">
          {principles.map((p) => (
            <li key={p.title} className="relative pt-5">
              <span
                aria-hidden
                className="absolute top-0 left-0 h-px w-9 bg-linear-to-r from-iris to-transparent"
              />
              <h3 className="text-lg font-semibold tracking-[-0.015em] text-fg">{p.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line bg-surface/35">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <SectionLabel>What transfers to energy</SectionLabel>
          <p className="mb-10 max-w-2xl text-base leading-relaxed text-fg-2">
            The domain changes. Most of the engineering does not. Rather than ask a reader in that
            sector to do the translation, here it is.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line-strong py-3 pr-8 text-left font-semibold text-fg">
                    What I built in retail
                  </th>
                  <th className="border-b border-line-strong py-3 text-left font-semibold text-fg">
                    What it is called in energy
                  </th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((row) => (
                  <tr key={row.to}>
                    <td className="border-b border-line py-4 pr-8 align-top leading-relaxed text-fg-3">
                      {row.from}
                    </td>
                    <td className="border-b border-line py-4 align-top leading-relaxed text-fg-2">
                      {row.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-10 max-w-2xl text-base leading-relaxed text-fg-2">
            A forecast that has to be right every week teaches the same lessons whether the
            series is demand or load: inputs go stale, monitoring lies to you, and the interval
            matters more than the point estimate.
          </p>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20">
        <SectionLabel>Contact</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <CopyEmail className="inline-flex items-center gap-2 rounded-lg bg-iris px-5 py-2.5 text-sm font-semibold text-ground shadow-sm shadow-iris/25 transition-colors hover:bg-violet" />
          <a
            href={site.contact.linkedin}
            className="rounded-lg border border-line-strong px-5 py-2.5 text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
          >
            LinkedIn
          </a>
          <a
            href={site.contact.github}
            className="rounded-lg border border-line-strong px-5 py-2.5 text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
          >
            GitHub
          </a>
          <a
            href={site.cv.en}
            className="rounded-lg border border-line-strong px-5 py-2.5 text-sm font-medium text-fg-2 transition-colors hover:border-iris hover:text-fg"
          >
            CV (PDF)
          </a>
        </div>
        <p className="mt-6 font-mono text-xs text-fg-3">{site.contact.location}</p>
      </section>
    </>
  );
}
