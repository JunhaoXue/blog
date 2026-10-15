export function ArticleCover({
  id,
  alt,
  variant = "hero",
  priority = false,
}: {
  id: string;
  alt: string;
  variant?: "hero" | "card" | "preview";
  priority?: boolean;
}) {
  return (
    <div className={`article-cover article-cover-${variant}`}>
      <img
        src={`/api/media/${id}`}
        alt={alt}
        width={1600}
        height={900}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
    </div>
  );
}
