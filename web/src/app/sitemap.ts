import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/content";
import { site } from "@/lib/site";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/archive", "/about", "/links"]
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
