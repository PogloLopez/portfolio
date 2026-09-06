import fs from "node:fs";
import path from "node:path";

export type TocEntry = { id: string; title: string };

/**
 * Slug rule copied from `rehype-slug`'s default for the shapes we actually
 * use: lower-cased, punctuation dropped, spaces to hyphens. Keeping the two in
 * step matters because the table of contents links to ids the MDX pipeline
 * generates, not to ids we render ourselves.
 */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

/** Reads the `##` headings straight out of the MDX source at build time. */
export function tocFor(slug: string): TocEntry[] {
  const file = path.join(process.cwd(), "src", "content", "projects", `${slug}.mdx`);
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/^## (.+)$/gm)].map((m) => ({
    title: m[1].trim(),
    id: slugify(m[1].trim()),
  }));
}
