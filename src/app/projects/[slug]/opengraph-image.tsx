import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { projects, projectBySlug } from "@/content/projects";
import { site } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Case study";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  return ogCard({
    eyebrow: project?.repo ?? "Case study",
    title: project?.title ?? "Case study",
    footer: `${site.shortName} · ${project?.kicker ?? ""}`,
  });
}
