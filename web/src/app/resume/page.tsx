import type { Metadata } from "next";
import { getResume } from "@/lib/resume";
import { site } from "@/lib/site";
import { ResumeView } from "@/components/resume-view";

export const dynamic = "force-dynamic";
export function generateMetadata(): Metadata {
  const resume = getResume();
  return {
    title: "关于我",
    description: resume.published
      ? resume.summary || `${resume.name}的个人履历。`
      : "关于我的个人介绍与履历。",
    alternates: { canonical: `${site.url}/resume` },
    robots: { index: resume.published, follow: true },
  };
}
export default function ResumePage() {
  const resume = getResume();
  return (
    <div className="reading-shell">
      {resume.published ? (
        <ResumeView resume={resume} />
      ) : (
        <div className="page-heading">
          <h1>关于我</h1>
          <p>个人资料尚未发布。</p>
        </div>
      )}
    </div>
  );
}
