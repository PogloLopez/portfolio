import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { projects, projectBySlug } from "@/content/projects";
import { site } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Case study";

// Only the five projects have a card; any other slug is a 404 rather than a
// generic image for a page that does not exist.
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  return ogCard({
    eyebrow: project?.kicker ?? "Case study",
    title: project?.title ?? "Case study",
    footer: site.shortName,
  });
}
