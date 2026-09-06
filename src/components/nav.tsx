"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";

/**
 * A link to a section of the home page.
 *
 * Smooth scrolling is done here rather than with `scroll-behavior: smooth` on
 * `html`, because that global rule also animates the scroll-to-top that Next
 * performs on every page navigation, which reads as the page lurching before it
 * moves. Scoping the animation to actual hash links removes that.
 */
export function SectionLink({
  hash,
  children,
  className = "",
}: {
  hash: string;
  children: React.ReactNode;
  className?: string;
}) {
  const go = useCallback(
    (e: React.MouseEvent) => {
      // Scroll whenever the target is on the page being viewed, whichever page
      // that is. Otherwise fall through and let the router navigate to it.
      const el = document.getElementById(hash);
      if (!el) return;
      e.preventDefault();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", `#${hash}`);
    },
    [hash],
  );

  return (
    <Link href={`/#${hash}`} onClick={go} className={className}>
      {children}
    </Link>
  );
}

/**
 * Copies the address instead of opening a mail client. A `mailto:` does nothing
 * at all on a machine with no mail client configured, which is most laptops a
 * recruiter opens this on.
 */
export function CopyEmail({
  className = "",
  children,
  label = site.contact.email,
}: {
  className?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.contact.email);
    } catch {
      // Clipboard can be blocked; fall back to the old reliable path.
      const ta = document.createElement("textarea");
      ta.value = site.contact.email;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        window.location.href = `mailto:${site.contact.email}`;
        document.body.removeChild(ta);
        return;
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {children ?? (
        <>
          <CopyGlyph copied={copied} />
          {copied ? "Copied to clipboard" : label}
        </>
      )}
    </button>
  );
}

export function CopyGlyph({ copied }: { copied: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {copied ? (
        <path d="M3 8.5 6.5 12 13 4.5" />
      ) : (
        <>
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 3.5a1.5 1.5 0 0 0-1.5-1h-5a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 1 1.4" />
        </>
      )}
    </svg>
  );
}
