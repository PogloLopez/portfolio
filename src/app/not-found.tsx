export default function NotFound() {
  return (
    <main style={{ textAlign: "center", padding: "0 16px" }}>
      <p style={{ margin: 0, fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b93a7" }}>
        404
      </p>
      <h1 style={{ margin: "8px 0 20px", fontSize: 28, color: "#f2f4f8" }}>This page doesn&rsquo;t exist.</h1>
      {/* A plain link: the target is a static page, not a Next route. */}
      <a href="/" style={{ color: "#8ea2ff" }}>
        Back to the portfolio
      </a>
    </main>
  );
}
