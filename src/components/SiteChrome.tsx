import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { projects } from "@/content/projects";
import { CopyEmail, SectionLink } from "@/components/nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ground/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-md text-sm font-semibold text-fg"
          aria-label={`${site.shortName}, home`}
        >
          <Image
            src="/mark.png"
            alt=""
            width={28}
            height={28}
            priority
            className="h-7 w-7 transition-transform group-hover:scale-105"
          />
          <span className="hidden xs:inline">{site.shortName}</span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <SectionLink
            hash="work"
            className="rounded-md px-3 py-2 text-sm font-medium text-fg-2 transition-colors hover:bg-white/6 hover:text-fg"
          >
            Work
          </SectionLink>
          <Link
            href="/about"
            className="rounded-md px-3 py-2 text-sm font-medium text-fg-2 transition-colors hover:bg-white/6 hover:text-fg"
          >
            About
          </Link>
          <SectionLink
            hash="contact"
            className="inline-flex items-center gap-2 rounded-lg border border-iris/55 bg-iris/12 px-3 py-2 text-sm font-semibold text-iris transition-colors hover:border-iris hover:bg-iris/20"
          >
            Contact
          </SectionLink>
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
            <div className="flex items-center gap-2.5">
              <Image src="/mark.png" alt="" width={24} height={24} className="h-6 w-6" />
              <p className="text-sm font-semibold text-fg">{site.name}</p>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-3">{site.tagline}</p>
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
                    className="text-fg-2 underline-offset-4 transition-colors hover:text-iris hover:underline"
                  >
                    {p.title}
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
                <CopyEmail className="inline-flex items-center gap-2 text-fg-2 underline-offset-4 transition-colors hover:text-iris hover:underline" />
              </li>
              <li>
                <a
                  href={site.contact.linkedin}
                  className="text-fg-2 underline-offset-4 transition-colors hover:text-iris hover:underline"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href={site.contact.github}
                  className="text-fg-2 underline-offset-4 transition-colors hover:text-iris hover:underline"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={site.cv.en}
                  className="text-fg-2 underline-offset-4 transition-colors hover:text-iris hover:underline"
                >
                  CV (PDF)
                </a>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </footer>
  );
}
