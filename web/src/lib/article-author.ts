import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import type { Root } from "hast";
import type { Resume } from "./resume";
import { resumeEmployment } from "./resume-layout";
import { site } from "./site";

export function articleAuthor(resume: Resume) {
  // A withdrawn resume must not expose its private name, photo or employment
  // through another public page or its metadata.
  if (!resume.published)
    return {
      name: site.name,
      photoId: null,
      current: "",
      previous: "",
      url: "/resume",
    };
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
  const tree = processor.runSync(processor.parse(resume.content)) as Root;
  const work = resumeEmployment(tree);
  const ongoing = /(?:至今|现在|present|current)\s*$/iu;
  return {
    name: resume.name || site.name,
    photoId: resume.photoId,
    current: work.find((entry) => ongoing.test(entry.date))?.title || "",
    previous: work.find((entry) => !ongoing.test(entry.date))?.title || "",
    url: "/resume",
  };
}
