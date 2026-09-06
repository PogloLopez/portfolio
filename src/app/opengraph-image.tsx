import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { site } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${site.name} — ${site.role}`;

export default function Image() {
  return ogCard({
    eyebrow: "Data engineer · AI & automation",
    title: "Systems that run in production, not in notebooks.",
    footer: site.name,
  });
}
