import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Shared social card. Rendered with next/og rather than a designed image so a
 * new case study gets a correct card for free. Satori supports a narrow slice
 * of CSS — flexbox, plain gradients — so the layout here stays deliberately
 * blunt.
 */
export function ogCard({
  eyebrow,
  title,
  footer,
}: {
  eyebrow: string;
  title: string;
  footer: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 76px",
          backgroundColor: "#05060e",
          backgroundImage:
            "radial-gradient(900px 520px at 88% 18%, rgba(91,43,224,0.55) 0%, rgba(53,24,145,0.22) 42%, rgba(5,6,14,0) 72%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#6c8cff",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              width: 64,
              height: 3,
              marginTop: 28,
              backgroundColor: "#6c8cff",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 46 ? 62 : 76,
            fontWeight: 800,
            letterSpacing: -2.5,
            lineHeight: 1.05,
            color: "#f4f6fa",
            maxWidth: 960,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#939cad",
          }}
        >
          {footer}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
