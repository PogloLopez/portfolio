import Link from "next/link";
import { site } from "@/lib/site";
import { projects } from "@/content/projects";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ground/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-sm font-semibold text-fg"
          aria-label={`${site.shortName} — home`}
        >
          <span
            aria-hidden
            className="h-2 w-2 rounded-[2px] bg-iris transition-colors group-hover:bg-violet"
          />
          {site.shortName}
        </Link>
        <nav className="flex items-center gap-5 text-sm text-fg-3 sm:gap-7">
          <Link href="/#work" className="transition-colors hover:text-fg">
            Work
          </Link>
          <Link href="/about" className="transition-colors hover:text-fg">
            About
          </Link>
          <a
            href={`mailto:${site.contact.email}`}
            className="hidden transition-colors hover:text-fg xs:inline"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-sm font-semibold text-fg">{site.name}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-fg-3">{site.tagline}</p>
            <p className="mt-4 font-mono text-xs text-fg-3">{site.contact.location}</p>
          </div>

          <nav aria-label="Case studies">
            <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
              Case studies
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/projects/${p.slug}`}
                    className="text-fg-2 transition-colors hover:text-iris"
                  >
                    {p.repo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Elsewhere">
            <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-fg-3 uppercase">
              Elsewhere
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="text-fg-2 transition-colors hover:text-iris"
                >
                  {site.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={site.contact.linkedin}
                  className="text-fg-2 transition-colors hover:text-iris"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={site.contact.github} className="text-fg-2 transition-colors hover:text-iris">
                  GitHub
                </a>
              </li>
              <li>
                <a href={site.cv.en} className="text-fg-2 transition-colors hover:text-iris">
                  CV (PDF)
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-12 font-mono text-xs text-fg-3">
          Built with Next.js. Business figures from employer projects are published as ranges.
        </p>
      </div>
    </footer>
  );
}
