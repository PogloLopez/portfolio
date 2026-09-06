import type { Metadata } from "next";
import { site } from "@/lib/site";
import { Eyebrow, SectionLabel } from "@/components/ui";

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
    from: "Ingesting a state statistics office's weekly bulletins — no API, drifting format",
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
    title: "Put the control where it is enforceable",
    body: "A rule you have to remember is not a rule. A denylist over a shell is theatre. When I need a guarantee I make it structural — one entry point with a test that fails if a second appears, a required CI gate instead of a habit — because that is the kind of control that is still true in six months.",
  },
  {
    title: "Audit your own systems before something else does",
    body: "Green checkmarks are not evidence. The failures that last longest are the ones the reporting does not cover, so the useful question is not 'did the job succeed' but 'is the output still good', measured independently. That habit is what caught the horizon degradation in the forecast pipeline.",
  },
  {
    title: "Every dependency pays its own operational weight",
    body: "I run Dagster where the orchestration earns it and a hand-written scheduler where it does not. I built a graph retrieval layer for my own knowledge base, measured it head to head against grep, and deleted it when it did not win. Sophistication that does not measure better is cost.",
  },
  {
    title: "Write down the trade-off, not just the decision",
    body: "Missing test coverage that is tracked as debt is a decision. The same gap undocumented is an oversight, and the difference is entirely whether the next person can see the reasoning. Every case study on this site names what was given up and why.",
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
            The only person writing code at a retail chain — which is a good way to learn and a
            bad way to stay.
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
          I have one year of professional experience, so I do not sell myself on years. These four
          habits are what the five case studies actually have in common, and they are the part I
          would want a technical interviewer to press on.
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
            What I want next is energy access and distributed generation data. The domain changes;
            most of the engineering does not. Rather than ask a reader in that sector to do the
            translation, here it is.
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
            The thing I am explicitly looking for is a team with senior engineers to be measured
            against. Being the person who knows the most about data in the room is a fine place to
            be for a year and a poor place to calibrate judgment for a career — I would rather
            have my work corrected by people who are better at it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionLabel>Contact</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:${site.contact.email}`}
            className="rounded-lg bg-fg px-5 py-2.5 text-sm font-semibold text-ground transition-opacity hover:opacity-90"
          >
            {site.contact.email}
          </a>
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
