import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/content";
import { site } from "@/lib/site";
import { getResume } from "@/lib/resume";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const resume = getResume();
  return [
    "",
    "/archive",
    "/about",
    "/links",
    ...(resume.published ? ["/resume"] : []),
  ]
    .map((route) => ({ url: `${site.url}${route}` }))
    .concat(
      getPosts()
        .filter((p) => !p.demo)
        .map((p) => ({
          url: `${site.url}/posts/${p.slug}`,
          lastModified: p.updatedAt,
        })),
    );
}
