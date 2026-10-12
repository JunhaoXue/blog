import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Resume } from "@/lib/resume";
import { resumeLayoutPlugin } from "@/lib/resume-layout";

export function ResumeView({ resume }: { resume: Resume }) {
  return (
    <>
      <header className="resume-profile">
        {resume.photoId && (
          <img
            className="resume-photo"
            src={`/api/media/${resume.photoId}`}
            alt={`${resume.name}的照片`}
            width={80}
            height={80}
          />
        )}
        <div className="resume-intro">
          <h1>{resume.name}</h1>
          {resume.headline && (
            <p className="resume-headline">{resume.headline}</p>
          )}
          {resume.summary && (
            <p className="muted resume-summary">{resume.summary}</p>
          )}
        </div>
      </header>
      <article className="prose resume-content" aria-label="履历">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[resumeLayoutPlugin]}
        >
          {resume.content}
        </ReactMarkdown>
      </article>
    </>
  );
}
